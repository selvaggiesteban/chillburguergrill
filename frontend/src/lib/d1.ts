/**
 * Capa de datos tipada para D1 (patrón de lanuscomputacion).
 *
 * Reglas:
 * - Todas las queries pasan por acá (una sola fuente de verdad).
 * - Siempre parametrizado: prepare(...).bind(...) — nunca interpolación de valores.
 * - Defaults defensivos: results ?? [] / first ?? null.
 * - Escrituras multi-tabla con DB.batch() (atómicas).
 * - Window count (COUNT(*) OVER()) para listados: filas + total en una sola pasada.
 * - Guards de IN vacío para no armar cláusulas inválidas.
 */

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  orden: number;
  visible: number;
  destacada: number;
  created_at?: string;
};

export type Product = {
  id: number;
  category_id: number;
  type: 'simple' | 'combo';
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string;
  cover_index: number;
  disponible: number;
  visible: number;
  destacado: number;
  orden: number;
  created_at?: string;
};

export type ProductRow = Product & { total_count?: number };

export type Extra = {
  id: number;
  product_id: number | null;
  name: string;
  price: number;
  active: number;
  orden: number;
};

export type ComboItem = {
  id: number;
  combo_id: number;
  product_id: number;
  quantity: number;
};

export type Promotion = {
  id: number;
  name: string;
  scope: 'product' | 'category' | 'store';
  target_id: number | null;
  discount_pct: number;
  start_at: string | null;
  end_at: string | null;
  active: number;
  created_at?: string;
};

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';
export type PaymentMethod = 'mercadopago' | 'transfer' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'rejected' | 'refunded';

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfillment: 'delivery' | 'pickup';
  address: string | null;
  zone: string | null;
  delivery_cost: number;
  subtotal: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  transfer_proof_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  order_id: string;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  extras_json: string;
};

export type OrderItemInput = {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  extras_json: string;
};

export type OrderInput = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfillment: 'delivery' | 'pickup';
  address: string | null;
  zone: string | null;
  delivery_cost: number;
  subtotal: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  mp_preference_id?: string | null;
  notes?: string | null;
};

type DB = D1Database;

const inClause = (n: number) => Array.from({ length: n }, () => '?').join(', ');

// ============================================================
// Categorías
// ============================================================

export async function listCategories(db: DB, opts?: { includeHidden?: boolean }): Promise<Category[]> {
  const where = opts?.includeHidden ? '' : 'WHERE visible = 1';
  const { results } = await db
    .prepare(`SELECT * FROM categories ${where} ORDER BY orden ASC, id ASC`)
    .all<Category>();
  return results ?? [];
}

export async function getCategoryById(db: DB, id: number): Promise<Category | null> {
  return db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>();
}

export async function getCategoryBySlug(db: DB, slug: string): Promise<Category | null> {
  return db.prepare('SELECT * FROM categories WHERE slug = ?').bind(slug).first<Category>();
}

