import type { APIRoute } from 'astro';
import { errorJson, json } from '../../lib/api';
import { CheckoutError, priceCheckout, type CheckoutPayload } from '../../lib/checkout';
import { createOrder } from '../../lib/d1';
import { createMpPreference, isMockMpToken } from '../../lib/mp';

/** Rate limit en memoria por isolate: 10 pedidos / 60 s por IP. */
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) return errorJson('Demasiados pedidos seguidos. Esperá un minuto.', 429);

  let payload: CheckoutPayload;
  try {
    payload = await request.json();
  } catch {
    return errorJson('Body inválido', 400);
  }

  const env = locals.runtime.env;
  let priced;
  try {
    priced = await priceCheckout(env.DB, payload, new Date().toISOString());
  } catch (e) {
    if (e instanceof CheckoutError) return errorJson(e.message, e.status);
    console.error('[checkout] pricing error:', e);
    return errorJson('No pudimos procesar tu pedido. Probá de nuevo.', 500);
  }

  const orderId = crypto.randomUUID();
  const mpToken = env.MP_ACCESS_TOKEN ?? '';
  let mpReference: string | null = null;
  let redirect = `/pedido/${orderId}`;

  // ------------------------------------------------------------
  // MercadoPago: la preferencia se crea ANTES de la order para no
  // dejar pedidos huérfanos si la API externa falla.
  // ------------------------------------------------------------
  if (payload.paymentMethod === 'mercadopago' && !isMockMpToken(mpToken)) {
    try {
      const origin = new URL(request.url).origin;
      const preference = await createMpPreference(mpToken, {
        orderId,
        origin,
        customerEmail: priced.order.customer_email,
        items: priced.items.map((item) => ({
          title: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
        })),
      });
      mpReference = preference.preferenceId;
      redirect = preference.initPoint;
    } catch (e) {
      console.error('[checkout] MercadoPago preference error:', e);
      return errorJson('No pudimos iniciar el pago con MercadoPago. Probá con transferencia o efectivo.', 502);
    }
  } else if (payload.paymentMethod === 'mercadopago') {
    // Modo desarrollo (sin token real): pago simulado.
    redirect = `/pedido/${orderId}?mp=mock`;
  }

  try {
    await createOrder(
      env.DB,
      {
        id: orderId,
        ...priced.order,
        payment_status: 'pending',
        status: 'new',
        mp_preference_id: mpReference,
      },
      priced.items
    );
  } catch (e) {
    console.error('[checkout] createOrder error:', e);
    return errorJson('No pudimos registrar tu pedido. Probá de nuevo.', 500);
  }

  return json({ orderId, redirect });
};
