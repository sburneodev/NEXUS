-- ============================================================
--  LevelUp Nexus ERP — V7__ubicaciones_zona.sql (Flyway)
--  Cambia el modelo de almacén de 1:1 a 1:N (zona compartida).
--
--  Antes: cada ubicación solo podía tener un producto (UNIQUE).
--  Después: una zona puede contener varios productos/títulos,
--           lo que refleja la realidad de una tienda de juegos.
--
--  No se modifican ni eliminan datos existentes.
-- ============================================================

-- Eliminar la restricción UNIQUE que forzaba 1 producto por slot.
-- El nombre PostgreSQL autogenerado para columnas UNIQUE inline es
-- {tabla}_{columna}_key → productos_id_ubicacion_key
ALTER TABLE productos
    DROP CONSTRAINT IF EXISTS productos_id_ubicacion_key;
