import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, str, num, int01, withValidation } from '../../../../lib/admin';
import { listProducts, createProduct } from '../../../../lib/d1';
import { slugify } from '../../../../lib/utils';

export const GET: APIRoute = async ({ url, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const categoryId = Number(url.searchParams.get('category_id')) || undefined;
  const { rows, total } = await listProducts(locals.runtime.env.DB, {
    includeHidden: true,
    categoryId,
    limit: 300,
  });
  return json({ products: rows, total });
};

export const POST: APIRoute = withValidation(async ({ request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const db = locals.runtime.env.DB;
  const categoryId = num(body.category_id, 'categoría', 1, 1_000_000);
  const cat = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(categoryId).first<{ id: number }>();
  if (!cat) return errorJson('La categoría no existe', 400);

  const name = str(body.name, 'nombre', 2, 120);
  const id = await createProduct(db, {
    category_id: categoryId,
    type: body.type === 'combo' ? 'combo' : 'simple',
    name,
    slug: body.slug ? str(body.slug, 'slug', 2, 120) : slugify(name),
    description: typeof body.description === 'string' ? body.description.slice(0, 1000) : '',
    price: num(body.price, 'precio', 0, 10_000_000),
    images: Array.isArray(body.images)
      ? (body.images as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 8).map((s) => s.slice(0, 500))
      : [],
    cover_index: num(body.cover_index ?? 0, 'imagen', 0, 8),
    disponible: int01(body.disponible ?? 1, 'disponible'),
    visible: int01(body.visible ?? 1, 'visible'),
    destacado: int01(body.destacado ?? 0, 'destacado'),
    orden: num(body.orden ?? 0, 'orden', 0, 10_000),
  });
  return json({ id }, { status: 201 });
});
