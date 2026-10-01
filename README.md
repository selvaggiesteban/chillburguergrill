# Chill Burguer Grill

Sitio web oficial de la hamburguesería **Chill Burguer Grill**: carta online, pedidos con delivery o retiro en local, y pagos con MercadoPago, transferencia bancaria o efectivo contra entrega.

## Stack

- **Astro v5** (SSR) + **React 19** islands + **Tailwind CSS v3**
- **Cloudflare Pages** + **D1** (base de datos) + **R2** (imágenes del admin) + Cache API (edge cache)
- Auth admin JWT · MercadoPago Checkout API · CI/CD push-to-deploy

## Estructura

```
frontend/            # App Astro (storefront + admin + API)
  migrations/        # Migraciones D1 (aplicar en orden con wrangler d1 execute)
  src/
    components/      # Islas React y componentes Astro
    lib/             # d1.ts (capa de datos tipada), auth.ts, mp.ts
    middleware.ts    # Cache edge (X-Cache) + auth de /admin
    pages/           # Rutas públicas, /admin y /api
  wrangler.jsonc     # Bindings de Pages (D1 + R2)
.github/workflows/   # Quota watchdog de D1
```

## Desarrollo local

```bash
cd frontend
npm install
npx wrangler d1 execute chill-menu --local --file=./migrations/001_init.sql
npx wrangler d1 execute chill-menu --local --file=./migrations/002_indexes.sql
npm run dev
```

## Deploy

Push a `main` → Cloudflare Pages construye y despliega automáticamente.

Migraciones (manual, en orden):

```bash
cd frontend
npx wrangler d1 execute chill-menu --remote --file=./migrations/<NNNN>.sql
```

## Seguridad

- Los secretos (`MP_ACCESS_TOKEN`, `JWT_SECRET`) van en Cloudflare Pages → Settings → Secrets, nunca en el repo.
