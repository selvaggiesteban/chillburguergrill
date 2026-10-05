# Chill Burguer Grill — Technical Specification

Online ordering platform for **Chill Burguer Grill** (smash burgers, Lanús, Buenos Aires).

- **Canonical URL:** https://chillburguergrill.pages.dev/
- **Admin panel:** https://chillburguergrill.pages.dev/admin
- **Version:** 1.0.0
- **Author:** Esteban Selvaggi

---

## 1. Feature Matrix

> The ✅ / ❌ / ⚠️ markers are used **only in this section**.

### Platform & Infrastructure
- [✅] Hosting: Cloudflare Pages with Edge SSR (Astro `output: server`)
- [✅] Database: Cloudflare D1 (distributed SQLite)
- [✅] Object storage: Cloudflare R2 (S3-compatible) for order proof images
- [✅] Session storage: Cloudflare KV (`SESSION` binding, JWT cookie)
- [✅] CI/CD: GitHub Actions → `npm ci` → typecheck → build → Wrangler → Pages
- [✅] Cache D1 quota watchdog: `d1-quota-watch.yml` workflow
- [✅] Framework: Astro v5 (server output)
- [✅] UI: React 19 islands (only the interactive parts hydrate)
- [✅] Styling: Tailwind CSS v3, mobile-first responsive layout
- [✅] No client framework on static sections: pure Astro components + vanilla JS

### Storefront
- [✅] Home hero carousel: native Astro component, dependency-free JS autoplay (no jQuery/Slick)
- [✅] Countdown/urgency timer in the hero (custom JS, `#F2AB27`)
- [✅] Digital menu at `/menu`: filters (all / discount / best sellers / lowest price), sticky section tabs, hero card, product rows per section
- [✅] Product detail at `/producto/[slug]`: modifier groups, required/optional selections, quantity, sticky purchase bar
- [✅] Shopping cart: localStorage cart, validated again on the server at checkout
- [✅] Pricing engine: server-side calculation in `lib/checkout.ts` (never trust the client)
- [✅] Promotions engine: product / category / store scope with % discount and date windows
- [✅] Floating WhatsApp button with E.164-normalized `wa.me` link
- [✅] Order status tracking page `/pedido/[id]` (public, no personal data exposed)
- [✅] Notifications bell: order status + news notices with unread badge and 60 s polling
- [✅] Footer removed from the layout (header-only chrome, per design review)
- [❌] Product ratings / reviews: no rating data exists in the catalog
- [❌] Automated tests (unit / e2e): none in this repository

### Ordering & Payments
- [✅] Checkout `/checkout`: delivery or pickup, zone-based delivery cost, free-delivery threshold
- [✅] Payment methods: MercadoPago, direct bank transfer, cash on delivery/pickup
- [✅] 10 % discount on the product subtotal for `transfer` and `cash`
- [✅] MercadoPago preference creation + `POST /api/webhooks/mercadopago` webhook (signature validated)
- [⚠️] MercadoPago runs with a **test/mock access token**: payments are simulated and the order page resolves through `/pedido/{id}?mp=mock` until real credentials are configured
- [✅] Proof-of-payment upload to R2 (`/api/orders/[id]/proof`)
- [❌] Email/SMS notifications to the customer: not implemented (WhatsApp is the contact channel)

### Admin Panel
- [✅] Dashboard with daily stats (`/admin`)
- [✅] Menu management: categories, products, images, combos, extras, ordering (`/admin/carta`)
- [✅] Modifier groups: `group_id`, required flag, max selection (`006_extras_groups.sql`)
- [✅] Orders board with status transitions (`/admin/pedidos`, `/admin/pedidos/[id]`)
- [✅] Promotions CRUD with scope and date windows
- [✅] Site config editor: contact data, opening hours, delivery zones, news notices (`/admin/config`)
- [✅] Security: `middleware.ts` guards on `/admin*` and `/api/admin*`, JWT session, bcrypt password, CSRF origin check on mutations

