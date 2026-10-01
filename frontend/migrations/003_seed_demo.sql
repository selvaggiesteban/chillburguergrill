-- Datos de demostración: categorías, productos de ejemplo y extras.
-- Reemplazar con la carta real cuando se reciban los assets (Fase 7).
-- npx wrangler d1 execute chill-menu --local --file=./migrations/003_seed_demo.sql

-- ------------------------------------------------------------
-- Categorías
-- ------------------------------------------------------------
INSERT INTO categories (id, name, slug, description, orden, visible, destacada) VALUES
  (1, 'Hamburguesas',    'hamburguesas',    'Hechas a la parrilla, con carne al gusto', 1, 1, 1),
  (2, 'Combos',          'combos',          'Hamburguesa + acompañamiento + bebida',    2, 1, 1),
  (3, 'Papas y guarniciones', 'papas-guarniciones', 'Para compartir o acompañar',        3, 1, 0),
  (4, 'Bebidas',         'bebidas',         'Gaseosas, jugos y agua',                  4, 1, 0),
  (5, 'Postres',         'postres',         'El toque dulce final',                    5, 1, 0);

-- ------------------------------------------------------------
-- Productos de ejemplo
-- ------------------------------------------------------------
INSERT INTO products (id, category_id, type, name, slug, description, price, images, cover_index, disponible, visible, destacado, orden) VALUES
  (1, 1, 'simple', 'Chill Clásica',    'chill-clasica',
    'Doble medallón de carne, cheddar, lechuga, tomate y salsa de la casa en pan brioche.',
    6500, '["/images/menu/placeholder.svg"]', 0, 1, 1, 1, 1),
  (2, 1, 'simple', 'Chill Bacon',      'chill-bacon',
    'Carne, doble bacon crocante, cheddar, cebolla caramelizada y BBQ.',
    7200, '["/images/menu/placeholder.svg"]', 0, 1, 1, 1, 2),
  (3, 1, 'simple', 'Chill Smash',      'chill-smash',
    'Dos smash patties, queso americano, pepinillos y salsa especial.',
    7000, '["/images/menu/placeholder.svg"]', 0, 1, 1, 0, 3),
  (4, 3, 'simple', 'Papas fritas',     'papas-fritas',
    'Papas cortadas a mano con sal y pimentón.',
    3500, '["/images/menu/placeholder.svg"]', 0, 1, 1, 0, 1),
  (5, 3, 'simple', 'Papas con cheddar', 'papas-cheddar',
    'Papas fritas cubiertas con cheddar cremoso y cebollín.',
    4500, '["/images/menu/placeholder.svg"]', 0, 1, 1, 0, 2),
  (6, 4, 'simple', 'Gaseosa 500ml',    'gaseosa-500',
    'Elegí tu sabor favorito.',
    2200, '["/images/menu/placeholder.svg"]', 0, 1, 1, 0, 1),
  (7, 5, 'simple', 'Brownie con helado', 'brownie-helado',
    'Brownie tibio con helado de vainilla.',
    4200, '["/images/menu/placeholder.svg"]', 0, 1, 1, 0, 1),
  (8, 2, 'combo',  'Combo Chill',      'combo-chill',
    'Chill Clásica + papas fritas + gaseosa.',
    10500, '["/images/menu/placeholder.svg"]', 0, 1, 1, 1, 1);

-- ------------------------------------------------------------
-- Integrantes del combo de ejemplo
-- ------------------------------------------------------------
INSERT INTO combo_items (combo_id, product_id, quantity) VALUES
  (8, 1, 1),
  (8, 4, 1),
  (8, 6, 1);

-- ------------------------------------------------------------
-- Extras sueltos (disponibles para cualquier producto)
-- ------------------------------------------------------------
INSERT INTO extras (product_id, name, price, active, orden) VALUES
  (NULL, 'Queso extra',        800, 1, 1),
  (NULL, 'Bacon extra',        1200, 1, 2),
  (NULL, 'Sin cebolla',        0, 1, 3),
  (NULL, 'Punto de cocción: bien cocida', 0, 1, 4);

-- ------------------------------------------------------------
-- Promoción de ejemplo (inactiva; activarla desde el panel)
-- ------------------------------------------------------------
INSERT INTO promotions (name, scope, target_id, discount_pct, start_at, end_at, active) VALUES
  ('10% off de bienvenida', 'store', NULL, 10, NULL, NULL, 0);
