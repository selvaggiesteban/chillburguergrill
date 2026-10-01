import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, parseId, withValidation } from '../../../../lib/admin';
import { getOrderById, getOrderItems, updateOrderStatus, updateOrderPayment } from '../../../../lib/d1';
import type { OrderStatus, PaymentStatus } from '../../../../lib/d1';

const ORDER_STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'processing', 'paid', 'rejected', 'refunded'];

export const GET: APIRoute = async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = params.id;
  if (!id) return errorJson('ID inválido', 400);
  const db = locals.runtime.env.DB;
  const order = await getOrderById(db, id);
  if (!order) return errorJson('Pedido no encontrado', 404);
  const items = await getOrderItems(db, id);
  return json({ order, items });
};

export const PUT: APIRoute = withValidation(async ({ params, request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = params.id;
  if (!id) return errorJson('ID inválido', 400);
  const db = locals.runtime.env.DB;
  if (!(await getOrderById(db, id))) return errorJson('Pedido no encontrado', 404);

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status as OrderStatus)) {
      return errorJson('Estado de pedido inválido', 400);
    }
    await updateOrderStatus(db, id, body.status as OrderStatus);
  }

  if (body.payment_status !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.payment_status as PaymentStatus)) {
      return errorJson('Estado de pago inválido', 400);
    }
    await updateOrderPayment(db, id, { payment_status: body.payment_status as PaymentStatus });
  }

  const order = await getOrderById(db, id);
  return json({ ok: true, order });
});
