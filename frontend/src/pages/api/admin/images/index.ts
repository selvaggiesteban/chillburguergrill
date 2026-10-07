import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { assertAdmin } from '../../../../lib/admin';

const MAX_SIZE = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/**
 * Sube una imagen de producto a R2 y devuelve la URL pública (/media/...).
 * Doble capa: middleware /api/admin + assertAdmin.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorJson('Formulario inválido', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return errorJson('Falta el archivo', 400);
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return errorJson('Formato no soportado. Usá JPG, PNG, WebP o AVIF.', 400);
  if (file.size > MAX_SIZE) return errorJson('La imagen supera los 5 MB', 400);

  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const key = `products/${Date.now().toString(36)}-${rand}.${ext}`;

  try {
    await locals.runtime.env.IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    });
  } catch (e) {
    console.error('[images] R2 put error:', e);
    return errorJson('No pudimos subir la imagen. Probá de nuevo.', 500);
  }

  return json({ ok: true, url: `/media/${key}` }, { status: 201 });
};
