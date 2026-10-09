# Chill Burguer Grill — Technical Specification

Online ordering platform for **Chill Burguer Grill** (smash burgers, Lanús, Buenos Aires).

- **Canonical URL:** https://chillburgergrill.pages.dev/
- **Admin panel:** https://chillburgergrill.pages.dev/admin
- **Repository:** https://github.com/selvaggiesteban/chillburgergrill
- **Version:** 1.0.0
- **Author:** Esteban Selvaggi

---

## 1. Project Status

Markers: `✓` completed · `✗` pending · `⚠` blocked.

### Completed

- ✓ Production site live at `chillburgergrill.pages.dev` (Pages project recreated with the correct subdomain; the previous project is kept as a rollback)
- ✓ Roboto typography applied and verified across all breakpoints
- ✓ Admin panel rebrand: logo, black accents, zero emojis, product image upload to R2
- ✓ MercadoPago live checkout: real credentials, hosted preference redirect, IPN webhook with signature validation
- ✓ Turnstile bot protection infrastructure (widget, siteverify Worker, checkout and login gates) — temporarily disabled by the `TURNSTILE_ENABLED` switch
- ✓ Product image data normalization (JSON array storage) and `object-fit: cover` / `object-position: center` on every image
- ✓ Hero carousel removed from the home page
- ✓ Sticky admin header with hamburger menu on mobile and spaced navigation on desktop
- ✓ Admin credentials rotated (`admin@chillburgergrill.com`)
- ✓ Edge caching with stale-on-error and per-deploy cache namespace
- ✓ CI/CD via GitHub Actions (typecheck, build, Wrangler deploy) — green on every push to `main`

### Pending

- ✗ Customer and staff email notifications (`EMAIL_API_TOKEN` not set on the Pages project)
- ✗ Re-enabling Turnstile when traffic requires it (single boolean in `src/lib/turnstile.ts`)
- ✗ Google Search Console, GA4 and Google Business Profile setup
- ✗ Cleanup of test orders created during verification

### Blocked

- ⚠ Transactional email sending: the Cloudflare Email Service domain onboarding must be completed in the Cloudflare dashboard (`Compute > Email Service > Onboard Domain`). The code is ready; the API returns error `10202` until the domain is verified
- ⚠ Removal of the legacy Pages project `chillburgergrill-old` (still serving `chillburguergrill.pages.dev` as a rollback) — awaiting owner confirmation
- ⚠ Custom apex domain (not purchased/configured; the site runs on `*.pages.dev`)

---

## 2. Feature Matrix

> The check/cross/warning markers are used only in the status lists and this section.

### Platform & Infrastructure

- ✓ Hosting: Cloudflare Pages with edge SSR (Astro `output: server`)
- ✓ Database: Cloudflare D1 (distributed SQLite)
- ✓ Object storage: Cloudflare R2 (S3-compatible) for payment proofs and catalog images
- ✓ Session storage: Cloudflare KV (`SESSION` binding, JWT cookie)
- ✓ CI/CD: GitHub Actions → `npm ci` → typecheck → build → Wrangler → Pages
- ✓ D1 quota watchdog workflow (`d1-quota-watch.yml`)
- ✓ Framework: Astro v5 (server output)
- ✓ UI: React 19 islands (only interactive parts hydrate)
- ✓ Styling: Tailwind CSS, mobile-first responsive layout
- ✓ Static sections: pure Astro components + vanilla JS, no client framework

### Storefront

- ✓ Digital menu on the home page `/`: filters (all / discount / best sellers / lowest price), sticky section tabs, product rows per section
- ✓ Product detail at `/producto/[slug]`: modifier groups, required/optional selections, quantity, sticky purchase bar
- ✓ Shopping cart: localStorage cart, re-validated server-side at checkout
- ✓ Pricing engine: server-side calculation in `lib/checkout.ts` (the client is never trusted)
- ✓ Promotions engine: product / category / store scope with percentage discount and date windows
- ✓ Floating WhatsApp button with E.164-normalized `wa.me` link
- ✓ Order status tracking page `/pedido/[id]` (public, no personal data exposed)
- ✓ Notifications bell: order status and news notices with unread badge and 60 s polling
- ✓ Footer removed from the layout (header-only chrome, per design review)
- ✓ All catalog images use `object-fit: cover` with centered cropping
- ✗ Product ratings / reviews: no rating data exists in the catalog
- ✗ Automated unit/e2e test suite inside this repository (verification is performed by external browser scripts)

### Ordering & Payments

