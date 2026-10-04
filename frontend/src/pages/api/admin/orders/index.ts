import type { APIRoute } from 'astro';
import { json } from '../../../../lib/api';
import { assertAdmin } from '../../../../lib/admin';
import { listOrders } from '../../../../lib/d1';

export const GET: APIRoute = async ({ url, locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;

  const status = url.searchParams.get('status') || undefined;
  const limit = Number(url.searchParams.get('limit')) || 50;
  const offset = Number(url.searchParams.get('offset')) || 0;

  const { rows, total } = await listOrders(locals.runtime.env.DB, { status, limit, offset });
  return json({ orders: rows, total });
};
