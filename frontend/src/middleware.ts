/**
 * Middleware: cache edge para páginas públicas (0 rows de D1 en un HIT)
 * + guard de autenticación para /admin y /api/admin.
 *
 * Patrón replicado de lanuscomputacion:
 * - HIT: se sirve desde el Cache API sin ejecutar Astro (0 D1 rows read).
 * - MISS: se responde y se guardan dos copias (fresca + stale de respaldo).
 * - ERROR (p.ej. cuota D1 agotada): se intenta la copia stale o 503 con retry.
 * - Nunca se cachea: /admin*, /api*, /checkout*, /pedido*, ni Set-Cookie.
 */
import { defineMiddleware } from 'astro:middleware';
import { getUserFromRequest, type SessionUser } from './lib/auth';

type CacheRule = { pattern: RegExp; sMaxAge: number };

const PUBLIC_CACHE_RULES: CacheRule[] = [
  { pattern: /^\/$/, sMaxAge: 300 }, // home: 5 min
  { pattern: /^\/menu$/, sMaxAge: 300 }, // carta: 5 min
  { pattern: /^\/menu\/[^/]+$/, sMaxAge: 300 }, // detalle: 5 min
  { pattern: /^\/contacto$/, sMaxAge: 3600 }, // casi estático: 1 h
  { pattern: /^\/sitemap\.xml$/, sMaxAge: 3600 },
];

const NEVER_CACHE_PREFIXES = ['/admin', '/api', '/checkout', '/pedido'];

function isNeverCached(pathname: string): boolean {
  return NEVER_CACHE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Namespace de cache por deploy: se inyecta en build (astro.config.mjs) con
 * CF_PAGES_COMMIT_SHA/GITHUB_SHA, así que cada deploy arranca con la cache vacía
 * y no sirve HTML de una versión anterior (el Cache API no se purga al desplegar).
 */
declare const __BUILD_ID__: string;

function buildId(env: Env): string {
  if (typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__) return __BUILD_ID__;
  return env.CF_PAGES_COMMIT_SHA?.slice(0, 12) || 'local';
}

function keyFor(request: Request, prefix: string, id: string): Request {
  const url = new URL(request.url);
  return new Request(`${url.origin}/${prefix}/${id}${url.pathname}${url.search}`, request);
}

function staleKeyFor(request: Request, id: string): Request {
  return keyFor(request, '__stale', id);
}

/**
 * El Cache API del runtime tipa Request/Response de workers-types, que no son
 * asignables a los tipos DOM de Astro. Este cast acota la diferencia de tipos
 * al mínimo necesario (match/put con Request/Response DOM).
 */
type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

function edgeCache(locals: App.Locals): EdgeCache {
  return locals.runtime.caches.default as unknown as EdgeCache;
}

function withHeader(response: Response, name: string, value: string): Response {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function unavailableResponse(pathname: string): Response {
  if (pathname.startsWith('/api')) {
    return new Response(JSON.stringify({ error: 'Servicio temporalmente no disponible. Reintentá en unos segundos.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '30' },
    });
  }
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="refresh" content="30">
<title>Chill Burguer Grill</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fff7ed;color:#1c1917}
.box{text-align:center;max-width:28rem;padding:2rem}h1{color:#ea580c}</style></head>
<body><div class="box"><h1>Estamos recargando la carta</h1><p>Un momento, volvemos en segundos.</p></div></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '30' } });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, locals } = context;
  const pathname = url.pathname;
  const env = locals.runtime.env;

  // ------------------------------------------------------------
  // Guard de admin (doble capa: acá y en cada /api/admin)
  // ------------------------------------------------------------
  const isLoginPage = pathname === '/admin/login' || pathname === '/api/auth/login';
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && !isLoginPage) {
    const user: SessionUser | null = await getUserFromRequest(request, env);
    locals.user = user;
    if (!user?.isAdmin) {
      if (pathname.startsWith('/api')) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      return context.redirect('/admin/login');
    }
  }

  // ------------------------------------------------------------
  // Cache edge para páginas públicas
  // ------------------------------------------------------------
  const rule = PUBLIC_CACHE_RULES.find((r) => r.pattern.test(pathname));
  const cacheable = !!rule && request.method === 'GET' && !isNeverCached(pathname);
  const cacheId = buildId(env);

  if (cacheable) {
    try {
      const cached = await edgeCache(locals).match(keyFor(request, '__v', cacheId));
      if (cached) return withHeader(cached, 'X-Cache', 'HIT');
    } catch (e) {
      console.error('[cache] match falló:', e);
    }
  }

  let response: Response;
  try {
    response = await next();
  } catch (e) {
    console.error('[render] error:', e);
    if (cacheable) {
      try {
        const stale = await edgeCache(locals).match(staleKeyFor(request, cacheId));
        if (stale) return withHeader(stale, 'X-Cache', 'STALE');
      } catch {
        /* noop */
      }
    }
    return unavailableResponse(pathname);
  }

  if (!cacheable || response.status !== 200 || response.headers.get('set-cookie')) {
    return response;
  }

  // ------------------------------------------------------------
  // MISS: responder con headers de cache + guardar copias (fresca + stale)
  // ------------------------------------------------------------
  const freshCopy = response.clone();
  const staleCopy = response.clone();

  const clientResponse = withHeader(response, 'X-Cache', 'MISS');
  clientResponse.headers.set(
    'Cache-Control',
    `public, s-maxage=${rule!.sMaxAge}, max-age=${Math.min(60, rule!.sMaxAge)}`
  );

  const staleFor = new Response(staleCopy.body, {
    status: staleCopy.status,
    statusText: staleCopy.statusText,
    headers: new Headers(staleCopy.headers),
  });
  staleFor.headers.set('Cache-Control', 'public, s-maxage=604800');
  staleFor.headers.delete('set-cookie');

  freshCopy.headers.set('X-Cache', 'MISS');
  freshCopy.headers.delete('set-cookie');
  freshCopy.headers.set('Cache-Control', `public, s-maxage=${rule!.sMaxAge}`);

  locals.runtime.ctx.waitUntil(
    Promise.allSettled([
      edgeCache(locals).put(keyFor(request, '__v', cacheId), freshCopy),
      edgeCache(locals).put(staleKeyFor(request, cacheId), staleFor),
    ])
  );

  return clientResponse;
});