- ✓ Checkout `/pagar`: delivery or pickup, zone-based delivery cost, free-delivery threshold
- ✓ Payment methods: MercadoPago, direct bank transfer, cash on delivery/pickup
- ✓ 10% discount on the product subtotal for `transfer` and `cash`
- ✓ MercadoPago preference creation with real credentials + `POST /api/webhooks/mercadopago` (HMAC signature validated)
- ✓ Proof-of-payment upload to R2 and admin review at `/admin/pedidos/[id]`
- ✗ Email receipts to the customer (blocked on email-domain onboarding, see status)

### Admin Panel

- ✓ Dashboard with daily stats (`/admin`)
- ✓ Menu management: categories, products, images, combos, extras, ordering (`/admin/carta`)
- ✓ Modifier groups: `group_id`, required flag, max selection
- ✓ Orders board with status transitions and payment-proof viewer
- ✓ Promotions CRUD with scope and date windows
- ✓ Site config editor: contact data, opening hours, delivery zones, news notices (`/admin/config`)
- ✓ Security: `middleware.ts` guards on `/admin*` and `/api/admin*`, JWT session, salted password hashing, CSRF origin check on mutations
- ✓ Sticky header with hamburger navigation on mobile; logo-only login page

### SEO, Security & Delivery

- ✓ JSON-LD `Restaurant` schema, Open Graph and Twitter meta tags
- ✓ Dynamic `sitemap.xml` and `robots.txt` (admin, API, checkout and order pages disallowed)
- ✓ Edge cache (Cache API) with `X-Cache: HIT | MISS | STALE` headers and per-deploy build namespace
- ✓ Never cached: `/admin*`, `/pagar*`, `/pedido*`, responses with `Set-Cookie`, non-GET methods
- ✓ Input validation on every admin/checkout endpoint (parameterized SQL only)
- ✓ Turnstile bot protection code (checkout + admin login), master-switched off in production
- ✗ Custom apex domain: the site is served from `chillburgergrill.pages.dev`

---

## 3. Navigation & Routing (routes + HTTP methods)

### Public pages

| Route | Method | Access | Purpose |
|---|---|---|---|
| `/` | GET | Public | Home and full digital menu: filters, sticky tabs, featured card |
| `/producto/<slug>` | GET | Public | Product detail with modifier groups and purchase bar |
| `/pagar` | GET | Public | Checkout (delivery/pickup, payment method, order notes); `noindex` |
| `/pedido/<uuid>` | GET | Public | Order status page (no personal data in the payload) |
| `/contacto` | GET | Public | Contact, address, map, opening hours |
| `/menu` | GET | Public | 302 redirect → `/` (legacy URL) |
| `/menu/<slug>` | GET | Public | 308 redirect → `/producto/<slug>` (legacy URLs keep working) |
| `/product/<slug>` | GET | Public | 308 redirect → `/producto/<slug>` (legacy English path) |
| `/checkout` | GET | Public | 302 redirect → `/pagar` (legacy URL) |
| `/404` | GET | Public | Not found |
| `/sitemap.xml`, `/robots.txt` | GET | Public | SEO files |

### Public APIs

| Route | Method | Purpose | Edge cache |
|---|---|---|---|
| `/api/checkout` | POST | Create order, price it server-side, create MercadoPago preference | — |
| `/api/pedido/<uuid>` | GET | Order status (id, status, timestamps only) | 30 s |
| `/api/noticias` | GET | Active news notices for the bell | 120 s |
| `/api/orders/<id>/proof` | POST | Upload payment proof to R2 | — |
| `/api/webhooks/mercadopago` | POST | MercadoPago IPN webhook | — |

### Authentication

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Admin login (sets `session_token`, `Secure` + `HttpOnly`) |
| `/api/auth/logout` | POST | Clears the session cookie |
| `/api/auth/check` | GET | Returns the current session state |

### Admin pages (session required)

`/admin`, `/admin/login`, `/admin/carta`, `/admin/pedidos`, `/admin/pedidos/[id]`, `/admin/config`

### Admin APIs (session required; `PUT`/`POST`/`DELETE` only for mutations)

`/api/admin/stats`, `/api/admin/config`, `/api/admin/categories[/<id>]`, `/api/admin/products[/<id>]`, `/api/admin/products/<id>/combo`, `/api/admin/extras[/<id>]`, `/api/admin/promotions[/<id>]`, `/api/admin/orders[<id>]`, `/api/admin/orders/<id>/proof`, `/api/admin/images`

---

## 4. Site Map

```
/                      Home + digital menu (filters + sticky tabs)
├── /producto/<slug>   Product detail (one per catalog item)
├── /pagar             Checkout
├── /pedido/<uuid>     Order tracking
├── /contacto          Contact & hours
└── /admin             Admin panel (protected; logo login + sticky hamburger header)
```

