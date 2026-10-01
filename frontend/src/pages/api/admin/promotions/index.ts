import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, str, num, int01, withValidation } from '../../../../lib/admin';
import { listPromotions, createPromotion } from '../../../../lib/d1';

export const GET: APIRoute = async ({ locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;
  const promotions = await listPromotions(locals.runtime.env.DB);
  return json({ promotions });
};

export const POST: APIRoute = withValidation(async ({ request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const name = str(body.name, 'nombre', 2, 100);
  const scope = body.scope === 'product' || body.scope === 'category' ? body.scope : 'store';
  const targetId = scope === 'store' ? null : num(body.target_id, 'destino', 1, 1_000_000);
  const discountPct = num(body.discount_pct, 'descuento', 1, 90);

  const id = await createPromotion(locals.runtime.env.DB, {
    name,
    scope,
    target_id: targetId,
    discount_pct: discountPct,
    start_at: body.start_at ? String(body.start_at).slice(0, 40) : null,
    end_at: body.end_at ? String(body.end_at).slice(0, 40) : null,
    active: int01(body.active ?? 1, 'active'),
  });
  return json({ id }, { status: 201 });
});
