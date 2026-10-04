# 🍔 Chill Burguer Grill - Full Technical Specification

## 🚀 Feature Matrix & Implementation Status
*Copy-paste ready for Trello/Jira*

### 🏗️ Core Infrastructure & Deployment
- [✅] **Hosting**: Cloudflare Pages (Edge Computing / SSR)
- [✅] **Database**: Cloudflare D1 (Distributed SQL)
- [✅] **Object Storage**: Cloudflare R2 (S3-Compatible for Optimized Assets)
- [✅] **Session Store**: Cloudflare KV (Low-latency Key-Value)
- [✅] **CI/CD Pipeline**: GitHub Actions $\rightarrow$ `wrangler-action` $\rightarrow$ CF Pages
- [✅] **Deployment Optimization**: 
    - [✅] Edge Caching via Cache API
    - [✅] `X-Cache` header implementation
    - [✅] D1 Query Optimization (Minimized round-trips)
    - [✅] Asset optimization for R2 delivery
- [✅] **Runtime**: Node.js 22 LTS

### 🎨 Frontend & UI/UX (Mobile-First)
- [✅] **Framework**: Astro v5 (Island Architecture / Server Output)
- [✅] **UI Logic**: React 19 (Islands)
- [✅] **Styling**: Tailwind CSS v3 (Utility-first)
- [✅] **Hero Carousel**: Native Astro + Slick Carousel (Fixed Hydration Gap)
- [✅] **Urgency Timer**: Dynamic JS Implementation (#F2AB27)
- [✅] **Navigation**: Large Category Cards + Mobile-Responsive Menu
- [✅] **Assets**: Optimized SVG/WebP pipeline

### 🛒 E-commerce & Business Logic
- [✅] **Digital Menu**: Dynamic D1-driven catalog
- [✅] **Shopping Cart**: Client-side state with Server-side validation
- [✅] **Pricing Engine**: Secure server-side totals calculation (`checkout.ts`)
- [✅] **Payment Gateway**: 
    - [✅] MercadoPago API (Preferences & Webhooks)
    - [✅] Direct Transfer (10% Discount Logic)
    - [✅] Cash on Delivery (10% Discount Logic)
- [✅] **Checkout Flow**: Validated order submission and payment initiation

### 🛡️ Administration & Security
- [✅] **Admin Panel**: Dedicated management interface
- [✅] **Route Guards**: `middleware.ts` Edge-level authentication
- [✅] **API Security**: Webhook signature validation (MercadoPago)
- [✅] **Access Control**: Restricted admin routes via CF Workers middleware

---

## 📐 Technical Architecture

### 🗺️ Navigation Map & Routing
| Route | Method | Purpose | Access | Protocol |
| :--- | :--- | :--- | :--- | :--- |
| `/` | GET | Home / Hero Landing | Public | HTTPS |
| `/menu` | GET | Digital Menu / Catalog | Public | HTTPS |
| `/menu#category`| GET | Category-specific filter | Public | HTTPS |
| `/checkout` | POST | Order Validation & Payment | Public | HTTPS |
| `/admin/*` | GET/POST| Store & Order Management | Admin | HTTPS/Auth |
| `/api/webhook/mp`| POST | MercadoPago Notification | System | HTTPS |

### 🗄️ Data Connectivity & Protocols
- **Database (D1)**:
  - **Protocol**: Cloudflare D1 API / SQL.
  - **Migrations**: Managed via `wrangler d1 migrations`.
  - **Connectivity**: `Astro.locals.runtime.env.DB` binding.
- **Storage (R2)**:
  - **Protocol**: S3-Compatible API.
  - **Connectivity**: `IMAGES` binding for direct asset streaming.
- **Sessions (KV)**:
  - **Protocol**: KV REST API.
  - **Connectivity**: `SESSION` binding for edge-state persistence.

### 🌐 SEO, Meta & Web Standards
- **Canonical URL**: `https://chillburguergrill.com`
- **Sitemap**: `/sitemap-index.xml` (Auto-generated via `@astrojs/sitemap`)
- **Open Graph (OG)**:
  - `og:site_name`: Chill Burguer Grill
  - `og:type`: website
  - `og:image`: `/images/og.png`
  - `og:locale`: es_AR
- **SEO Strategy**: 
  - JSON-LD (Restaurant Schema) for Google Rich Snippets.
  - Semantic HTML5 tags.
  - Dynamic Meta descriptions per product category.
- **Robots.txt**:
  - `User-agent: *` $\rightarrow$ `Allow: /`
  - `Sitemap: https://chillburguergrill.com/sitemap-index.xml`

### 📦 Development Specifications
- **Version**: 1.0.0-beta
- **Languages**: TypeScript 5.x, JavaScript (ESNext), HTML5, CSS3
- **Author**: Esteban Selvaggi
- **Deployment**: GitHub Actions $\rightarrow$ `wrangler` $\rightarrow$ Cloudflare Pages Production.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
