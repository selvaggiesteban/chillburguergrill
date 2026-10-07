/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    user: { id: string; email: string; isAdmin: boolean } | null;
    /** Config pública (contacto/horarios) memoizada por request. */
    publicConfig?: import('./lib/public-config').PublicConfig;
  }
}

interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  MP_ACCESS_TOKEN?: string;
  JWT_SECRET?: string;
  /** Cloudflare Email Service (binding) — opcional; Pages no lo soporta. */
  EMAIL?: {
    send(message: {
      to: string;
      from: string | { email: string; name?: string };
      subject: string;
      html?: string;
      text?: string;
    }): Promise<unknown>;
  };
  /** Token con Email Sending:Edit para la REST API del Email Service (Pages secret). */
  EMAIL_API_TOKEN?: string;
  /** Inyectado por Cloudflare Pages en cada deploy (no disponible en dev). */
  CF_PAGES_COMMIT_SHA?: string;
}