### Catalog slugs (source of truth: D1 `chill-menu`)

**Categories**

| Slug | Name |
|---|---|
| `hamburguesas` | Hamburguesas |
| `papas-guarniciones` | Papas y guarniciones |
| `bebidas` | Bebidas |

**Products**

| Slug | Name | Category | Price (ARS) |
|---|---|---|---|
| `cheeseburger` | CHEESEBURGER | hamburguesas | $14.000 |
| `oklahoma-tasty` | OKLAHOMA TASTY | hamburguesas | $14.000 |
| `bacon-cheddar-crispy` | BACON CHEDDAR CRISPY | hamburguesas | $14.000 |
| `biggie` | BIGGIE | hamburguesas | $14.000 |
| `cebocheta-smoke` | CEBOCHETA SMOKE | hamburguesas | $14.000 |
| `blue-cream` | BLUE CREAM | hamburguesas | $14.000 |
| `nuggets` | NUGGETS (Porción de 10) | papas-guarniciones | $14.000 |
| `aros-de-cebolla` | AROS DE CEBOLLA (Porción de 10) | papas-guarniciones | $14.000 |
| `coca-cola` | Coca Cola | bebidas | $5.000 |
| `mirinda` | Mirinda | bebidas | $5.000 |
| `7up` | 7up | bebidas | $5.000 |

---

## 5. Migrations (D1)

Database id: `f7e04d5c-8119-4dd6-9bc0-0fa9b9b6eff1` (name `chill-menu`), applied on **local** and **remote** environments.

| File | Contents |
|---|---|
| `001_init.sql` | `categories`, `products`, `extras`, `combos`, `orders`, `order_items`, `promotions`, `config`, `users` |
| `002_indexes.sql` | Lookup indexes (slug, category, visible/orden, order status) |
| `003_seed_demo.sql` | Demo rows |
| `004_analyze.sql` | `EXPLAIN QUERY PLAN` checks for the hot queries |
| `005_real_menu.sql` | Real Chill Burguer Grill catalog (categories + products + extras) |
| `006_extras_groups.sql` | `extras.group_id`, `extras.is_required`, `extras.max_selection` (modifier groups) |

Apply them with:

```bash
node scripts/migrate.mjs --local    # local D1 (.wrangler/state)
node scripts/migrate.mjs --remote   # production D1
```

`migrate.mjs` reads `migrations/*.sql` sorted and runs `wrangler d1 execute chill-menu --file <file>` for each one.

---

## 6. Protocols & Connectivity

| Resource | Protocol | Binding | Access from code |
|---|---|---|---|
| D1 database | SQL (driver over the Workers binding) | `DB` | `Astro.locals.runtime.env.DB` → all queries go through `src/lib/d1.ts` |
| R2 bucket (`chillburguergrill-images`) | S3-compatible API | `IMAGES` | Payment proofs and catalog images served through `/media/*` and admin APIs |
| KV namespace (`SESSION`) | Workers KV API | `SESSION` | JWT session + Astro sessions |
| MercadoPago | HTTPS REST + webhook | env secret `MP_ACCESS_TOKEN` | `src/lib/mp.ts`, `src/pages/api/webhooks/mercadopago.ts` |
| Turnstile siteverify Worker | HTTPS JSON proxy | — | `src/lib/turnstile.ts` (sitekey + Worker URL; master switch `TURNSTILE_ENABLED`) |

- **Topology:** Cloudflare Edge (Pages Worker) → D1 / R2 / KV through internal bindings (no public network hop).
- **Public traffic:** HTTPS only; the admin session cookie is `Secure`, `HttpOnly`, `SameSite=Lax`.
- **WhatsApp / Instagram / Google Maps:** external HTTPS links (`wa.me`, `instagram.com`, `maps.app.goo.gl`).

---

## 7. Requirements

- **Node.js** 24 (CI) — 22 LTS also works locally.
- **npm** 10+ with the committed `frontend/package-lock.json` (`npm ci`).
- **Wrangler** 4.x (installed as a devDependency).
- **Cloudflare account** with Pages project `chillburgergrill`, D1 `chill-menu`, KV `SESSION`, R2 `chillburguergrill-images`, and the Turnstile siteverify Worker.
- **GitHub repository** (`selvaggiesteban/chillburgergrill`) with the `CLOUDFLARE_API_TOKEN` secret (Pages Edit + Account Analytics Read + Account Settings Read).
- **Pages project secrets:** `JWT_SECRET`, `MP_ACCESS_TOKEN` (set), `EMAIL_API_TOKEN` (pending — required for order emails).

### Local development

