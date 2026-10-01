import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';
import { getUserFromRequest } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = await getUserFromRequest(request, locals.runtime.env);
  return json({ authenticated: !!user?.isAdmin, email: user?.email ?? null });
};
