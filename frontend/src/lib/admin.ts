/** Utilidades compartidas por las rutas /api/admin (doble capa con el middleware). */
import type { APIContext } from 'astro';
import { errorJson } from './api';

/** Devuelve un Response de error si no hay sesión de admin; null si está autorizado. */
export function assertAdmin(locals: App.Locals): Response | null {
  if (!locals.user?.isAdmin) return errorJson('No autenticado', 401);
  return null;
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') return null;
    return body as T;
  } catch {
    return null;
  }
}

export function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function str(value: unknown, field: string, min = 1, max = 500): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (s.length < min || s.length > max) throw new Error(`Campo inválido: ${field}`);
  return s;
}

export function optStr(value: unknown, field: string, max = 500): string | null {
  if (value === undefined || value === null || value === '') return null;
  return str(value, field, 1, max);
}

export function num(value: unknown, field: string, min = 0, max = 1_000_000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Campo inválido: ${field}`);
  return n;
}

export function int01(value: unknown, field: string): number {
  const n = Number(value);
  return n === 1 ? 1 : 0;
}

/** Envuelve handlers que usan los validadores anteriores. */
export function withValidation(handler: (ctx: APIContext) => Promise<Response>): (ctx: APIContext) => Promise<Response> {
  return async (ctx) => {
    try {
      return await handler(ctx);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error inesperado';
      if (message.includes('UNIQUE constraint failed')) {
        return errorJson('Ya existe un registro con ese identificador', 409);
      }
      const status = message.startsWith('Campo inválido') ? 400 : 500;
      if (status === 500) console.error('[admin api]', e);
      return errorJson(message, status);
    }
  };
}
