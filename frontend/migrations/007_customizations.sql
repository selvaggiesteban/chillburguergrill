-- Personalizaciones de producto: el cliente puede armar la suya o elegir
-- la más popular (flag + ventas). Solo una puede elegirse por pedido.
CREATE TABLE customizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ingredients TEXT NOT NULL DEFAULT '[]',   -- JSON array de ingredientes
  recommended INTEGER NOT NULL DEFAULT 0,   -- flag manual de "la más pedida"
  active INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ventas por personalización: se registra al confirmar el pedido.
ALTER TABLE order_items ADD COLUMN customization_id INTEGER;
