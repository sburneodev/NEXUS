-- ============================================================
--  LevelUp Nexus ERP — V4__add_warehouse_locations.sql (Flyway)
--  Se ejecuta automáticamente después de V3.
--  Asigna id_ubicacion a los 15 productos principales del seed.
--  Versión: v1.2.0
--  ─────────────────────────────────────────────────────────
--  NOTA: Los productos ya vienen con id_ubicacion asignado
--  desde V3 via JOIN con ubicaciones_almacen. Esta migración
--  existe como punto de extensión explícito para añadir
--  ubicaciones a productos nuevos o reubicar existentes.
--  Si en el futuro se añaden productos sin ubicación en el
--  seed, aquí es donde se asignan de forma versionada.
-- ============================================================

-- ── VERIFICACIÓN: productos sin ubicación asignada ───────────
-- Este SELECT sirve como comprobación manual (comentar en producción).
-- SELECT sku, nombre FROM productos WHERE id_ubicacion IS NULL AND activo = TRUE;


-- ── ASIGNACIÓN EXPLÍCITA DE UBICACIONES ──────────────────────
-- Usamos UPDATE con subquery por SKU y coordenadas (sin IDs hardcodeados).
-- Si el producto ya tiene ubicación desde el seed, ON CONFLICT en V3
-- garantiza que no hay duplicado: el UPDATE actúa como idempotente porque
-- asigna el mismo valor que ya tiene.

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P1' AND ub.estanteria='A' AND ub.nivel=1
)
WHERE sku = 'STD-PS5-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P1' AND ub.estanteria='A' AND ub.nivel=2
)
WHERE sku = 'STD-PS5-002' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P1' AND ub.estanteria='B' AND ub.nivel=1
)
WHERE sku = 'STD-NSW-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P1' AND ub.estanteria='B' AND ub.nivel=2
)
WHERE sku = 'STD-XBX-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P1' AND ub.estanteria='C' AND ub.nivel=1
)
WHERE sku = 'STD-NSW-002' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P2' AND ub.estanteria='A' AND ub.nivel=1
)
WHERE sku = 'STD-FNK-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P2' AND ub.estanteria='A' AND ub.nivel=2
)
WHERE sku = 'STD-FNK-002' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P2' AND ub.estanteria='B' AND ub.nivel=1
)
WHERE sku = 'STD-RPA-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P2' AND ub.estanteria='C' AND ub.nivel=1
)
WHERE sku = 'STD-ACC-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P3' AND ub.estanteria='A' AND ub.nivel=1
)
WHERE sku = 'STD-ACC-002' AND id_ubicacion IS NULL;

-- Productos RETRO — La Bóveda (pasillos P4-P7)
UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P4' AND ub.estanteria='A' AND ub.nivel=1
)
WHERE sku = 'RET-SNES-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P4' AND ub.estanteria='A' AND ub.nivel=2
)
WHERE sku = 'RET-SNES-002' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P4' AND ub.estanteria='B' AND ub.nivel=1
)
WHERE sku = 'RET-GB-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P4' AND ub.estanteria='C' AND ub.nivel=1
)
WHERE sku = 'RET-MD-001' AND id_ubicacion IS NULL;

UPDATE productos
SET id_ubicacion = (
    SELECT ub.id FROM ubicaciones_almacen ub
    WHERE ub.pasillo='P5' AND ub.estanteria='A' AND ub.nivel=1
)
WHERE sku = 'RET-NES-001' AND id_ubicacion IS NULL;

-- ── VERIFICACIÓN FINAL ────────────────────────────────────────
-- Ejecutar manualmente para comprobar el resultado:
-- SELECT p.sku, p.nombre, u.pasillo, u.estanteria, u.nivel
-- FROM productos p
-- LEFT JOIN ubicaciones_almacen u ON u.id = p.id_ubicacion
-- ORDER BY p.tipo_producto, u.pasillo, u.estanteria, u.nivel;