### SEO, Security & Delivery
- [✅] JSON-LD `Restaurant` schema, Open Graph and Twitter meta tags
- [✅] Dynamic `sitemap.xml` (home, menu, contact, every product) and `robots.txt`
- [✅] Edge cache (Cache API) with `X-Cache: HIT | MISS | STALE` headers and per-deploy build namespace
- [✅] Never cached: `/admin*`, `/checkout*`, `/pedido*`, responses with `Set-Cookie`, non-GET methods
- [✅] Input validation on every admin/checkout endpoint (parameterized SQL only)
- [⚠️] CI deploy to Pages runs only after the `CLOUDFLARE_API_TOKEN` secret is added to the GitHub repository (currently missing → Actions deploy job fails, manual deploy used as fallback)
- [❌] Custom domain: the site is served from `chillburguergrill.pages.dev` (apex domain not configured)

---

## 2. Navigation & Routing (routes + HTTP methods)

### Public pages
| Route | Method | Access | Purpose |
|---|---|---|---|
| `/` | GET | Public | Home: hero carousel, categories, featured products, news |
| `/menu` | GET | Public | Full menu: filters, sticky section tabs, product sliders |
| `/menu#hamburguesas` `#papas-guarniciones` `#bebidas` | GET | Public | Deep link to a menu section |
| `/menu/<slug>` | GET | Public | 308 redirect → `/producto/<slug>` (legacy URLs keep working) |
| `/producto/<slug>` | GET | Public | Product detail with modifier groups and purchase bar |
| `/product/<slug>` | GET | Public | 308 redirect → `/producto/<slug>` (legacy English path) |
| `/contacto` | GET | Public | Contact, address, map, opening hours |
| `/checkout` | GET, POST | Public | Cart review + order submission (POST → `/api/checkout`) |
| `/pedido/<uuid>` | GET | Public | Order status page (no personal data in the payload) |
| `/404` | GET | Public | Not found |
| `/sitemap.xml`, `/robots.txt` | GET | Public | SEO files |

### Public APIs
| Route | Method | Purpose | Edge cache |
|---|---|---|---|
| `/api/checkout` | POST | Create order, price it server-side, create MP preference | — |
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

### Admin APIs (session required, `PUT`/`POST`/`DELETE` only for mutations)
`/api/admin/stats`, `/api/admin/config`, `/api/admin/categories[/<id>]`, `/api/admin/products[/<id>]`, `/api/admin/products/<id>/combo`, `/api/admin/extras[/<id>]`, `/api/admin/promotions[/<id>]`, `/api/admin/orders[/<id>]`, `/api/admin/orders/<id>/proof`

---

## 3. Site Map

```
/                      Home
├── /menu              Digital menu (filters + sticky tabs + sliders)
│   ├── /menu#hamburguesas
│   ├── /menu#papas-guarniciones
│   └── /menu#bebidas
├── /producto/<slug>    Product detail (one per catalog item; /product/<slug> 308-redirects here)
├── /checkout          Checkout
├── /pedido/<uuid>     Order tracking
├── /contacto          Contact & hours
└── /admin             Admin panel (protected)
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

## 4. Migrations (D1)

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

## 5. Protocols & Connectivity

| Resource | Protocol | Binding | Access from code |
|---|---|---|---|
| D1 database | SQL (driver over the Workers binding) | `DB` | `Astro.locals.runtime.env.DB` → all queries go through `src/lib/d1.ts` |
| R2 bucket (`chillburguergrill-images`) | S3-compatible API | `IMAGES` | signed/local URLs for uploaded payment proofs |
| KV namespace (`SESSION`) | Workers KV API | `SESSION` | JWT session + Astro sessions |
| MercadoPago | HTTPS REST + webhook | env secret `MP_ACCESS_TOKEN` | `src/lib/mp.ts`, `src/pages/api/webhooks/mercadopago.ts` |

- **Topology:** Cloudflare Edge (Pages Worker) → D1 / R2 / KV through internal bindings (no public network hop).
- **Public traffic:** HTTPS only; the admin session cookie is `Secure`, `HttpOnly`, `SameSite=Lax`.
- **WhatsApp / Instagram / Google Maps:** external HTTPS links (`wa.me`, `instagram.com`, `maps.app.goo.gl`).

---

## 6. Requirements

- **Node.js** 24 (CI) — 22 LTS also works locally.
- **npm** 10+ with the committed `frontend/package-lock.json` (`npm ci`).
- **Wrangler** 4.x (installed as a devDependency).
- **Cloudflare account** with Pages project `chillburguergrill`, D1 `chill-menu`, KV `SESSION`, R2 `chillburguergrill-images`.
- **GitHub repository** with secrets: `CLOUDFLARE_API_TOKEN` (Pages Edit + Account Analytics Read + Account Settings Read), plus Cloudflare-side `JWT_SECRET` and `MP_ACCESS_TOKEN`.

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

## 7. SEO & Web Standards

- **Canonical URL:** `https://chillburguergrill.pages.dev/` (set in `astro.config.mjs` → `site`, used for canonical, Open Graph and JSON-LD).
- **Sitemap:** `https://chillburguergrill.pages.dev/sitemap.xml` — generated by `src/pages/sitemap.xml.ts` from the visible products (`/`, `/menu`, `/contacto`, `/producto/<slug>` for each product).
- **robots.txt:** `https://chillburguergrill.pages.dev/robots.txt`

  ```
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /api
  Disallow: /checkout
  Disallow: /pedido

  Sitemap: https://chillburguergrill.pages.dev/sitemap.xml
  ```
