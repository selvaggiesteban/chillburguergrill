import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';
import { assertAdmin } from '../../../lib/admin';
import { getDashboardStats } from '../../../lib/d1';

export const GET: APIRoute = async ({ locals }) => {
  const denied = assertAdmin(locals);
  if (denied) return denied;
  const stats = await getDashboardStats(locals.runtime.env.DB);
  return json(stats);
};
