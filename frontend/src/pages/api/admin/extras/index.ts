import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, num, withValidation } from '../../../../lib/admin';
import { listExtrasDetailed, createExtra, getExistingProductIds } from '../../../../lib/d1';

export const GET: APIRoute = async ({ locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;
  const extras = await listExtrasDetailed(locals.runtime.env.DB);
  return json({ extras });
};

export const POST: APIRoute = withValidation(async ({ request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 120) return errorJson('Campo inválido: nombre', 400);
  const price = num(body.price, 'precio', 0, 1_000_000);

  let productId: number | null = null;
  if (body.product_id !== undefined && body.product_id !== null && body.product_id !== '') {
    productId = num(body.product_id, 'producto', 1, 1_000_000);
    const db = locals.runtime.env.DB;
    const existing = await getExistingProductIds(db, [productId]);
    if (!existing.has(productId)) return errorJson('El producto no existe', 400);
  }

  const id = await createExtra(locals.runtime.env.DB, {
    product_id: productId,
    name,
    price,
    orden: num(body.orden ?? 0, 'orden', 0, 10_000),
  });
  return json({ id }, { status: 201 });
});
