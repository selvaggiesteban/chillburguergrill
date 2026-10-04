import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../lib/api';
import { getOrderById } from '../../../lib/d1';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Estado público de un pedido para la campana de notificaciones.
 * Devuelve sólo estado/pago/entrega: nunca datos personales del cliente.
 * Cacheado en edge 30 s (1 subrequest D1 cada 30 s como máximo por pedido).
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const id = params.id ?? '';
  if (!UUID_RE.test(id)) return errorJson('Pedido inválido', 400);

  let order;
  try {
    order = await getOrderById(locals.runtime.env.DB, id);
  } catch (e) {
    console.error('[pedido api] error:', e);
    return errorJson('No pudimos consultar el pedido', 500);
  }
  if (!order) return errorJson('Pedido no encontrado', 404);

  return json({
    id: order.id,
    shortId: order.id.replace(/-/g, '').slice(0, 8).toUpperCase(),
    status: order.status,
    paymentStatus: order.payment_status,
    fulfillment: order.fulfillment,
    updatedAt: order.updated_at,
  });
};
