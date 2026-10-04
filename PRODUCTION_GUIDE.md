# 🚀 Production Guide — Chill Burguer Grill

This guide contains the final technical steps to move the project from development to production.

## 1. Infrastructure Setup (Cloudflare)

The project is built on the Cloudflare ecosystem. You need a Cloudflare account and a domain pointed to Cloudflare DNS.

### 🔑 Secrets & Environment Variables
Set these in the Cloudflare Pages dashboard under **Settings > Environment variables**:

| Variable | Description | Source |
|---|---|---|
| `MP_ACCESS_TOKEN` | MercadoPago Access Token | MP Dashboard $\rightarrow$ Your Integration |
| `ADMIN_PASSWORD` | Secure password for /admin | Your choice (Strong) |

### 📦 Cloudflare Resources
Ensure the following resources are created and bound in `wrangler.jsonc`:

1. **D1 Database** (`DB`):
   - Create a database named `chill-menu`.
   - Run all migration files located in `/frontend/migrations` using `wrangler d1 migrations apply chill-menu --remote`.
2. **R2 Bucket** (`IMAGES`):
   - Create a bucket named `chillburguergrill-images`.
   - This bucket stores product images and payment proofs.
3. **KV Namespace** (`SESSION`):
   - Create a KV namespace for Astro session management.

---

## 2. DNS & Domain Configuration

1. **Connect Domain**: In Cloudflare Pages, go to **Custom domains** and add your domain (e.g., `chillburger.com`).
2. **SSL/TLS**: Ensure SSL is set to **Full** or **Full (Strict)**.
3. **R2 Public Access**: 
   - If you want to serve images directly from R2, configure a **Custom Domain** for the bucket in the R2 dashboard.
   - Otherwise, assets are managed via the `IMAGES` binding in the code.

---

## 3. Asset Pipeline (Images)

### Current State
- Product images are stored in `/public/images/menu/products` as `.webp` files.
- The D1 database refers to these filenames.

### Optimization Process
If you add new images:
1. **Convert to WebP**: Use tools like Squoosh or `ffmpeg` to convert `.jpg` to `.webp`.
2. **Naming**: Use kebab-case (e.g., `bacon-cheddar.webp`).
3. **Upload**: Place them in `/public/images/menu/products` and commit the change.

---

## 4. Operational Flow

### 🍔 Product Management
- Access `/admin` $\rightarrow$ Login.
- **MenuManager**: Edit prices, descriptions, and visibility.
- **ConfigEditor**: Update store hours, WhatsApp, and bank details for transfers.

### 📦 Order Management
- **OrderControls**: Track orders from `New` $\rightarrow$ `Confirmed` $\rightarrow$ `Ready` $\rightarrow$ `Delivered`.
- **Payment Proofs**: For "Transfer" payments, the customer uploads a proof. You can verify this in the R2 bucket or the Admin panel.

---

## 5. Verification Checklist
- [ ] Environment variables set in Cloudflare Pages.
- [ ] D1 migrations applied to `--remote`.
- [ ] Custom domain connected and SSL active.
- [ ] `/admin` access verified.
- [ ] Test order placed $\rightarrow$ Checkout $\rightarrow$ Payment $\rightarrow$ Order Detail page.
- [ ] Proof upload tested for transfer payments.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
