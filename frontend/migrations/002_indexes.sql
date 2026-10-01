-- Índices compuestos para los hot paths de la carta y los pedidos.
-- Objetivo: minimizar rows_read en D1 free tier (5M/día).
-- npx wrangler d1 execute chill-menu --local --file=./migrations/002_indexes.sql

-- Carta pública: listado por categoría (visible + orden)
CREATE INDEX IF NOT EXISTS idx_products_category_orden
  ON products(category_id, visible, orden);

-- Carta pública: home / destacados
CREATE INDEX IF NOT EXISTS idx_products_visible_destacado
  ON products(visible, destacado, orden);

-- Listado general de productos en admin
CREATE INDEX IF NOT EXISTS idx_products_visible_orden
  ON products(visible, orden);

-- Categorías visibles en orden
CREATE INDEX IF NOT EXISTS idx_categories_visible_orden
  ON categories(visible, orden);

-- Extras por producto
CREATE INDEX IF NOT EXISTS idx_extras_product
  ON extras(product_id, active, orden);

-- Promos vigentes
CREATE INDEX IF NOT EXISTS idx_promotions_active
  ON promotions(active, start_at, end_at);

-- Pedidos: panel con filtros por estado, más recientes primero
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_created
  ON orders(created_at DESC);

-- Items de un pedido
CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON order_items(order_id);

-- Integrantes de un combo
CREATE INDEX IF NOT EXISTS idx_combo_items_combo
  ON combo_items(combo_id);
