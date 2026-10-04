/**
 * Auth admin: JWT HS256 con Web Crypto (sin dependencias), cookie HttpOnly
 * y passwords con salt propio (sha256 de "salt.password").
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SESSION_COOKIE = 'session_token';

export type SessionUser = { id: string; email: string; isAdmin: boolean };

type JwtPayload = { sub: string; email: string; isAdmin: boolean; exp: number };

export function getJwtSecret(env: Env): string {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (import.meta.env.DEV) {
    console.warn('[auth] JWT_SECRET no definido — usando secreto de desarrollo');
    return 'chill-dev-secret-do-not-use-in-prod';
  }
  throw new Error('JWT_SECRET no está configurado');
}

// ------------------------------------------------------------
// base64url
// ------------------------------------------------------------

function b64urlFromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlFromString(s: string): string {
  return b64urlFromBytes(enc.encode(s));
}

function bytesFromB64url(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ------------------------------------------------------------
// JWT
// ------------------------------------------------------------

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signToken(
  payload: Omit<JwtPayload, 'exp'>,
  env: Env,
  days = 7
): Promise<string> {
  const header = b64urlFromString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64urlFromString(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + days * 86400 })
  );
  const key = await hmacKey(getJwtSecret(env));
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

export async function verifyToken(token: string, env: Env): Promise<JwtPayload | null> {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const key = await hmacKey(getJwtSecret(env));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      bytesFromB64url(signature),
      enc.encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(dec.decode(bytesFromB64url(body))) as JwtPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.isAdmin) return null;
    return payload;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Cookies
// ------------------------------------------------------------

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export function buildSessionCookie(token: string, maxAgeSeconds = 60 * 60 * 24 * 7): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// ------------------------------------------------------------
// Users
// ------------------------------------------------------------

export async function getUserFromRequest(request: Request, env: Env): Promise<SessionUser | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyToken(token, env);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, isAdmin: payload.isAdmin };
}

// ------------------------------------------------------------
// Passwords (sha256 con salt, formato "salt:hex")
// ------------------------------------------------------------

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt ?? hex(crypto.getRandomValues(new Uint8Array(8)));
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`${s}.${password}`));
  return `${s}:${hex(new Uint8Array(digest))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = await hashPassword(password, salt);
  if (candidate.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) - stored.charCodeAt(i);
  return diff === 0;
}