export async function createCategory(
  db: DB,
  data: { name: string; slug: string; description?: string; image_url?: string | null; orden?: number; visible?: number; destacada?: number }
): Promise<number> {
  const { meta } = await db
    .prepare(
      `INSERT INTO categories (name, slug, description, image_url, orden, visible, destacada)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.name,
      data.slug,
      data.description ?? '',
      data.image_url ?? null,
      data.orden ?? 0,
      data.visible ?? 1,
      data.destacada ?? 0
    )
    .run();
  return meta.last_row_id;
}

const CATEGORY_FIELDS = ['name', 'slug', 'description', 'image_url', 'orden', 'visible', 'destacada'] as const;

export async function updateCategory(db: DB, id: number, patch: Partial<Record<(typeof CATEGORY_FIELDS)[number], unknown>>): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const field of CATEGORY_FIELDS) {
    if (field in patch) {
      sets.push(`${field} = ?`);
      binds.push(patch[field]);
    }
  }
  if (sets.length === 0) return;
  binds.push(id);
  await db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
}

export async function deleteCategory(db: DB, id: number): Promise<void> {
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
}

// ============================================================
// Productos
// ============================================================

export type ListProductsOptions = {
  categoryId?: number;
  search?: string;
  includeHidden?: boolean;
  destacadosOnly?: boolean;
  type?: 'simple' | 'combo';
  limit?: number;
  offset?: number;
  /**
   * `COUNT(*) OVER()` obliga a SQLite a materializar TODAS las filas que
   * cumplen el WHERE (aunque haya LIMIT) + un temp B-tree para ordenar.
   * Solo pedirlo cuando el paginado admin necesita el total: en la carta
   * pública se evita leer filas de más.
   */
  withTotal?: boolean;
};

export async function listProducts(db: DB, opts?: ListProductsOptions): Promise<{ rows: ProductRow[]; total: number }> {
  const conditions: string[] = [];
  const binds: unknown[] = [];

  if (!opts?.includeHidden) conditions.push('visible = 1');
  if (opts?.categoryId) {
    conditions.push('category_id = ?');
    binds.push(opts.categoryId);
  }
  if (opts?.destacadosOnly) conditions.push('destacado = 1');
  if (opts?.type) {
    conditions.push('type = ?');
    binds.push(opts.type);
  }
  if (opts?.search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    const like = `%${opts.search}%`;
    binds.push(like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(opts?.limit ?? 100, 500);
  const offset = opts?.offset ?? 0;
  const totalExpr = opts?.withTotal ? ', COUNT(*) OVER() AS total_count' : '';

  const { results } = await db
    .prepare(
      `SELECT *${totalExpr}
       FROM products ${where}
       ORDER BY orden ASC, id ASC
       LIMIT ? OFFSET ?`
    )
    .bind(...binds, limit, offset)
    .all<ProductRow>();

  const rows = results ?? [];
  return { rows, total: rows[0]?.total_count ?? rows.length };
}

export async function getProductById(db: DB, id: number, opts?: { includeHidden?: boolean }): Promise<Product | null> {
  const sql = opts?.includeHidden
    ? 'SELECT * FROM products WHERE id = ?'
    : 'SELECT * FROM products WHERE id = ? AND visible = 1';
  return db.prepare(sql).bind(id).first<Product>();
}

export async function getProductBySlug(db: DB, slug: string, opts?: { includeHidden?: boolean }): Promise<Product | null> {
  const sql = opts?.includeHidden
    ? 'SELECT * FROM products WHERE slug = ?'
    : 'SELECT * FROM products WHERE slug = ? AND visible = 1';
  return db.prepare(sql).bind(slug).first<Product>();
}

export async function createProduct(
  db: DB,
  data: {
    category_id: number;
    type?: 'simple' | 'combo';
    name: string;
    slug: string;
    description?: string;
    price: number;
    images?: string[];
    cover_index?: number;
    disponible?: number;
    visible?: number;
    destacado?: number;
    orden?: number;
  }
): Promise<number> {
  const { meta } = await db
    .prepare(
      `INSERT INTO products (category_id, type, name, slug, description, price, images, cover_index, disponible, visible, destacado, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.category_id,
      data.type ?? 'simple',
      data.name,
      data.slug,
      data.description ?? '',
      data.price,
      JSON.stringify(data.images ?? []),
      data.cover_index ?? 0,
      data.disponible ?? 1,
      data.visible ?? 1,
      data.destacado ?? 0,
      data.orden ?? 0
    )
    .run();
  return meta.last_row_id;
}

const PRODUCT_FIELDS = ['category_id', 'type', 'name', 'slug', 'description', 'price', 'images', 'cover_index', 'disponible', 'visible', 'destacado', 'orden'] as const;

export async function updateProduct(db: DB, id: number, patch: Partial<Record<(typeof PRODUCT_FIELDS)[number], unknown>>): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const field of PRODUCT_FIELDS) {
    if (field in patch) {
      sets.push(`${field} = ?`);
      binds.push(patch[field]);
    }
  }
  if (sets.length === 0) return;
  binds.push(id);
  await db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
}

export async function deleteProduct(db: DB, id: number): Promise<void> {
  await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
}

/** IDs de productos existentes (para validar los items de un combo). */
export async function getExistingProductIds(db: DB, ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const { results } = await db
    .prepare(`SELECT id FROM products WHERE id IN (${inClause(ids.length)})`)
    .bind(...ids)
    .all<{ id: number }>();
  return new Set((results ?? []).map((r: { id: number }) => r.id));
}

/** Productos por IDs (checkout: se valida todo server-side). */
export async function getProductsByIds(db: DB, ids: number[]): Promise<Map<number, Product>> {
  if (ids.length === 0) return new Map();
  const { results } = await db
    .prepare(`SELECT * FROM products WHERE id IN (${inClause(ids.length)})`)
    .bind(...ids)
    .all<Product>();
  return new Map((results ?? []).map((p) => [p.id, p]));
}

// ============================================================
// Extras
// ============================================================

