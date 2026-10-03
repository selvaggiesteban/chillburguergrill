-- Optimización de cuota D1: refresca las estadísticas del query planner
-- para que SQLite elija los índices de 002_indexes.sql (las EXPLAIN QUERY
-- PLAN de los hot paths confirman "USING INDEX / COVERING INDEX").
-- Ver guía: ANALYZE después de crear índices o de cargar datos.
-- npx wrangler d1 execute chill-menu --local --file=./migrations/004_analyze.sql
ANALYZE;
