import type { APIRoute } from 'astro';
import { errorJson } from '../../../../../lib/api';
import { assertAdmin } from '../../../../../lib/admin';
import { getOrderById } from '../../../../../lib/d1';

/** Sirve el comprobante de transferencia desde R2. */
export const GET: APIRoute = async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = params.id;
  if (!id) return errorJson('ID inválido', 400);

  const db = locals.runtime.env.DB;
  const order = await getOrderById(db, id);
  if (!order) return errorJson('Pedido no encontrado', 404);
  if (!order.transfer_proof_key) return errorJson('Sin comprobante', 404);

  const object = await locals.runtime.env.IMAGES.get(order.transfer_proof_key);
  if (!object) return errorJson('Comprobante no encontrado', 404);

  const headers: Record<string, string> = {
    'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
    'Cache-Control': 'private, max-age=300',
  };
  return new Response(await object.arrayBuffer(), { headers });
};
