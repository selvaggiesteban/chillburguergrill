import type { OrderItemInput } from './d1';
import { formatPrice } from './utils';

/**
 * Notificaciones de pedidos por email (Cloudflare Email Service, binding `EMAIL`).
 * Se dispara con ctx.waitUntil desde /api/checkout: nunca bloquea ni rompe el
 * pedido — todo fallo se loguea y se ignora.
 */

export type OrderForEmail = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfillment: 'delivery' | 'pickup';
  address: string | null;
  zone: string | null;
  delivery_cost: number;
  subtotal: number;
  total: number;
  payment_method: 'mercadopago' | 'transfer' | 'cash';
  notes?: string | null;
};

type EmailMessageLike = {
  to: string;
  from: string | { email: string; name?: string };
  subject: string;
  html?: string;
  text?: string;
};

type EmailBindingLike = {
  send(message: EmailMessageLike): Promise<unknown>;
};

export type NotifyEnv = {
  DB: D1Database;
  EMAIL?: EmailBindingLike | undefined;
  EMAIL_API_TOKEN?: string | undefined;
};

const FROM = { email: 'pedidos@chillburguergrill.com', name: 'Chill Burger Grill' };
const CF_ACCOUNT_ID = '793d012a405417ee4382f1ef1869753e';

const PAYMENT_LABELS: Record<OrderForEmail['payment_method'], string> = {
  mercadopago: 'MercadoPago',
  transfer: 'Transferencia',
  cash: 'Efectivo',
};

const SITE = 'https://chillburgergrill.pages.dev';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortRef(orderId: string): string {
  return `#${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Pages no soporta el binding `send_email`, así que el transporte por defecto
 * es la REST API del Email Service con un token secreto (EMAIL_API_TOKEN).
 * Si existe el binding (dev/Worker) se usa directo.
 */
function deliver(
  env: NotifyEnv,
  msg: { to: string; subject: string; html: string; text: string }
): Promise<unknown> {
  if (env.EMAIL) return env.EMAIL.send({ to: msg.to, from: FROM, subject: msg.subject, html: msg.html, text: msg.text });
  if (env.EMAIL_API_TOKEN) {
    return fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/email/sending/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: msg.to,
        from: FROM.email,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Email REST ${res.status} ${(await res.text()).slice(0, 300)}`);
      return res.json();
    });
  }
  return Promise.reject(new Error('sin transporte de email (binding EMAIL ni EMAIL_API_TOKEN)'));
}

async function staffRecipients(db: D1Database): Promise<string[]> {
  try {
    const { results } = await db
      .prepare(
        `SELECT DISTINCT a.email AS email
           FROM admins a
           JOIN admin_roles ar ON ar.admin_id = a.id
          WHERE ar.role IN ('administrador', 'gestor de la tienda')`
      )
      .all<{ email: string }>();
    const emails = (results ?? [])
      .map((r) => (r.email ?? '').trim())
      .filter(looksLikeEmail);
    return [...new Set(emails)];
  } catch (e) {
    console.error('[notify] staffRecipients error:', e);
    return [];
  }
}

type OrderLine = { qty: number; name: string; extras: string; price: number };

function orderLines(items: OrderItemInput[]): OrderLine[] {
  return items.map((item) => {
    let extras = '';
    try {
      const parsed: unknown = item.extras_json ? JSON.parse(item.extras_json) : [];
      if (Array.isArray(parsed)) {
        extras = parsed
          .map((e) => (typeof e === 'string' ? e : (e as { name?: string }).name ?? ''))
          .filter(Boolean)
          .join(' · ');
      }
    } catch {
      extras = '';
    }
    return { qty: item.quantity, name: item.product_name, extras, price: item.subtotal };
  });
}