- **Meta tags:** title + description per page, `og:site_name` (Chill Burguer Grill), `og:type` (website), `og:locale` (es_AR), `og:image` (`/images/og.png`, 1200×630), `twitter:card`.
- **Structured data:** JSON-LD `Restaurant` with `name`, `telephone` (`+5491171548466`), `address` (Chaco 1512, B1824 Lanús), `servesCuisine`, `openingHoursSpecification`, `url`, `image`.
- **HTML:** semantic landmarks (`header`, `main`, `nav`, `section`, `article`, `footer`), alt text on every catalog image, `aria-*` on sliders, filters and tabs.

---

## 8. Admin & Deployment

### Admin
- Panel URL: `/admin` — JWT session in the `session_token` cookie, guarded by `middleware.ts` for both pages (`/admin*`) and APIs (`/api/admin*`).
- Mutations require a matching `Origin` header (CSRF protection) and pass through `withValidation()` field validators.
- Config keys editable from `/admin/config`: `contact`, `hours`, `delivery`, `bank`, `notices`.

### CI/CD (`.github/workflows/deploy.yml`)
```
checkout → setup-node 24 (npm cache on frontend/package-lock.json)
        → npm ci
        → npx tsc --noEmit
        → npm run build
        → npx wrangler pages deploy ./dist --project-name=chillburguergrill --branch=main
```
Triggers: push to `main` and `workflow_dispatch`. The deploy step needs `secrets.CLOUDFLARE_API_TOKEN`.

`.github/workflows/d1-quota-watch.yml` reports D1 row-read usage so the free-tier quota is not silently exhausted.

### Deployment optimization (edge caching)
`src/middleware.ts` serves public pages from the Cloudflare Cache API:

| Pattern | `s-max-age` |
|---|---|
| `/` | 300 s |
| `/menu` | 300 s |
| `/menu/<slug>` (redirect) | 300 s |
| `/producto/<slug>` | 300 s |
| `/product/<slug>` (redirect) | 300 s |
| `/contacto` | 3600 s |
| `/sitemap.xml` | 3600 s |
| `/api/noticias` | 120 s |
| `/api/pedido/<uuid>` | 30 s |

- Responses carry `X-Cache: HIT | MISS | STALE`.
- **Stale-on-error:** if D1 fails (e.g. quota exhausted) the stale copy is served instead of a 503.
- **Never cached:** `/admin*`, `/checkout*`, `/pedido*`, non-GET methods, and any response with `Set-Cookie`.
- **Cache namespace per deploy:** `vite.define.__BUILD_ID__` injects `CF_PAGES_COMMIT_SHA`/`GITHUB_SHA` into the cache key, so every deploy starts with a cold cache (no stale HTML after a release).

Manual deploy (used while the GitHub secret is missing):

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=chillburguergrill --branch=main --commit-dirty=false
```

---

## 9. Development & Versioning

- **Version:** 1.0.0 (`frontend/package.json`)
- **Languages:** TypeScript 5.x, Astro (server-rendered HTML), React 19 (TSX), Tailwind CSS, SQL (D1 migrations), a little vanilla JS
- **Runtime:** Cloudflare Workers (via `@astrojs/cloudflare`)
- **Version control:** Git, `main` branch, GitHub (`selvaggiesteban/chillburguergrill`)
- **Author:** Esteban Selvaggi

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
