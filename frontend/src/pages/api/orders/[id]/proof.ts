import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../../lib/api';
import { getOrderById, setTransferProof } from '../../../../lib/d1';

const MAX_SIZE = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/avif': 'avif',
};

/** Rate limit: 10 subidas / 60 s por IP. */
const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

/**
 * Sube el comprobante de transferencia a R2 (invitado: la seguridad la da el
 * UUID de la order; nadie puede adivinarlo).
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const orderId = params.id;
  if (!orderId) return errorJson('Falta el pedido', 400);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) return errorJson('Demasiados intentos. Esperá un minuto.', 429);

  const env = locals.runtime.env;
  const order = await getOrderById(env.DB, orderId);
  if (!order) return errorJson('Pedido no encontrado', 404);
  if (order.payment_method !== 'transfer') return errorJson('Este pedido no es por transferencia', 400);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorJson('Formulario inválido', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return errorJson('Falta el archivo', 400);
  if (!file.type.startsWith('image/')) return errorJson('Solo se aceptan imágenes', 400);
  if (file.size > MAX_SIZE) return errorJson('La imagen supera los 5 MB', 400);

  const ext = EXT_BY_TYPE[file.type] ?? 'jpg';
  const key = `proofs/${orderId}.${ext}`;

  try {
    await env.IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
  } catch (e) {
    console.error('[proof] R2 put error:', e);
    return errorJson('No pudimos subir la imagen. Probá de nuevo.', 500);
  }

  await setTransferProof(env.DB, orderId, key);
  return json({ ok: true, key });
};