function orderText(order: OrderForEmail, items: OrderItemInput[]): string {
  const lines = orderLines(items);
  const entrega =
    order.fulfillment === 'delivery'
      ? `Delivery${order.zone ? ` (${order.zone})` : ''}${order.address ? ` — ${order.address}` : ''}`
      : 'Retiro en local';
  const rows = lines.map((l) => `${l.qty}× ${l.name}${l.extras ? ` [+ ${l.extras}]` : ''} — ${formatPrice(l.price)}`);
  return [
    `Pedido ${shortRef(order.id)}`,
    `Cliente: ${order.customer_name} — ${order.customer_phone}`,
    `Entrega: ${entrega}`,
    `Pago: ${PAYMENT_LABELS[order.payment_method]}`,
    '',
    ...rows,
    '',
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `Envío: ${order.delivery_cost > 0 ? formatPrice(order.delivery_cost) : 'sin costo'}`,
    `Total: ${formatPrice(order.total)}`,
    order.notes ? `Notas: ${order.notes}` : '',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

function orderHtml(order: OrderForEmail, items: OrderItemInput[], link: { href: string; label: string }): string {
  const lines = orderLines(items);
  const entrega =
    order.fulfillment === 'delivery'
      ? `Delivery${order.zone ? ` (${escapeHtml(order.zone)})` : ''}${order.address ? ` — ${escapeHtml(order.address)}` : ''}`
      : 'Retiro en local';
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;">${l.qty}× ${escapeHtml(l.name)}${
          l.extras ? `<br><span style="color:#666;font-size:12px;">+ ${escapeHtml(l.extras)}</span>` : ''
        }</td><td style="padding:6px 0;text-align:right;">${formatPrice(l.price)}</td></tr>`
    )
    .join('');
  return `
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
    <h1 style="font-size:20px;margin:0 0 4px;">Chill Burger Grill</h1>
    <p style="margin:0 0 16px;color:#52525b;">Pedido <strong>${shortRef(order.id)}</strong></p>
    <p style="margin:0 0 4px;"><strong>Cliente:</strong> ${escapeHtml(order.customer_name)} — ${escapeHtml(order.customer_phone)}</p>
    <p style="margin:0 0 4px;"><strong>Entrega:</strong> ${entrega}</p>
    <p style="margin:0 0 16px;"><strong>Pago:</strong> ${PAYMENT_LABELS[order.payment_method]}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}
      <tr><td style="padding:6px 0;color:#52525b;">Subtotal</td><td style="padding:6px 0;text-align:right;">${formatPrice(order.subtotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#52525b;">Envío</td><td style="padding:6px 0;text-align:right;">${order.delivery_cost > 0 ? formatPrice(order.delivery_cost) : 'sin costo'}</td></tr>
      <tr><td style="padding:10px 0;border-top:1px solid #e4e4e7;font-weight:bold;">Total</td><td style="padding:10px 0;border-top:1px solid #e4e4e7;text-align:right;font-weight:bold;">${formatPrice(order.total)}</td></tr>
    </table>
    ${order.notes ? `<p style="margin:16px 0 0;font-size:13px;color:#52525b;"><strong>Notas:</strong> ${escapeHtml(order.notes)}</p>` : ''}
    <p style="margin:20px 0 0;">
      <a href="${link.href}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">${link.label}</a>
    </p>
  </div>
</body>`;
}

/**
 * Envía los emails de un pedido recién creado: al staff (admins con rol
 * administrador / gestor de la tienda) y al cliente si dejó email.
 */
export async function notifyOrderCreated(
  env: NotifyEnv,
  order: OrderForEmail,
  items: OrderItemInput[]
): Promise<void> {
  if (!env.EMAIL && !env.EMAIL_API_TOKEN) {
    console.warn('[notify] sin transporte de email — email de pedido omitido', { order: order.id });
    return;
  }

  const ref = shortRef(order.id);
  const sends: Promise<unknown>[] = [];

  const staff = await staffRecipients(env.DB);
  if (staff.length > 0) {
    const subject = `Nuevo pedido ${ref} — ${formatPrice(order.total)}`;
    const html = orderHtml(order, items, {
      href: `${SITE}/admin/pedidos/${order.id}`,
      label: 'Ver en el panel',
    });
    const text = `${orderText(order, items)}\nVer en el panel: ${SITE}/admin/pedidos/${order.id}`;
    for (const to of staff) {
      sends.push(deliver(env, { to, subject, html, text }));
    }
  }

  const customerEmail = (order.customer_email ?? '').trim();
  if (looksLikeEmail(customerEmail)) {
    const subject = `Recibimos tu pedido ${ref} — Chill Burger Grill`;
    const html = orderHtml(order, items, {
      href: `${SITE}/pedido/${order.id}`,
      label: 'Ver tu pedido',
    });
    const text = `${orderText(order, items)}\nVer tu pedido: ${SITE}/pedido/${order.id}`;
    sends.push(deliver(env, { to: customerEmail, subject, html, text }));
  }

  if (sends.length === 0) {
    console.warn('[notify] sin destinatarios para el pedido', { order: order.id });
    return;
  }

  const results = await Promise.allSettled(sends);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[notify] email error:', r.reason);
  }
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[notify] pedidos ${ref}: ${ok}/${results.length} emails enviados`);
}
