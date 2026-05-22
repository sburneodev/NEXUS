-- ============================================================
--  LevelUp Nexus ERP — V2__triggers_audit.sql (Flyway)
--  Se ejecuta automáticamente después de V1.
--  Contiene: funciones PL/pgSQL, triggers y SP ACID.
--  Versión: v1.2.0
-- ============================================================

-- ============================================================
-- SECCIÓN 1 · FUNCIÓN GENÉRICA DE AUDITORÍA
-- ============================================================

-- Un solo bloque PL/pgSQL reutilizable por todos los triggers.
-- TG_TABLE_NAME y TG_OP son variables de sistema de PostgreSQL.
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (tabla, operacion, id_registro, datos_antes, datos_despues)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::TEXT, NULL, to_jsonb(NEW));

    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (tabla, operacion, id_registro, datos_antes, datos_despues)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (tabla, operacion, id_registro, datos_antes, datos_despues)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::TEXT, to_jsonb(OLD), NULL);
    END IF;

    RETURN NULL; -- AFTER trigger: el retorno no afecta la operación original
END;
$$;


-- ============================================================
-- SECCIÓN 2 · FUNCIÓN actualizado_en AUTOMÁTICO
-- ============================================================

-- BEFORE UPDATE genérica: garantiza que actualizado_en
-- siempre refleja el momento real del cambio.
CREATE OR REPLACE FUNCTION fn_set_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := NOW();
    RETURN NEW;
END;
$$;


-- ============================================================
-- SECCIÓN 3 · FUNCIÓN BEFORE DELETE EN productos
-- ============================================================

-- Objetivo doble:
--   1. Bloquear borrado físico si el producto tiene historial
--      (transacciones de stock asociadas). Fuerza baja lógica (activo=FALSE).
--   2. Registrar en audit_log ANTES de que la fila desaparezca.
CREATE OR REPLACE FUNCTION fn_productos_before_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_tx_count INT;
BEGIN
    SELECT COUNT(*) INTO v_tx_count
    FROM transacciones_stock
    WHERE id_producto = OLD.id;

    IF v_tx_count > 0 THEN
        RAISE EXCEPTION
            'NEXUS-001: No se puede borrar el producto id=% (SKU: %) porque tiene % '
            'transacción(es) de stock registrada(s). Usa activo=FALSE para darlo de baja.',
            OLD.id, OLD.sku, v_tx_count;
    END IF;

    -- Sin historial: registrar en audit_log y permitir el DELETE
    INSERT INTO audit_log (tabla, operacion, id_registro, datos_antes, datos_despues)
    VALUES ('productos', 'DELETE', OLD.id::TEXT, to_jsonb(OLD), NULL);

    RETURN OLD; -- BEFORE DELETE: RETURN OLD permite que el borrado continúe
END;
$$;


-- ============================================================
-- SECCIÓN 4 · FUNCIÓN BEFORE UPDATE EN transacciones_stock
-- ============================================================

-- Las transacciones son un log INMUTABLE.
-- Ningún UPDATE es permitido, ni desde la app ni desde un cliente SQL.
-- Si hay un error, la corrección es una nueva transacción de AJUSTE.
CREATE OR REPLACE FUNCTION fn_bloquear_update_tx_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'NEXUS-002: Las transacciones de stock son inmutables. '
        'No se puede modificar la fila id=%. '
        'Registra un AJUSTE para corregir el stock.',
        OLD.id;
    RETURN NULL;
END;
$$;


-- ============================================================
-- SECCIÓN 5 · FUNCIÓN BEFORE UPDATE EN clientes
-- ============================================================

