import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../lib/api';
import { assertAdmin, readJson, withValidation } from '../../../lib/admin';
import { getAllConfig, setConfig } from '../../../lib/d1';

const ALLOWED_KEYS = ['contact', 'hours', 'delivery', 'bank', 'payments', 'hero'] as const;
type ConfigKey = (typeof ALLOWED_KEYS)[number];

export const GET: APIRoute = async ({ locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;
  const config = await getAllConfig(locals.runtime.env.DB);
  return json({ config });
};

export const PUT: APIRoute = withValidation(async ({ request, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const body = await readJson<{ key?: unknown; value?: unknown }>(request);
  if (!body || typeof body.key !== 'string') return errorJson('Body inválido', 400);
  if (!ALLOWED_KEYS.includes(body.key as ConfigKey)) return errorJson('Clave de configuración inválida', 400);

  // Límite de tamaño razonable por clave.
  const serialized = JSON.stringify(body.value ?? null);
  if (serialized.length > 10_000) return errorJson('Configuración demasiado grande', 400);

  await setConfig(locals.runtime.env.DB, body.key, body.value ?? null);
  return json({ ok: true });
});