/** Extras de un producto + extras sueltos globales. */
export async function listExtrasForProduct(db: DB, productId: number): Promise<Extra[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM extras
       WHERE active = 1 AND (product_id IS NULL OR product_id = ?)
       ORDER BY product_id IS NULL DESC, orden ASC, id ASC`
    )
    .bind(productId)
    .all<Extra>();
  return results ?? [];
}

export async function listAllExtras(db: DB): Promise<Extra[]> {
  const { results } = await db
    .prepare('SELECT * FROM extras ORDER BY product_id IS NULL DESC, orden ASC, id ASC')
    .all<Extra>();
  return results ?? [];
}

export type ExtraDetailed = Extra & { product_name: string | null };

/** Todos los extras con el nombre de su producto (panel admin). */
export async function listExtrasDetailed(db: DB): Promise<ExtraDetailed[]> {
  const { results } = await db
    .prepare(
      `SELECT e.*, p.name AS product_name
       FROM extras e
       LEFT JOIN products p ON p.id = e.product_id
       ORDER BY e.product_id IS NULL DESC, e.orden ASC, e.id ASC`
    )
    .all<ExtraDetailed>();
  return results ?? [];
}

export async function getExtrasByIds(db: DB, ids: number[]): Promise<Extra[]> {
  if (ids.length === 0) return [];
  const { results } = await db
    .prepare(`SELECT * FROM extras WHERE id IN (${inClause(ids.length)}) AND active = 1`)
    .bind(...ids)
    .all<Extra>();
  return results ?? [];
}

export async function createExtra(db: DB, data: { product_id: number | null; name: string; price: number; orden?: number }): Promise<number> {
  const { meta } = await db
    .prepare('INSERT INTO extras (product_id, name, price, active, orden) VALUES (?, ?, ?, 1, ?)')
    .bind(data.product_id, data.name, data.price, data.orden ?? 0)
    .run();
  return meta.last_row_id;
}

export async function updateExtra(db: DB, id: number, patch: { name?: string; price?: number; active?: number; orden?: number; product_id?: number | null }): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const field of ['name', 'price', 'active', 'orden', 'product_id'] as const) {
    if (field in patch) {
      sets.push(`${field} = ?`);
      binds.push(patch[field]);
    }
  }
  if (sets.length === 0) return;
  binds.push(id);
  await db.prepare(`UPDATE extras SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
}

export async function deleteExtra(db: DB, id: number): Promise<void> {
  await db.prepare('DELETE FROM extras WHERE id = ?').bind(id).run();
}

// ============================================================
// Combos
// ============================================================

export async function getComboItems(db: DB, comboId: number): Promise<ComboItem[]> {
  const { results } = await db
    .prepare('SELECT * FROM combo_items WHERE combo_id = ? ORDER BY id ASC')
    .bind(comboId)
    .all<ComboItem>();
  return results ?? [];
}

export type ComboItemDetailed = ComboItem & {
  product_name: string;
  product_slug: string;
  product_price: number;
};

/** Items de un combo con los datos del producto (para mostrar "qué incluye"). */
export async function getComboItemsDetailed(db: DB, comboId: number): Promise<ComboItemDetailed[]> {
  const { results } = await db
    .prepare(
      `SELECT ci.*, p.name AS product_name, p.slug AS product_slug, p.price AS product_price
       FROM combo_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.combo_id = ?
       ORDER BY ci.id ASC`
    )
    .bind(comboId)
    .all<ComboItemDetailed>();
  return results ?? [];
}

export async function setComboItems(db: DB, comboId: number, items: { product_id: number; quantity: number }[]): Promise<void> {
  const statements = [db.prepare('DELETE FROM combo_items WHERE combo_id = ?').bind(comboId)];
  for (const item of items) {
    statements.push(
      db.prepare('INSERT INTO combo_items (combo_id, product_id, quantity) VALUES (?, ?, ?)').bind(comboId, item.product_id, item.quantity)
    );
  }
  await db.batch(statements);
}

// ============================================================
// Promociones
// ============================================================

