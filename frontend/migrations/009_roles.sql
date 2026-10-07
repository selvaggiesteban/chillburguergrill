-- 009: Roles de admins (idempotente: migrate.mjs re-ejecuta todo el historial).
-- Roles de la tienda: administrador, gestor de la tienda, cliente.

CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY,
  description TEXT
);

INSERT OR IGNORE INTO roles (name, description) VALUES
  ('administrador', 'Acceso total al panel y la configuración de la tienda'),
  ('gestor de la tienda', 'Gestión de pedidos, carta y promociones'),
  ('cliente', 'Cliente de la tienda (pedidos)');

CREATE TABLE IF NOT EXISTS admin_roles (
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  role TEXT NOT NULL REFERENCES roles(name),
  PRIMARY KEY (admin_id, role)
);

-- Los admins existentes quedan como administradores.
INSERT OR IGNORE INTO admin_roles (admin_id, role)
SELECT a.id, 'administrador'
FROM admins a
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles ar WHERE ar.admin_id = a.id
);
