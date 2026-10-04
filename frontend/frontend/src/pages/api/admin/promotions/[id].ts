import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, parseId, str, num, int01, withValidation } from '../../../../lib/admin';
import { updatePromotion, deletePromotion } from '../../../../lib/d1';

export const PUT: APIRoute = withValidation(async ({ params, request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const patch: Parameters<typeof updatePromotion>[2] = {};
  if (body.name !== undefined) patch.name = str(body.name, 'nombre', 2, 100);
  if (body.scope !== undefined) patch.scope = body.scope === 'product' || body.scope === 'category' ? body.scope : 'store';
  if (body.target_id !== undefined) {
    patch.target_id = body.target_id === null ? null : num(body.target_id, 'destino', 1, 1_000_000);
  }
  if (body.discount_pct !== undefined) patch.discount_pct = num(body.discount_pct, 'descuento', 1, 90);
  if (body.start_at !== undefined) patch.start_at = body.start_at ? String(body.start_at).slice(0, 40) : null;
  if (body.end_at !== undefined) patch.end_at = body.end_at ? String(body.end_at).slice(0, 40) : null;
  if (body.active !== undefined) patch.active = int01(body.active, 'active');

  // Si cambia el scope a store, limpia el destino.
  if (patch.scope === 'store' && patch.target_id === undefined) patch.target_id = null;

  await updatePromotion(locals.runtime.env.DB, id, patch);
  return json({ ok: true });
});

export const DELETE: APIRoute = withValidation(async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);
  await deletePromotion(locals.runtime.env.DB, id);
  return json({ ok: true });
});