/** Ventana vigente + activas. Se llama con la hora actual del edge. */
export async function getActivePromotions(db: DB, nowIso: string): Promise<Promotion[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM promotions
       WHERE active = 1
         AND (start_at IS NULL OR start_at <= ?)
         AND (end_at IS NULL OR end_at >= ?)
       ORDER BY discount_pct DESC`
    )
    .bind(nowIso, nowIso)
    .all<Promotion>();
  return results ?? [];
}

export async function listPromotions(db: DB): Promise<Promotion[]> {
  const { results } = await db
    .prepare('SELECT * FROM promotions ORDER BY active DESC, created_at DESC')
    .all<Promotion>();
  return results ?? [];
}

export async function createPromotion(
  db: DB,
  data: { name: string; scope: 'product' | 'category' | 'store'; target_id: number | null; discount_pct: number; start_at?: string | null; end_at?: string | null; active?: number }
): Promise<number> {
  const { meta } = await db
    .prepare(
      `INSERT INTO promotions (name, scope, target_id, discount_pct, start_at, end_at, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(data.name, data.scope, data.target_id, data.discount_pct, data.start_at ?? null, data.end_at ?? null, data.active ?? 1)
    .run();
  return meta.last_row_id;
}

export async function updatePromotion(db: DB, id: number, patch: Partial<{ name: string; scope: 'product' | 'category' | 'store'; target_id: number | null; discount_pct: number; start_at: string | null; end_at: string | null; active: number }>): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const field of ['name', 'scope', 'target_id', 'discount_pct', 'start_at', 'end_at', 'active'] as const) {
    if (field in patch) {
      sets.push(`${field} = ?`);
      binds.push(patch[field]);
    }
  }
  if (sets.length === 0) return;
  binds.push(id);
  await db.prepare(`UPDATE promotions SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
}

export async function deletePromotion(db: DB, id: number): Promise<void> {
  await db.prepare('DELETE FROM promotions WHERE id = ?').bind(id).run();
}

/**
 * Mejor descuento aplicable a un producto (en base a las promos vigentes).
 * Devuelve el precio final y el % aplicado (0 si no hay promo).
 */
export function bestPromoFor(
  promos: Promotion[],
  productId: number,
  categoryId: number,
  price: number
): { promoPrice: number; discountPct: number; promoName: string | null } {
  let best = { promoPrice: price, discountPct: 0, promoName: null as string | null };
  for (const p of promos) {
    const applies =
      p.scope === 'store' ||
      (p.scope === 'product' && p.target_id === productId) ||
      (p.scope === 'category' && p.target_id === categoryId);
    if (!applies || p.discount_pct <= 0) continue;
    const promoPrice = Math.round(price * (1 - p.discount_pct / 100));
    if (promoPrice < best.promoPrice) {
      best = { promoPrice, discountPct: p.discount_pct, promoName: p.name };
    }
  }
  return best;
}

// ============================================================
// Pedidos
// ============================================================

export async function createOrder(db: DB, order: OrderInput, items: OrderItemInput[]): Promise<void> {
  const statements = [
    db
      .prepare(
        `INSERT INTO orders (id, customer_name, customer_phone, customer_email, fulfillment, address, zone,
           delivery_cost, subtotal, total, payment_method, payment_status, status, mp_preference_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        order.id,
        order.customer_name,
        order.customer_phone,
        order.customer_email,
        order.fulfillment,
        order.address,
        order.zone,
        order.delivery_cost,
        order.subtotal,
        order.total,
        order.payment_method,
        order.payment_status,
        order.status,
        order.mp_preference_id ?? null,
        order.notes ?? null
      ),
  ];
  for (const item of items) {
    statements.push(
      db
        .prepare(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, extras_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(order.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal, item.extras_json)
    );
  }
  await db.batch(statements);
}

export async function listOrders(
  db: DB,
  opts?: { status?: string; limit?: number; offset?: number }
): Promise<{ rows: (Order & { total_count?: number })[]; total: number }> {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  if (opts?.status) {
    conditions.push('status = ?');
    binds.push(opts.status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(opts?.limit ?? 50, 200);
  const offset = opts?.offset ?? 0;

  // Dos sentencias en UN batch (1 subrequest): las filas usan el índice de
  // orden (LIMIT corto) y el total se resuelve con un COUNT de índice
  // cubriendo solo columnas, en vez de materializar todas las órdenes con
  // COUNT(*) OVER().
  const [rowsRes, countRes] = await db.batch([
    db.prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...binds, limit, offset),
    db.prepare(`SELECT COUNT(*) AS n FROM orders ${where}`).bind(...binds),
  ]);

  const rows = (rowsRes?.results ?? []) as (Order & { total_count?: number })[];
  const total = (countRes?.results as { n: number }[] | undefined)?.[0]?.n ?? rows.length;
  return { rows, total };
}

export async function getOrderById(db: DB, id: string): Promise<Order | null> {
  return db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Order>();
}

export async function getOrderItems(db: DB, orderId: string): Promise<OrderItem[]> {
  const { results } = await db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC')
    .bind(orderId)
    .all<OrderItem>();
  return results ?? [];
}

export async function updateOrderStatus(db: DB, id: string, status: OrderStatus): Promise<void> {
  await db
    .prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(status, id)
    .run();
}

export async function updateOrderPayment(
  db: DB,
  id: string,
  patch: { payment_status?: PaymentStatus; mp_preference_id?: string | null; mp_payment_id?: string | null; status?: OrderStatus }
): Promise<void> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const binds: unknown[] = [];
  for (const field of ['payment_status', 'mp_preference_id', 'mp_payment_id', 'status'] as const) {
    if (field in patch) {
      sets.push(`${field} = ?`);
      binds.push(patch[field]);
    }
  }
  binds.push(id);
  await db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
}

