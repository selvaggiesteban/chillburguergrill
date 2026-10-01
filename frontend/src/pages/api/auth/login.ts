import type { APIRoute } from 'astro';
import { errorJson, json } from '../../../lib/api';
import { buildSessionCookie, signToken, verifyPassword } from '../../../lib/auth';

/** Rate limit en memoria por isolate: 5 intentos / 60 s por IP. */
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) return errorJson('Demasiados intentos. Esperá un minuto.', 429);

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorJson('Body inválido', 400);
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password) return errorJson('Email y contraseña son obligatorios', 400);

  const admin = await locals.runtime.env.DB.prepare(
    'SELECT id, email, password_hash FROM admins WHERE email = ?'
  )
    .bind(email)
    .first<{ id: number; email: string; password_hash: string }>();

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return errorJson('Credenciales inválidas', 401);
  }

  const token = await signToken({ sub: String(admin.id), email: admin.email, isAdmin: true }, locals.runtime.env);

  return json(
    { success: true, email: admin.email },
    { headers: { 'Set-Cookie': buildSessionCookie(token) } }
  );
};
