import type { APIRoute } from 'astro';

/**
 * Sirve imágenes públicas de productos desde R2.
 * Solo el prefijo `products/` es público: los comprobantes (`proofs/`)
 * siguen siendo accesibles únicamente vía /api/admin (con sesión).
 */
const PUBLIC_KEY = /^products\/[A-Za-z0-9._-]+$/;

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key;
  if (!key || !PUBLIC_KEY.test(key)) return new Response('No encontrado', { status: 404 });

  const object = await locals.runtime.env.IMAGES.get(key);
  if (!object) return new Response('No encontrado', { status: 404 });

  const headers: Record<string, string> = {
    'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
    'Cache-Control': object.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable',
  };
  return new Response(await object.arrayBuffer(), { headers });
};
