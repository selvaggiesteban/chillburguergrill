/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime;

declare namespace App {
  interface Locals extends Runtime {
    user: { id: string; email: string; isAdmin: boolean } | null;
  }
}

interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  MP_ACCESS_TOKEN?: string;
  JWT_SECRET?: string;
}