-- Combina dos responsabilidades en un único trigger:
--   1. Actualizar actualizado_en automáticamente.
--   2. Segunda línea de defensa contra puntos negativos
--      (el CHECK constraint es la primera).
CREATE OR REPLACE FUNCTION fn_clientes_before_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := NOW();

    IF NEW.puntos_fidelidad < 0 THEN
        RAISE EXCEPTION
            'NEXUS-003: Los puntos de fidelidad del cliente id=% no pueden ser '
            'negativos. Valor recibido: %.',
            NEW.id, NEW.puntos_fidelidad;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================
-- SECCIÓN 6 · STORED PROCEDURE DE STOCK (ACID + FOR UPDATE)
-- ============================================================

-- sp_registrar_transaccion_stock
-- Único punto de escritura legítimo para movimientos de inventario.
-- Java lo llama via JDBC CallableStatement (nunca con JPA).
--
-- Garantías:
--   · SELECT FOR UPDATE → bloqueo exclusivo de fila. Dos hilos que intenten
--     vender el mismo artículo RETRO (stock=1) se procesan en serie:
--     el segundo ve stock=0 y recibe ERROR controlado.
--   · Validaciones de negocio antes de cualquier escritura.
--   · EXCEPTION WHEN OTHERS → ROLLBACK automático en error inesperado.
CREATE OR REPLACE PROCEDURE sp_registrar_transaccion_stock(
    IN  p_id_producto     BIGINT,
    IN  p_id_usuario      BIGINT,
    IN  p_id_cliente      BIGINT,          -- NULL si es entrada de proveedor
    IN  p_id_proveedor    BIGINT,          -- NULL si es venta a cliente
    IN  p_tipo_movimiento VARCHAR(10),     -- 'ENTRADA' | 'SALIDA' | 'AJUSTE'
    IN  p_cantidad        INT,             -- valor absoluto, siempre positivo
    IN  p_precio_unitario NUMERIC(10,2),
    IN  p_referencia      VARCHAR(100),
    IN  p_notas           TEXT,
    OUT o_resultado       TEXT,
    OUT o_stock_nuevo     INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_stock_actual  INT;
    v_tipo_producto VARCHAR(10);
    v_activo        BOOLEAN;
    v_stock_antes   INT;
    v_delta         INT;
BEGIN
    -- ── Paso 1: bloqueo exclusivo de la fila ──────────────────────────
    -- FOR UPDATE impide lecturas y escrituras concurrentes sobre esta fila
    -- hasta que la transacción haga COMMIT o ROLLBACK.
    SELECT stock_actual, tipo_producto, activo
    INTO   v_stock_actual, v_tipo_producto, v_activo
    FROM   productos
    WHERE  id = p_id_producto
    FOR UPDATE;

    -- ── Paso 2: validaciones de negocio ───────────────────────────────
    IF NOT FOUND THEN
        o_resultado   := 'ERROR: Producto no encontrado id=' || p_id_producto;
        o_stock_nuevo := -1;
        RETURN;
    END IF;

    IF NOT v_activo THEN
        o_resultado   := 'ERROR: Producto dado de baja (activo=FALSE).';
        o_stock_nuevo := -1;
        RETURN;
    END IF;

    -- ── Paso 3: calcular delta ────────────────────────────────────────
    v_delta := CASE
        WHEN p_tipo_movimiento = 'SALIDA' THEN -ABS(p_cantidad)
        WHEN p_tipo_movimiento = 'AJUSTE' THEN p_cantidad   -- puede ser negativo
        ELSE                                   ABS(p_cantidad) -- ENTRADA
    END;

    -- ── Paso 4: validar stock resultante ──────────────────────────────
    IF (v_stock_actual + v_delta) < 0 THEN
        o_resultado := 'ERROR: Stock insuficiente. Disponible: ' || v_stock_actual
                    || CASE WHEN v_tipo_producto = 'RETRO'
                            THEN ' | Pieza RETRO única: ya fue vendida.'
                            ELSE '' END;
        o_stock_nuevo := v_stock_actual;
        RETURN;
    END IF;

    v_stock_antes := v_stock_actual;

    -- ── Paso 5: actualizar stock ──────────────────────────────────────
    UPDATE productos
    SET    stock_actual   = v_stock_actual + v_delta,
           actualizado_en = NOW()
    WHERE  id = p_id_producto;

    -- ── Paso 6: insertar en el log inmutable ──────────────────────────
    INSERT INTO transacciones_stock (
        id_producto, id_usuario, id_cliente, id_proveedor,
        tipo_movimiento, cantidad, stock_antes, stock_despues,
        precio_unitario, referencia, notas
    ) VALUES (
        p_id_producto, p_id_usuario, p_id_cliente, p_id_proveedor,
        p_tipo_movimiento, p_cantidad, v_stock_antes, v_stock_antes + v_delta,
        p_precio_unitario, p_referencia, p_notas
    );

    o_resultado   := 'OK: ' || v_stock_antes || ' → ' || (v_stock_antes + v_delta);
    o_stock_nuevo := v_stock_antes + v_delta;

EXCEPTION
    WHEN OTHERS THEN
        o_resultado   := 'ERROR INESPERADO: ' || SQLERRM;
        o_stock_nuevo := -1;
        RAISE; -- propaga la excepción → ROLLBACK automático
END;
$$;


-- ============================================================
-- SECCIÓN 7 · DECLARACIÓN DE TRIGGERS EN SUS TABLAS
-- ============================================================

-- ── productos: 3 triggers separados y específicos ────────────
-- AFTER INSERT: auditoría del alta de un producto nuevo
CREATE OR REPLACE TRIGGER trg_productos_after_insert
    AFTER INSERT ON productos
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- AFTER UPDATE: auditoría de cualquier cambio (precio, stock, activo...)
-- OJO: este trigger se activa DESPUÉS de que fn_set_actualizado_en
-- ya actualizó el campo, por lo que datos_despues reflejará el timestamp nuevo.
CREATE OR REPLACE TRIGGER trg_productos_after_update
    AFTER UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- BEFORE DELETE: protección de integridad + auditoría pre-borrado.
-- BEFORE (no AFTER) porque necesita acceder a OLD antes de que la fila
-- desaparezca y puede lanzar EXCEPTION para cancelar la operación.
CREATE OR REPLACE TRIGGER trg_productos_before_delete
    BEFORE DELETE ON productos
    FOR EACH ROW EXECUTE FUNCTION fn_productos_before_delete();

-- BEFORE UPDATE actualizado_en en productos
-- Se ejecuta ANTES del AFTER UPDATE de auditoría → el audit captura el valor correcto
CREATE OR REPLACE TRIGGER trg_productos_set_actualizado_en
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

-- ── transacciones_stock: inmutabilidad ───────────────────────
CREATE OR REPLACE TRIGGER trg_tx_stock_bloquear_update
    BEFORE UPDATE ON transacciones_stock
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_update_tx_stock();

-- ── clientes: timestamp + validación puntos ──────────────────
CREATE OR REPLACE TRIGGER trg_clientes_before_update
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_clientes_before_update();

-- ── usuarios: timestamp automático ───────────────────────────
CREATE OR REPLACE TRIGGER trg_usuarios_set_actualizado_en
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

-- ── usuarios: auditoría completa ─────────────────────────────
CREATE OR REPLACE TRIGGER trg_audit_usuarios
    AFTER INSERT OR UPDATE OR DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ── proveedores: timestamp + auditoría ───────────────────────
CREATE OR REPLACE TRIGGER trg_proveedores_set_actualizado_en
    BEFORE UPDATE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

CREATE OR REPLACE TRIGGER trg_audit_proveedores
    AFTER INSERT OR UPDATE OR DELETE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ── ordenes_compra: auditoría de cambios de estado ───────────
CREATE OR REPLACE TRIGGER trg_audit_ordenes_compra
    AFTER INSERT OR UPDATE OR DELETE ON ordenes_compra
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();