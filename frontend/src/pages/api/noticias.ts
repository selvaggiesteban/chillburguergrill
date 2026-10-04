import type { APIRoute } from 'astro';
import { json } from '../../lib/api';
import { getConfig, type NoticeRow } from '../../lib/d1';

/**
 * Novedades del local para la campana de notificaciones.
 * Página pública y cacheada en edge (300 s) para no consumir cuota D1.
 */
export const GET: APIRoute = async ({ locals }) => {
  let notices: NoticeRow[] = [];
  try {
    const stored = await getConfig<NoticeRow[]>(locals.runtime.env.DB, 'notices');
    notices = Array.isArray(stored)
      ? stored.filter((n) => n && typeof n.title === 'string' && n.active !== false)
      : [];
  } catch (e) {
    console.error('[noticias] error:', e);
  }

  notices = notices
    .slice(0, 20)
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));

  return json({ notices });
};
