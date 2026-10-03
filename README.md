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
.github/workflows/   # deploy.yml (push→Pages) + d1-quota-watch.yml
```

## Desarrollo local

```bash
cd frontend
npm install
npx wrangler d1 execute chill-menu --local --file=./migrations/001_init.sql
npx wrangler d1 execute chill-menu --local --file=./migrations/002_indexes.sql
npm run dev
```

## Producción

- **URL**: <https://chillburguergrill.pages.dev> (dominio propio `chillburguergrill.com` pendiente de apuntar con un CNAME a `chillburguergrill.pages.dev`)
- **Proyecto Pages**: `chillburguergrill` (production branch: `main`)
- **D1**: `chill-menu` · `f7e04d5c-8119-4dd6-9bc0-0fa9b9b6eff1` (migraciones 001–003 + seed aplicadas)
- **R2**: bucket `chillburguergrill-images` (comprobantes de transferencia, prefijo `proofs/`)
- **KV**: namespace `SESSION` · `c548eb5da0f645d0a7048e9bc946342d` (sesiones Astro 5)
- **Secretos en Pages**: `JWT_SECRET`, `MP_ACCESS_TOKEN` (hoy token TEST ⇒ checkout en modo mock; reemplazar por el token real `APP_USR-…`)

### CI/CD y quota watchdog

Ambos workflows (`.github/workflows/`) requieren el secret de GitHub
**`CLOUDFLARE_API_TOKEN`** (Settings → Secrets and variables → Actions):
token de Cloudflare con permisos **Account:Read**, **D1:Read/Write**,
**Pages:Edit** y **Workers KV:Edit**.

- `deploy.yml`: en cada push a `main` → `tsc --noEmit` + `build` + `wrangler pages deploy`
- `d1-quota-watch.yml`: cada 6 h verifica `rowsRead` de D1 contra la cuota free (aviso 3,5M / alerta 4,5M de 5M diarios)

Mientras falte el secret, el deploy es manual (ver más abajo).

## Deploy

Push a `main` → GitHub Actions despliega en Cloudflare Pages (si `CLOUDFLARE_API_TOKEN` está seteado).

Deploy manual:

```bash
cd frontend
npm run build
npx wrangler pages deploy ./dist --project-name=chillburguergrill --branch=main --commit-dirty=true
```

Migraciones (manual, en orden):

```bash
cd frontend
npx wrangler d1 execute chill-menu --remote --file=./migrations/<NNNN>.sql
```

Alta de admin (la contraseña nunca se commitea):

```bash
node scripts/create-admin.mjs --remote admin@dominio.com "contraseña"
```

## Seguridad

- Los secretos (`MP_ACCESS_TOKEN`, `JWT_SECRET`) van en Cloudflare Pages → Settings → Secrets, nunca en el repo.
- `.dev.vars` (gitignored) lleva los valores de desarrollo local.
