# 🍔 Chill Burguer Grill - Technical Documentation

## 🚀 Project Status & Feature Matrix
*Ready for Trello import*

### 🛠️ Core Infrastructure
- [✅] **Hosting**: Cloudflare Pages (Server-side Rendering)
- [✅] **Database**: Cloudflare D1 (SQL)
- [✅] **Object Storage**: Cloudflare R2 (Image Optimization)
- [✅] **Session Management**: Cloudflare KV
- [✅] **CI/CD**: GitHub Actions $\rightarrow$ Wrangler $\rightarrow$ CF Pages
- [✅] **Environment**: Node.js 22 LTS

### 🎨 UI/UX & Frontend
- [✅] **Framework**: Astro v5 (output: 'server')
- [✅] **Component Library**: React 19 (Islands Architecture)
- [✅] **Styling**: Tailwind CSS v3
- [✅] **Mobile-First Design**: Responsive layout for mobile ordering
- [✅] **Hero Carousel**: Native Astro + Slick Carousel (Fixed Hydration Gap)
- [✅] **Urgency Timer**: Custom JS implementation (#F2AB27)
- [✅] **Navigation**: Large Category Cards + Mobile Menu

### 🛒 E-commerce Logic
- [✅] **Digital Menu**: Dynamic loading from D1
- [✅] **Shopping Cart**: Client-side state with server-side validation
- [✅] **Pricing Engine**: Server-side calculation to prevent client-side tampering
- [✅] **Payment Methods**: 
  - MercadoPago (API Preferences & Webhooks)
  - Direct Bank Transfer (10% Discount)
  - Cash on Delivery (10% Discount)
- [✅] **Checkout**: Server-side totals validation via `checkout.ts`

### 🛡️ Admin & Backend
- [✅] **Admin Panel**: Protected routes via `middleware.ts`
- [✅] **Route Guards**: Edge-level authentication checks
- [✅] **Edge Caching**: Implementation of Cache API with `X-Cache` headers
- [✅] **Image Pipeline**: R2 Bucket integration for high-res asset delivery

---

## 📐 Technical Specifications

### 🗺️ Navigation Map & Routes
| Route | Method | Description | Access |
| :--- | :--- | :--- | :--- |
| `/` | GET | Landing Page / Home | Public |
| `/menu` | GET | Digital Menu (Categories/Products) | Public |
| `/menu#category` | GET | Filtered category view | Public |
| `/checkout` | POST | Order processing & payment initiation | Public |
| `/admin/*` | GET/POST| Store management & order tracking | Admin |
| `/api/webhook/mp`| POST | MercadoPago payment notification | System |

### 🗄️ Data & Connectivity
- **Database (D1)**:
  - **Migrations**: SQL-based schema versioning via `wrangler d1 migrations`.
  - **Protocol**: HTTPS / Cloudflare Tunnel.
  - **Connectivity**: D1 Binding $\rightarrow$ `Astro.locals.runtime.env.DB`.
- **Storage (R2)**:
  - **Protocol**: S3-Compatible API.
  - **Binding**: `IMAGES` binding for direct access.
- **KV**:
  - **Purpose**: Session persistence and temporary configuration.

### 🌐 SEO & Web Standards
- **Canonical URL**: `https://chillburguergrill.com`
- **Sitemap**: `/sitemap-index.xml` (Generated via `@astrojs/sitemap`)
- **Meta Tags (Open Graph)**:
  - `og:site_name`: Chill Burguer Grill
  - `og:type`: website
  - `og:image`: `/images/og.png`
  - `og:locale`: es_AR
- **Robots.txt**: 
  - `User-agent: *` $\rightarrow$ `Allow: /`
  - `Sitemap: https://chillburguergrill.com/sitemap-index.xml`
- **SEO Strategy**: Semantic HTML5, JSON-LD (Restaurant Schema), and dynamic meta tags per page.

### 📦 Versioning & Development
- **Version**: 1.0.0-beta
- **Languages**: TypeScript 5.x, JavaScript (ESNext), HTML5, CSS3
- **Author**: Esteban Selvaggi
- **Deployment Protocol**: GitHub Actions $\rightarrow$ `wrangler-action` $\rightarrow$ Cloudflare Pages Production.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
