-- Personalización popular por defecto para cada hamburguesa (receta completa).
INSERT INTO customizations (product_id, name, ingredients, recommended, orden)
SELECT id, 'La más pedida', '["Pan Brioche","Carne Smash","Doble Cheddar"]', 1, 0
FROM products WHERE slug = 'cheeseburger';

INSERT INTO customizations (product_id, name, ingredients, recommended, orden)
SELECT id, 'La más pedida', '["Pan Brioche","Carne con Cebolla Smash","Doble Cheddar","Salsa Tasty"]', 1, 0
FROM products WHERE slug = 'oklahoma-tasty';

INSERT INTO customizations (product_id, name, ingredients, recommended, orden)
SELECT id, 'La más pedida', '["Pan Brioche","Carne Smash","Doble Cheddar","Bacon","Cebolla Crispy","Barbacoa"]', 1, 0
FROM products WHERE slug = 'bacon-cheddar-crispy';

INSERT INTO customizations (product_id, name, ingredients, recommended, orden)
SELECT id, 'La más pedida', '["Pan Brioche","Carne Smash","Lechuga","Tomate","Queso Cheddar","Salsa Big"]', 1, 0
FROM products WHERE slug = 'biggie';

INSERT INTO customizations (product_id, name, ingredients, recommended, orden)
SELECT id, 'La más pedida', '["Pan Brioche","Carne Smash","Doble Cheddar","Panceta","Aros de Cebolla (x4)","Mayonesa Ahumada"]', 1, 0
FROM products WHERE slug = 'cebocheta-smoke';

INSERT INTO customizations (product_id, name, ingredients, recommended, orden)
SELECT id, 'La más pedida', '["Pan Pretzel","Carne Smash","Queso Azul","Cebolla Caramelizada","Honey Mustard"]', 1, 0
FROM products WHERE slug = 'blue-cream';

-- Opción de combinación para las entradas (aparece en "Selecciona tu adicional").
INSERT INTO extras (product_id, name, price, active, orden, group_id, is_required, max_selection)
SELECT id, '5 Nuggets + 5 Aros de cebolla', 14000, 1, 0, 'adicionales', 0, 1
FROM products WHERE slug = 'nuggets';

INSERT INTO extras (product_id, name, price, active, orden, group_id, is_required, max_selection)
SELECT id, '5 Nuggets + 5 Aros de cebolla', 14000, 1, 0, 'adicionales', 0, 1
FROM products WHERE slug = 'aros-de-cebolla';
