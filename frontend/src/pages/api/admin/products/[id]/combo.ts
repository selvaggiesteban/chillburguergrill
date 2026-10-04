import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../../lib/api';
import { assertAdmin, readJson, parseId, withValidation } from '../../../../../lib/admin';
import { getComboItemsDetailed, setComboItems, getExistingProductIds } from '../../../../../lib/d1';

export const GET: APIRoute = async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;
  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);
  const items = await getComboItemsDetailed(locals.runtime.env.DB, id);
  return json({ items });
};

export const PUT: APIRoute = withValidation(async ({ params, request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);

  const body = await readJson<{ items?: { product_id?: unknown; quantity?: unknown }[] }>(request);
  if (!body || !Array.isArray(body.items)) return errorJson('Body inválido', 400);
  if (body.items.length > 30) return errorJson('Demasiados items en el combo', 400);

  const items = body.items.map((item) => ({
    product_id: Number(item.product_id),
    quantity: Math.trunc(Number(item.quantity)),
  }));
  if (items.some((i) => !Number.isInteger(i.product_id) || i.product_id < 1 || i.quantity < 1 || i.quantity > 99)) {
    return errorJson('Items del combo inválidos', 400);
  }

  const db = locals.runtime.env.DB;
  const product = await db.prepare('SELECT id FROM products WHERE id = ?').bind(id).first<{ id: number }>();
  if (!product) return errorJson('Producto no encontrado', 404);

  const existing = await getExistingProductIds(db, items.map((i) => i.product_id));
  if (items.some((i) => !existing.has(i.product_id))) {
    return errorJson('Uno de los productos del combo no existe', 400);
  }

  await setComboItems(db, id, items);
  return json({ ok: true });
});
