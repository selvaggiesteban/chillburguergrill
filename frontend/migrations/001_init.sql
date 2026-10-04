-- Chill Burguer Grill — esquema inicial (D1 / SQLite)
-- Aplicar en orden: npx wrangler d1 execute chill-menu --local --file=./migrations/001_init.sql

-- ============================================================
-- Administradores
-- ============================================================
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Carta: categorías
-- ============================================================
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  image_url TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  destacada INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Carta: productos (simples y combos)
-- ============================================================
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'simple' CHECK (type IN ('simple', 'combo')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  images TEXT NOT NULL DEFAULT '[]',       -- JSON array de URLs
  cover_index INTEGER NOT NULL DEFAULT 0,  -- índice de la foto portada dentro de images
  disponible INTEGER NOT NULL DEFAULT 1,
  visible INTEGER NOT NULL DEFAULT 1,
  destacado INTEGER NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Extras / agregados (product_id NULL = extra suelto, aplica a cualquier producto)
-- ============================================================
CREATE TABLE extras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Combos: integrantes
-- ============================================================
CREATE TABLE combo_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  combo_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE (combo_id, product_id)
);

-- ============================================================
-- Promociones (producto / categoría / toda la carta)
-- ============================================================
CREATE TABLE promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('product', 'category', 'store')),
  target_id INTEGER,
  discount_pct REAL NOT NULL DEFAULT 0,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Pedidos
-- ============================================================
CREATE TABLE orders (
  id TEXT PRIMARY KEY,                    -- uuid
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('delivery', 'pickup')),
  address TEXT,
  zone TEXT,
  delivery_cost REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mercadopago', 'transfer', 'cash')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'paid', 'rejected', 'refunded')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled')),
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  transfer_proof_key TEXT,                -- R2 key del comprobante subido
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  product_name TEXT NOT NULL,             -- snapshot al momento del pedido
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,               -- ya con extras y promoción aplicados
  subtotal REAL NOT NULL,
  extras_json TEXT NOT NULL DEFAULT '[]'  -- snapshot: [{id,name,price}]
);

-- ============================================================
-- Configuración de la tienda (key → JSON)
-- ============================================================
CREATE TABLE store_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL
);

-- ------------------------------------------------------------
-- Config por defecto
-- ------------------------------------------------------------
INSERT INTO store_config (config_key, config_value) VALUES
  ('contact', '{"phone":"","whatsapp":"","email":"","address":"","instagram":""}'),
  ('hours', '{"mon_to_thu":"","fri_sat":"","sun":""}'),
  ('delivery', '{"zones":[{"name":"Centro","cost":0}],"free_from":0}'),
  ('bank', '{"alias":"","cbu":"","titular":""}'),
  ('payments', '{"mercadopago":true,"transfer":true,"cash":true}'),
  ('hero', '{"title":"","subtitle":"","image":""}');
