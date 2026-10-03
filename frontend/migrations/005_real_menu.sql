-- Carta real de Chill Burguer Grill + configuración de contacto/horarios/delivery.
-- Reemplaza el seed de demostración (003) por los datos definitivos.

-- ------------------------------------------------------------
-- Limpieza del seed
-- ------------------------------------------------------------
DELETE FROM promotions;
DELETE FROM combo_items;
DELETE FROM extras;
DELETE FROM products;
DELETE FROM categories;

-- ------------------------------------------------------------
-- Categorías
-- ------------------------------------------------------------
INSERT INTO categories (id, name, slug, description, orden, visible, destacada) VALUES
  (1, 'Hamburguesas',           'hamburguesas',      '', 1, 1, 1),
  (2, 'Papas y guarniciones',   'papas-guarniciones', '', 2, 1, 1),
  (3, 'Bebidas',                'bebidas',           '', 3, 1, 0);

-- ------------------------------------------------------------
-- Productos (hamburguesas y entradas: $14.000 · bebidas: $5.000)
-- ------------------------------------------------------------
INSERT INTO products (id, category_id, type, name, slug, description, price, images, cover_index, disponible, visible, destacado, orden) VALUES
  (1, 1, 'simple', 'CHEESEBURGER',            'cheeseburger',
          'Pan Brioche, Carne Smash, Doble Cheddar',
          14000, '["/images/menu/products/cheeseburger.webp"]', 0, 1, 1, 1, 1),
  (2, 1, 'simple', 'OKLAHOMA TASTY',          'oklahoma-tasty',
          'Pan Brioche, Carne con Cebolla Smash, Doble Cheddar, Salsa Tasty',
          14000, '["/images/menu/products/oklahoma-tasty.webp"]', 0, 1, 1, 1, 2),
  (3, 1, 'simple', 'BACON CHEDDAR CRISPY',    'bacon-cheddar-crispy',
          'Pan Brioche, Carne Smash, Doble Cheddar, Bacon, Cebolla Crispy, Barbacoa',
          14000, '["/images/menu/products/bacon-cheddar-crispy.webp"]', 0, 1, 1, 1, 3),
  (4, 1, 'simple', 'BIGGIE',                  'biggie',
          'Pan Brioche, Carne Smash, Lechuga, Tomate, Queso Cheddar, Salsa Big',
          14000, '["/images/menu/products/biggie.webp"]', 0, 1, 1, 1, 4),
  (5, 1, 'simple', 'CEBOCHETA SMOKE',         'cebocheta-smoke',
          'Pan Brioche, Carne Smash, Doble Cheddar, Panceta, Aros de Cebolla (x4), Mayonesa Ahumada',
          14000, '["/images/menu/products/cebocheta-smoke.webp"]', 0, 1, 1, 1, 5),
  (6, 1, 'simple', 'BLUE CREAM',              'blue-cream',
          'Pan Pretzel, Carne Smash, Queso Azul, Cebolla Caramelizada, Honey Mustard',
          14000, '["/images/menu/products/blue-cream.webp"]', 0, 1, 1, 1, 6),
  (7, 2, 'simple', 'NUGGETS (Porción de 10)', 'nuggets',
          'Incluye salsas.',
          14000, '["/images/menu/products/nuggets.webp"]', 0, 1, 1, 1, 1),
  (8, 2, 'simple', 'AROS DE CEBOLLA (Porción de 10)', 'aros-de-cebolla',
          'Incluye salsas.',
          14000, '["/images/menu/products/aros-de-cebolla.webp"]', 0, 1, 1, 1, 2),
  (9,  3, 'simple', 'Coca Cola', 'coca-cola', '', 5000, '["/images/menu/bebidas.svg"]', 0, 1, 1, 0, 1),
  (10, 3, 'simple', 'Mirinda',   'mirinda',   '', 5000, '["/images/menu/bebidas.svg"]', 0, 1, 1, 0, 2),
  (11, 3, 'simple', '7up',       '7up',       '', 5000, '["/images/menu/bebidas.svg"]', 0, 1, 1, 0, 3);

-- ------------------------------------------------------------
-- Configuración
-- ------------------------------------------------------------
INSERT INTO store_config (config_key, config_value) VALUES
  ('contact',
   '{"phone":"11 7154 8466","whatsapp":"11 7154 8466","email":"chil.burgergrill@gmail.com","address":"Chaco 1512, B1824 Lanús, Provincia de Buenos Aires, Argentina","address_url":"https://maps.app.goo.gl/AayAiaBRG7WUgDsU6","instagram":"@chill.burgergrill"}'),
  ('hours',
   '{"days":{"mon":{"closed":true,"open":"20:00","close":"23:50"},"tue":{"closed":true,"open":"20:00","close":"23:50"},"wed":{"closed":true,"open":"20:00","close":"23:50"},"thu":{"closed":false,"open":"20:00","close":"23:50"},"fri":{"closed":false,"open":"20:00","close":"23:50"},"sat":{"closed":false,"open":"20:00","close":"23:50"},"sun":{"closed":false,"open":"20:00","close":"23:50"}}}'),
  ('delivery',
   '{"zones":[{"name":"Valentín Alsina","cost":10000},{"name":"Gerli","cost":10000},{"name":"Piñeyro","cost":10000},{"name":"Avellaneda","cost":10000}],"free_from":0}'),
  ('bank',
   '{"alias":"","cbu":"1430001713016878180014","titular":"Franco Ignacio Portillo"}')
ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value;

ANALYZE;
