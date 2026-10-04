# 🍔 Chill Burguer Grill - Technical Specification

## 🚀 Feature Matrix
- [✅] Hosting: Cloudflare Pages (Edge SSR)
- [✅] Database: Cloudflare D1 (Distributed SQL)
- [✅] Object Storage: Cloudflare R2 (S3 Compatible)
- [✅] Session Management: Cloudflare KV
- [✅] CI/CD: GitHub Actions $\rightarrow$ Wrangler $\rightarrow$ CF Pages
- [✅] Deployment Optimization: Edge Caching (Cache API), X-Cache Headers, D1 Query Tuning, R2 Asset Stream
- [✅] Framework: Astro v5 (Server Output)
- [✅] UI Library: React 19 (Islands Architecture)
- [✅] Styling: Tailwind CSS v3
- [✅] Mobile-First Layout: Responsive Design
- [✅] Hero Carousel: Native Astro + Slick Carousel (Fixed Hydration)
- [✅] Urgency Timer: Custom JS (#F2AB27)
- [✅] Digital Menu: Dynamic D1 Catalog
- [✅] Shopping Cart: Validated Server-side state
- [✅] Pricing Engine: Secure calculation in `checkout.ts`
- [✅] Payment Gateway: MercadoPago API (Preferences & Webhooks)
- [✅] Payment Methods: Direct Transfer (10% discount), Cash (10% discount)
- [✅] Admin Panel: Management interface
- [✅] Security: `middleware.ts` Route Guards & Webhook validation
- [✅] SEO: JSON-LD Restaurant Schema, Open Graph, robots.txt, sitemap.xml
- [✅] Deployment Admin: wrangler.jsonc configuration, Cloudflare Secret management

## 📐 Technical Details

### 🗺️ Navigation & Routing
- **Home (`/`)**: GET | Public | HTTPS
- **Menu (`/menu`)**: GET | Public | HTTPS
- **Category Filter (`/menu#category`)**: GET | Public | HTTPS
- **Checkout (`/checkout`)**: POST | Public | HTTPS
- **Admin Dashboard (`/admin/*`)**: GET/POST | Admin | HTTPS/Auth
- **MP Webhook (`/api/webhook/mp`)**: POST | System | HTTPS

### 🗄️ Infrastructure & Connectivity
- **Database (D1)**: SQL Protocol | Migrations via `wrangler d1 migrations` | Binding: `Astro.locals.runtime.env.DB`
- **Storage (R2)**: S3 API | Binding: `IMAGES`
- **KV**: REST API | Binding: `SESSION`
- **Connectivity**: Cloudflare Edge Network $\rightarrow$ D1/R2/KV via internal bindings
- **Requirements**: Node.js 22 LTS, Wrangler CLI, Cloudflare Account

### 🌐 SEO & Web Standards
- **Canonical URL**: `https://chillburguergrill.pages.dev/`
- **Sitemap**: `https://chillburguergrill.pages.dev/sitemap-index.xml`
- **Open Graph**: `og:site_name` (Chill Burguer Grill), `og:type` (website), `og:image` (/images/og.png), `og:locale` (es_AR)
- **Robots.txt**: User-agent: * Allow: / | Sitemap: https://chillburguergrill.pages.dev/sitemap-index.xml
- **SEO**: Semantic HTML5, Dynamic Meta-tags per category, JSON-LD Schema.

### 📦 Development & Versioning
- **Version**: 1.0.0-beta
- **Languages**: TypeScript 5.x, JavaScript (ESNext), HTML5, CSS3
- **Author**: Esteban Selvaggi
- **Deployment**: GitHub Actions $\rightarrow$ `wrangler-action` $\rightarrow$ CF Pages Production

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
