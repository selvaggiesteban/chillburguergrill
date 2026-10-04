import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, parseId, str, num, int01, withValidation } from '../../../../lib/admin';
import { getCategoryById, updateCategory, deleteCategory } from '../../../../lib/d1';
import { slugify } from '../../../../lib/utils';

export const PUT: APIRoute = withValidation(async ({ params, request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);
  if (!(await getCategoryById(locals.runtime.env.DB, id))) return errorJson('Categoría no encontrada', 404);

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = str(body.name, 'nombre', 2, 80);
    patch.name = name;
    if (body.slug === undefined) patch.slug = slugify(name);
  }
  if (body.slug !== undefined) patch.slug = str(body.slug, 'slug', 2, 80);
  if (body.description !== undefined) patch.description = String(body.description).slice(0, 300);
  if (body.image_url !== undefined) patch.image_url = body.image_url ? String(body.image_url).slice(0, 500) : null;
  if (body.orden !== undefined) patch.orden = num(body.orden, 'orden', 0, 10_000);
  if (body.visible !== undefined) patch.visible = int01(body.visible, 'visible');
  if (body.destacada !== undefined) patch.destacada = int01(body.destacada, 'destacada');

  await updateCategory(locals.runtime.env.DB, id, patch);
  return json({ ok: true });
});

export const DELETE: APIRoute = withValidation(async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);

  const db = locals.runtime.env.DB;
  const used = await db
    .prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?')
    .bind(id)
    .first<{ n: number }>();
  if ((used?.n ?? 0) > 0) {
    return errorJson('No se puede borrar: hay productos en esta categoría', 409);
  }

  await deleteCategory(db, id);
  return json({ ok: true });
});