```bash
cd frontend
npm ci                       # install exactly from the lockfile
node scripts/migrate.mjs --local
npm run dev                  # http://localhost:4321
npx tsc --noEmit             # typecheck (same command as CI)
npm run build                # outputs dist/
node scripts/build-brand-assets.mjs   # regenerate logo, favicons and menu photos
```

Local admin: `admin@chill.local` / `chill-dev-2026`.

---

## 8. SEO & Web Standards

- **Canonical URL:** `https://chillburgergrill.pages.dev/` (set in `astro.config.mjs` → `site`, used for canonical, Open Graph and JSON-LD).
- **Sitemap:** generated by `src/pages/sitemap.xml.ts` from the visible products (home, contact, one entry per product).
- **robots.txt:** allows public browsing; disallows `/admin`, `/api`, `/pagar`, `/pedido`.

- **Meta tags:** title + description per page, `og:site_name` (Chill Burguer Grill), `og:type` (website), `og:locale` (es_AR), `og:image` (`/images/og.png`, 1200x630), `twitter:card`.
- **Structured data:** JSON-LD `Restaurant` with `name`, `telephone` (`+5491171548466`), `address` (Chaco 1512, B1824 Lanús), `servesCuisine`, `openingHoursSpecification`, `url`, `image`.
- **HTML:** semantic landmarks (`header`, `main`, `nav`, `section`, `article`), alt text on every catalog image, `aria-*` on sliders, filters and tabs.

---

## 9. Admin & Deployment

### Admin

- Panel URL: `/admin` — JWT session in the `session_token` cookie, guarded by `middleware.ts` for both pages (`/admin*`) and APIs (`/api/admin*`).
- Mutations require a matching `Origin` header (CSRF protection) and pass through `withValidation()` field validators.
- Config keys editable from `/admin/config`: `contact`, `hours`, `delivery`, `bank`, `notices`.
- Layout: sticky header (`top-0`) with a hamburger menu on mobile; inline navigation from `md` upward. The login page shows only the centered logo.

### CI/CD (`.github/workflows/deploy.yml`)

```
checkout → setup-node 24 (npm cache on frontend/package-lock.json)
        → npm ci
        → npx tsc --noEmit
        → npm run build
        → npx wrangler pages deploy ./dist --project-name=chillburgergrill --branch=main
```

- Triggers: push to `main` and `workflow_dispatch`.
- The deploy step uses the repository secret `CLOUDFLARE_API_TOKEN`.
- Deploys are executed by GitHub Actions via Wrangler. The Pages project is **not** connected to GitHub through the Pages Git integration (`pages_build_output_dir` in `wrangler.jsonc` is inert in this setup).
- `.github/workflows/d1-quota-watch.yml` reports D1 row-read usage so the free-tier quota is not silently exhausted.

### Deployment optimization (edge caching)

`src/middleware.ts` serves public pages from the Cloudflare Cache API:

| Pattern | `s-max-age` |
|---|---|
| `/` | 300 s |
| `/producto/<slug>` | 300 s |
| `/contacto` | 3600 s |
| `/sitemap.xml` | 3600 s |
| `/api/noticias` | 120 s |
| `/api/pedido/<uuid>` | 30 s |

- Responses carry `X-Cache: HIT | MISS | STALE`.
- **Stale-on-error:** if D1 fails (e.g. quota exhausted) the stale copy is served instead of a 503.
- **Never cached:** `/admin*`, `/pagar*`, `/pedido*`, non-GET methods, and any response with `Set-Cookie`.
- **Cache namespace per deploy:** `vite.define.__BUILD_ID__` injects `CF_PAGES_COMMIT_SHA`/`GITHUB_SHA` into the cache key, so every deploy starts with a cold cache (no stale HTML after a release).

### Manual deploy (fallback)

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=chillburgergrill --branch=main --commit-dirty=false
```

### Environment flags

| Flag | File | Current value | Effect |
|---|---|---|---|
| `TURNSTILE_ENABLED` | `src/lib/turnstile.ts` | `false` | Renders the Turnstile widget and enforces verification on checkout and admin login when `true` |

---

## 10. Development & Versioning

- **Version:** 1.0.0 (`frontend/package.json`)
- **Languages:** TypeScript 5.x, Astro (server-rendered HTML), React 19 (TSX), Tailwind CSS, SQL (D1 migrations), a little vanilla JS
- **Runtime:** Cloudflare Workers (via `@astrojs/cloudflare`)
- **Version control:** Git, `main` branch, GitHub (`selvaggiesteban/chillburgergrill`)
- **Author:** Esteban Selvaggi

---

Generated with [Claude Code](https://claude.com/claude-code)
