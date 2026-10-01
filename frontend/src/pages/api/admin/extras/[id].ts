import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, parseId, num, int01, withValidation } from '../../../../lib/admin';
import { updateExtra, deleteExtra } from '../../../../lib/d1';

export const PUT: APIRoute = withValidation(async ({ params, request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const patch: { name?: string; price?: number; active?: number; orden?: number; product_id?: number | null } = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 120) return errorJson('Campo inválido: nombre', 400);
    patch.name = name;
  }
  if (body.price !== undefined) patch.price = num(body.price, 'precio', 0, 1_000_000);
  if (body.active !== undefined) patch.active = int01(body.active, 'active');
  if (body.orden !== undefined) patch.orden = num(body.orden, 'orden', 0, 10_000);
  if (body.product_id !== undefined) {
    patch.product_id = body.product_id === null || body.product_id === '' ? null : num(body.product_id, 'producto', 1, 1_000_000);
  }

  await updateExtra(locals.runtime.env.DB, id, patch);
  return json({ ok: true });
});

export const DELETE: APIRoute = withValidation(async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);
  await deleteExtra(locals.runtime.env.DB, id);
  return json({ ok: true });
});
