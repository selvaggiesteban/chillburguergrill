/**
 * Checkout server-side: valida el payload del cliente y recalcula TODOS los
 * precios desde D1 (nunca se confía en los montos que manda el navegador).
 */
import {
  getProductsByIds,
  getExtrasByIds,
  getActivePromotions,
  bestPromoFor,
  getConfig,
  type DeliveryConfig,
  type OrderInput,
  type OrderItemInput,
  type PaymentMethod,
} from './d1';

export type CheckoutCartItem = {
  productId: number;
  quantity: number;
  extrasIds: number[];
};

export type CheckoutPayload = {
  customer: { name: string; phone: string; email?: string };
  fulfillment: 'delivery' | 'pickup';
  address?: string;
  zone?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: CheckoutCartItem[];
};

export type { DeliveryConfig };

export type PricedCheckout = {
  order: Omit<OrderInput, 'id' | 'payment_status' | 'status'>;
  items: OrderItemInput[];
};

export class CheckoutError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_ITEMS = 50;
const MAX_QTY = 99;

function requireString(value: unknown, field: string, min: number, max: number): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (s.length < min || s.length > max) {
    throw new CheckoutError(`Campo inválido: ${field}`);
  }
  return s;
}

export async function priceCheckout(
  db: D1Database,
  payload: CheckoutPayload,
  nowIso: string
): Promise<PricedCheckout> {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new CheckoutError('El carrito está vacío');
  }
  if (payload.items.length > MAX_ITEMS) {
    throw new CheckoutError('Demasiados productos en el pedido');
  }

  const name = requireString(payload.customer?.name, 'nombre', 2, 100);
  const phone = requireString(payload.customer?.phone, 'teléfono', 5, 30);
  const emailRaw = typeof payload.customer?.email === 'string' ? payload.customer.email.trim() : '';
  if (emailRaw.length > 120 || (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw))) {
    throw new CheckoutError('Campo inválido: email');
  }

  const fulfillment = payload.fulfillment;
  if (fulfillment !== 'delivery' && fulfillment !== 'pickup') {
    throw new CheckoutError('Método de entrega inválido');
  }
  if (!['mercadopago', 'transfer', 'cash'].includes(payload.paymentMethod)) {
    throw new CheckoutError('Método de pago inválido');
  }
  const notes = typeof payload.notes === 'string' ? payload.notes.trim().slice(0, 500) : null;

  let address: string | null = null;
  let zone: string | null = null;
  let deliveryCost = 0;
  let subtotal = 0;

  // ------------------------------------------------------------
  // Pricing
  // ------------------------------------------------------------
  const productIds = [...new Set(payload.items.map((i) => Number(i.productId)))];
  const products = await getProductsByIds(db, productIds);
  const allExtrasIds = [...new Set(payload.items.flatMap((i) => (i.extrasIds ?? []).map(Number)))];
  const extrasById = new Map((await getExtrasByIds(db, allExtrasIds)).map((e) => [e.id, e]));
  const promos = await getActivePromotions(db, nowIso);

  // Consolida líneas idénticas (mismo producto + mismos extras).
  const lines = new Map<string, CheckoutCartItem>();
  for (const raw of payload.items) {
    const productId = Number(raw.productId);
    const quantity = Math.trunc(Number(raw.quantity));
    const extrasIds = [...new Set((raw.extrasIds ?? []).map(Number))].sort((a, b) => a - b);
    if (!Number.isFinite(productId) || !Number.isFinite(quantity)) {
      throw new CheckoutError('Item inválido');
    }
    if (quantity < 1 || quantity > MAX_QTY) throw new CheckoutError('Cantidad inválida');
    const key = `${productId}:${extrasIds.join('-')}`;
    const existing = lines.get(key);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, MAX_QTY);
    } else {
      lines.set(key, { productId, quantity, extrasIds });
    }
  }

  const items: OrderItemInput[] = [];
  for (const line of lines.values()) {
    const product = products.get(line.productId);
    if (!product || product.visible !== 1) {
      throw new CheckoutError('Un producto de tu pedido ya no está disponible', 409);
    }
    if (product.disponible !== 1) {
      throw new CheckoutError(`"${product.name}" está agotado por el momento`, 409);
    }

    const promo = bestPromoFor(promos, product.id, product.category_id, product.price);
    let unit = promo.promoPrice;

    const extrasJson: { id: number; name: string; price: number }[] = [];
    for (const extraId of line.extrasIds) {
      const extra = extrasById.get(extraId);
      const allowed = extra && (extra.product_id === null || extra.product_id === product.id);
      if (!allowed || extra.active !== 1) {
        throw new CheckoutError('Un agregado de tu pedido ya no está disponible', 409);
      }
      unit += extra.price;
      extrasJson.push({ id: extra.id, name: extra.name, price: extra.price });
    }

    const lineSubtotal = unit * line.quantity;
    subtotal += lineSubtotal;
    items.push({
      product_id: product.id,
      product_name: product.name,
      quantity: line.quantity,
      unit_price: unit,
      subtotal: lineSubtotal,
      extras_json: JSON.stringify(extrasJson),
    });
  }

  // ------------------------------------------------------------
  // Entrega
  // ------------------------------------------------------------
  if (fulfillment === 'delivery') {
    address = requireString(payload.address, 'dirección', 5, 200);
    const config = await getConfig<DeliveryConfig>(db, 'delivery');
    const zones = config?.zones ?? [];
    zone = typeof payload.zone === 'string' ? payload.zone.trim() : '';
    const match = zones.find((z) => z.name === zone);
    if (zones.length > 0 && !match) {
      throw new CheckoutError('Elegí una zona de delivery válida');
    }
    deliveryCost = match ? match.cost : 0;
    const freeFrom = Number(config?.free_from) || 0;
    if (freeFrom > 0 && subtotal >= freeFrom) deliveryCost = 0;
  }

  return {
    order: {
      customer_name: name,
      customer_phone: phone,
      customer_email: emailRaw || null,
      fulfillment,
      address,
      zone,
      delivery_cost: deliveryCost,
      subtotal,
      total: subtotal + deliveryCost,
      payment_method: payload.paymentMethod,
      notes,
    },
    items,
  };
}
