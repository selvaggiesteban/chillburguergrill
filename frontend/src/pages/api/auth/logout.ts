import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';
import { clearSessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async () => {
  return json({ success: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
};
