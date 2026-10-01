import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, parseId, str, num, int01, withValidation } from '../../../../lib/admin';
import { getProductById, updateProduct, deleteProduct, listExtrasForProduct } from '../../../../lib/d1';
import { slugify } from '../../../../lib/utils';

export const GET: APIRoute = async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;
  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);

  const db = locals.runtime.env.DB;
  const product = await getProductById(db, id, { includeHidden: true });
  if (!product) return errorJson('Producto no encontrado', 404);
  const extras = await listExtrasForProduct(db, id);
  return json({ product, extras });
};

export const PUT: APIRoute = withValidation(async ({ params, request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);
  const db = locals.runtime.env.DB;
  if (!(await getProductById(db, id, { includeHidden: true }))) return errorJson('Producto no encontrado', 404);

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const patch: Record<string, unknown> = {};
  if (body.category_id !== undefined) patch.category_id = num(body.category_id, 'categoría', 1, 1_000_000);
  if (body.type !== undefined) patch.type = body.type === 'combo' ? 'combo' : 'simple';
  if (body.name !== undefined) {
    const name = str(body.name, 'nombre', 2, 120);
    patch.name = name;
    if (body.slug === undefined) patch.slug = slugify(name);
  }
  if (body.slug !== undefined) patch.slug = str(body.slug, 'slug', 2, 120);
  if (body.description !== undefined) patch.description = String(body.description).slice(0, 1000);
  if (body.price !== undefined) patch.price = num(body.price, 'precio', 0, 10_000_000);
  if (body.images !== undefined) {
    patch.images = JSON.stringify(
      (Array.isArray(body.images) ? body.images : []).filter((x): x is string => typeof x === 'string').slice(0, 8)
    );
  }
  if (body.cover_index !== undefined) patch.cover_index = num(body.cover_index, 'imagen', 0, 8);
  if (body.disponible !== undefined) patch.disponible = int01(body.disponible, 'disponible');
  if (body.visible !== undefined) patch.visible = int01(body.visible, 'visible');
  if (body.destacado !== undefined) patch.destacado = int01(body.destacado, 'destacado');
  if (body.orden !== undefined) patch.orden = num(body.orden, 'orden', 0, 10_000);

  await updateProduct(db, id, patch);
  return json({ ok: true });
});

export const DELETE: APIRoute = withValidation(async ({ params, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const id = parseId(params.id);
  if (!id) return errorJson('ID inválido', 400);

  const db = locals.runtime.env.DB;
  const used = await db
    .prepare('SELECT COUNT(*) AS n FROM combo_items WHERE product_id = ?')
    .bind(id)
    .first<{ n: number }>();
  if ((used?.n ?? 0) > 0) {
    return errorJson('No se puede borrar: este producto integra un combo', 409);
  }

  await deleteProduct(db, id);
  return json({ ok: true });
});