export async function setTransferProof(db: DB, id: string, key: string): Promise<void> {
  await db
    .prepare(`UPDATE orders SET transfer_proof_key = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(key, id)
    .run();
}

/** KPIs del dashboard: una sola query (1 subrequest) con índices cubriendo. */
export async function getDashboardStats(db: DB): Promise<{
  ordersToday: number;
  pendingOrders: number;
  revenueToday: number;
  ordersTotal: number;
}> {
  // date(created_at) = date('now') no es sargable: obligaba a escanear toda
  // la tabla. Con created_at >= datetime('now','start of day') usa
  // idx_orders_created (covering).
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM orders WHERE created_at >= datetime('now', 'start of day')) AS orders_today,
         (SELECT COALESCE(SUM(total), 0) FROM orders
           WHERE created_at >= datetime('now', 'start of day') AND status != 'cancelled') AS revenue_today,
         (SELECT COUNT(*) FROM orders WHERE status IN ('new', 'confirmed', 'preparing')) AS pending,
         (SELECT COUNT(*) FROM orders) AS total`
    )
    .first<{ orders_today: number; revenue_today: number; pending: number; total: number }>();

  return {
    ordersToday: row?.orders_today ?? 0,
    pendingOrders: row?.pending ?? 0,
    revenueToday: row?.revenue_today ?? 0,
    ordersTotal: row?.total ?? 0,
  };
}

// ============================================================
// Configuración de la tienda
// ============================================================

export type DeliveryConfig = {
  zones: { name: string; cost: number }[];
  free_from: number;
};

export type BankConfig = { alias: string; cbu: string; titular: string };

/** Novedad/promo cargada desde el panel (clave `notices` de store_config). */
export type NoticeRow = {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  active?: boolean;
};

export async function getConfig<T>(db: DB, key: string): Promise<T | null> {
  const row = await db.prepare('SELECT config_value FROM store_config WHERE config_key = ?').bind(key).first<{ config_value: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.config_value) as T;
  } catch {
    return null;
  }
}

/**
 * Varias claves en UNA sola query (1 subrequest D1 en vez de N).
 * Cada `.prepare()` aparte consume un subrequest de la invocación.
 */
export async function getConfigs<T extends Record<string, unknown>>(db: DB, keys: string[]): Promise<Partial<T>> {
  const out: Record<string, unknown> = {};
  if (keys.length === 0) return out as Partial<T>;
  const { results } = await db
    .prepare(`SELECT config_key, config_value FROM store_config WHERE config_key IN (${inClause(keys.length)})`)
    .bind(...keys)
    .all<{ config_key: string; config_value: string }>();
  for (const row of results ?? []) {
    try {
      out[row.config_key] = JSON.parse(row.config_value);
    } catch {
      out[row.config_key] = null;
    }
  }
  return out as Partial<T>;
}

export async function getAllConfig(db: DB): Promise<Record<string, unknown>> {
  const { results } = await db.prepare('SELECT config_key, config_value FROM store_config').all<{ config_key: string; config_value: string }>();
  const out: Record<string, unknown> = {};
  for (const row of results ?? []) {
    try {
      out[row.config_key] = JSON.parse(row.config_value);
    } catch {
      out[row.config_key] = null;
    }
  }
  return out;
}

export async function setConfig(db: DB, key: string, value: unknown): Promise<void> {
  await db
    .prepare(
      `INSERT INTO store_config (config_key, config_value) VALUES (?, ?)
       ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value`
    )
    .bind(key, JSON.stringify(value))
    .run();
}
