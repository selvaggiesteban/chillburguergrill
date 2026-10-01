import type { APIRoute } from 'astro';
import { listProducts } from '../lib/d1';

const STATIC_PATHS = ['/', '/menu', '/contacto'];

export const GET: APIRoute = async ({ locals, url, site }) => {
  const origin = site ?? new URL(url.origin);

  let paths: string[] = STATIC_PATHS;
  try {
    const { rows } = await listProducts(locals.runtime.env.DB, { includeHidden: false, limit: 300 });
    paths = [...STATIC_PATHS, ...rows.map((p) => `/menu/${p.slug}`)];
  } catch {
    /* sin D1 seguimos sirviendo las rutas estáticas */
  }

  const urls = paths
    .map((p) => `  <url><loc>${new URL(p, origin).toString()}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
};
