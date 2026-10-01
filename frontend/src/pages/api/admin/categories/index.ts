import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin, readJson, str, num, int01, withValidation } from '../../../../lib/admin';
import { listCategories, createCategory } from '../../../../lib/d1';
import { slugify } from '../../../../lib/utils';

export const GET: APIRoute = async ({ locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;
  const categories = await listCategories(locals.runtime.env.DB, { includeHidden: true });
  return json({ categories });
};

export const POST: APIRoute = withValidation(async ({ request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const body = await readJson(request);
  if (!body) return errorJson('Body inválido', 400);

  const name = str(body.name, 'nombre', 2, 80);
  const slug = body.slug ? str(body.slug, 'slug', 2, 80) : slugify(name);
  const id = await createCategory(locals.runtime.env.DB, {
    name,
    slug,
    description: typeof body.description === 'string' ? body.description.slice(0, 300) : '',
    image_url: typeof body.image_url === 'string' && body.image_url ? body.image_url.slice(0, 500) : null,
    orden: num(body.orden, 'orden', 0, 10_000),
    visible: int01(body.visible ?? 1, 'visible'),
    destacada: int01(body.destacada ?? 0, 'destacada'),
  });
  return json({ id }, { status: 201 });
});
