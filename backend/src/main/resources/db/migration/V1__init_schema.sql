-- ============================================================
--  LevelUp Nexus ERP — V1__init_schema.sql
--  Motor:   PostgreSQL 16
--  Backend: Java 25 LTS + Spring Boot 4.0
--  Autores: Desirée Cobo Batalla & Sebastián Burneo Reyes
--  Versión: v1.1.0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────
-- BLOQUE 1 · RBAC: ROLES Y USUARIOS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
    id          BIGSERIAL    PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion TEXT         NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL     PRIMARY KEY,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    username        VARCHAR(60)   NOT NULL UNIQUE,
    nombre_completo VARCHAR(150)  NOT NULL DEFAULT '',
    password_hash   VARCHAR(255)  NOT NULL,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
    verify_token    VARCHAR(36)   DEFAULT NULL,
    verify_expires  TIMESTAMPTZ   DEFAULT NULL,
    last_login      TIMESTAMPTZ   DEFAULT NULL,
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email        ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_verify_token ON usuarios (verify_token);

CREATE TABLE IF NOT EXISTS usuarios_roles (
    id_usuario  BIGINT       NOT NULL,
    id_rol      BIGINT       NOT NULL,
    asignado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_usuarios_roles  PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT fk_ur_usuario      FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_ur_rol          FOREIGN KEY (id_rol)     REFERENCES roles(id)    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ──────────────────────────────────────────────────────────
-- BLOQUE 2 · TERCEROS: PROVEEDORES Y CLIENTES
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS proveedores (
    id               BIGSERIAL    PRIMARY KEY,
    razon_social     VARCHAR(200) NOT NULL,
    cif              VARCHAR(20)  DEFAULT NULL UNIQUE,
    email            VARCHAR(150) DEFAULT NULL,
    telefono         VARCHAR(30)  DEFAULT NULL,
    direccion        TEXT         DEFAULT NULL,
    tiempo_entrega_d SMALLINT     DEFAULT NULL,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_razon_social ON proveedores (razon_social);

CREATE TABLE IF NOT EXISTS clientes (
    id               BIGSERIAL    PRIMARY KEY,
    nombre           VARCHAR(150) NOT NULL,
    email            VARCHAR(150) DEFAULT NULL UNIQUE,
    telefono         VARCHAR(30)  DEFAULT NULL,
    puntos_fidelidad INT          NOT NULL DEFAULT 0 CHECK (puntos_fidelidad >= 0),
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_email  ON clientes (email);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (nombre);

-- ──────────────────────────────────────────────────────────
-- BLOQUE 3 · INVENTARIO: UBICACIONES Y PRODUCTOS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ubicaciones_almacen (
    id          BIGSERIAL   PRIMARY KEY,
    pasillo     VARCHAR(10) NOT NULL,
    estanteria  VARCHAR(5)  NOT NULL,
    nivel       SMALLINT    NOT NULL CHECK (nivel BETWEEN 1 AND 6),
    descripcion TEXT        DEFAULT NULL,
    CONSTRAINT uq_ubicacion_coords UNIQUE (pasillo, estanteria, nivel)
);

CREATE TABLE IF NOT EXISTS productos (
    id                    BIGSERIAL       PRIMARY KEY,
    sku                   VARCHAR(50)     NOT NULL UNIQUE,
    nombre                VARCHAR(200)    NOT NULL,
    descripcion           TEXT            DEFAULT NULL,
    id_proveedor          BIGINT          DEFAULT NULL,
    id_ubicacion          BIGINT          DEFAULT NULL UNIQUE,
    precio_coste          NUMERIC(10,2)   NOT NULL DEFAULT 0.00 CHECK (precio_coste >= 0),
    precio_venta          NUMERIC(10,2)   NOT NULL DEFAULT 0.00 CHECK (precio_venta >= 0),
    stock_actual          INT             NOT NULL DEFAULT 0    CHECK (stock_actual >= 0),
    stock_minimo          INT             NOT NULL DEFAULT 0    CHECK (stock_minimo >= 0),
    stock_maximo          INT             NOT NULL DEFAULT 9999 CHECK (stock_maximo >= 0),
    tipo_producto         VARCHAR(10)     NOT NULL DEFAULT 'ESTANDAR'
                            CHECK (tipo_producto IN ('ESTANDAR', 'RETRO')),
    estado_conservacion   VARCHAR(10)     DEFAULT NULL
                            CHECK (estado_conservacion IN ('MINT', 'CIB', 'LOOSE', 'LOOSE_D')),
    atributos_especificos JSONB           DEFAULT NULL,
    activo                BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_prod_proveedor  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id)         ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_prod_ubicacion  FOREIGN KEY (id_ubicacion) REFERENCES ubicaciones_almacen(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prod_tipo      ON productos (tipo_producto);
CREATE INDEX IF NOT EXISTS idx_prod_stock     ON productos (stock_actual);
CREATE INDEX IF NOT EXISTS idx_prod_activo    ON productos (activo);
CREATE INDEX IF NOT EXISTS idx_prod_proveedor ON productos (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_prod_attrs_gin ON productos USING GIN (atributos_especificos);
CREATE INDEX IF NOT EXISTS idx_prod_fts       ON productos USING GIN (
    to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion, ''))
);

-- ──────────────────────────────────────────────────────────
-- BLOQUE 4 · MOVIMIENTOS DE STOCK
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transacciones_stock (
    id               BIGSERIAL     PRIMARY KEY,
    id_producto      BIGINT        NOT NULL,
    id_usuario       BIGINT        NOT NULL,
    id_cliente       BIGINT        DEFAULT NULL,
    id_proveedor     BIGINT        DEFAULT NULL,
    tipo_movimiento  VARCHAR(10)   NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
    cantidad         INT           NOT NULL,
    stock_antes      INT           NOT NULL,
    stock_despues    INT           NOT NULL,
    precio_unitario  NUMERIC(10,2) DEFAULT NULL,
    referencia       VARCHAR(100)  DEFAULT NULL,
    notas            TEXT          DEFAULT NULL,
    fecha            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tx_producto   FOREIGN KEY (id_producto)  REFERENCES productos(id)    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tx_usuario    FOREIGN KEY (id_usuario)   REFERENCES usuarios(id)     ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tx_cliente    FOREIGN KEY (id_cliente)   REFERENCES clientes(id)     ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_tx_proveedor  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id)  ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tx_producto ON transacciones_stock (id_producto);
CREATE INDEX IF NOT EXISTS idx_tx_usuario  ON transacciones_stock (id_usuario);
CREATE INDEX IF NOT EXISTS idx_tx_fecha    ON transacciones_stock (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_tx_tipo     ON transacciones_stock (tipo_movimiento);

-- ──────────────────────────────────────────────────────────
-- BLOQUE 5 · ÓRDENES DE COMPRA
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ordenes_compra (
    id               BIGSERIAL    PRIMARY KEY,
    id_proveedor     BIGINT       NOT NULL,
    id_usuario       BIGINT       NOT NULL,
    estado           VARCHAR(20)  NOT NULL DEFAULT 'BORRADOR'
                        CHECK (estado IN ('BORRADOR','ENVIADA','CONFIRMADA','RECIBIDA','CANCELADA')),
    notas            TEXT         DEFAULT NULL,
    fecha_creacion   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_envio      TIMESTAMPTZ  DEFAULT NULL,
    fecha_recepcion  TIMESTAMPTZ  DEFAULT NULL,
    CONSTRAINT fk_oc_proveedor  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_oc_usuario    FOREIGN KEY (id_usuario)   REFERENCES usuarios(id)    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oc_proveedor ON ordenes_compra (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_oc_estado    ON ordenes_compra (estado);
CREATE INDEX IF NOT EXISTS idx_oc_fecha     ON ordenes_compra (fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS detalles_orden_compra (
    id               BIGSERIAL     PRIMARY KEY,
    id_orden         BIGINT        NOT NULL,
    id_producto      BIGINT        NOT NULL,
    cantidad         INT           NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    CONSTRAINT fk_doc_orden     FOREIGN KEY (id_orden)    REFERENCES ordenes_compra(id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_doc_producto  FOREIGN KEY (id_producto) REFERENCES productos(id)      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_doc_linea     UNIQUE (id_orden, id_producto)
);

CREATE INDEX IF NOT EXISTS idx_doc_orden ON detalles_orden_compra (id_orden);

-- ──────────────────────────────────────────────────────────
-- BLOQUE 6 · AUDITORÍA
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id            BIGSERIAL    PRIMARY KEY,
    tabla         VARCHAR(60)  NOT NULL,
    operacion     VARCHAR(10)  NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
    id_registro   TEXT         NOT NULL,
    datos_antes   JSONB        DEFAULT NULL,
    datos_despues JSONB        DEFAULT NULL,
    usuario_bd    TEXT         NOT NULL DEFAULT current_user,
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_al_tabla     ON audit_log (tabla);
CREATE INDEX IF NOT EXISTS idx_al_operacion ON audit_log (operacion);
CREATE INDEX IF NOT EXISTS idx_al_creado_en ON audit_log (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_al_id_reg    ON audit_log (id_registro);

-- ──────────────────────────────────────────────────────────
-- BLOQUE 7 · TRIGGERS DE AUDITORÍA
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF    TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (tabla, operacion, id_registro, datos_antes, datos_despues)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::TEXT, NULL, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (tabla, operacion, id_registro, datos_antes, datos_despues)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (tabla, operacion, id_registro, datos_antes, datos_despues)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::TEXT, to_jsonb(OLD), NULL);
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_audit_productos
    AFTER INSERT OR UPDATE OR DELETE ON productos
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE OR REPLACE TRIGGER trg_audit_usuarios
    AFTER INSERT OR UPDATE OR DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE OR REPLACE TRIGGER trg_audit_proveedores
    AFTER INSERT OR UPDATE OR DELETE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE OR REPLACE TRIGGER trg_audit_ordenes_compra
    AFTER INSERT OR UPDATE OR DELETE ON ordenes_compra
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ──────────────────────────────────────────────────────────
-- BLOQUE 8 · TRIGGER: actualizado_en automático
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_upd_usuarios
    BEFORE UPDATE ON usuarios    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();
CREATE OR REPLACE TRIGGER trg_upd_proveedores
    BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();
CREATE OR REPLACE TRIGGER trg_upd_clientes
    BEFORE UPDATE ON clientes    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();
CREATE OR REPLACE TRIGGER trg_upd_productos
    BEFORE UPDATE ON productos   FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

-- ──────────────────────────────────────────────────────────
-- BLOQUE 9 · STORED PROCEDURE: TRANSACCIÓN DE STOCK (ACID)
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE PROCEDURE sp_registrar_transaccion_stock(
    IN  p_id_producto     BIGINT,
    IN  p_id_usuario      BIGINT,
    IN  p_id_cliente      BIGINT,
    IN  p_id_proveedor    BIGINT,
    IN  p_tipo_movimiento VARCHAR(10),
    IN  p_cantidad        INT,
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
    SELECT stock_actual, tipo_producto, activo
    INTO   v_stock_actual, v_tipo_producto, v_activo
    FROM   productos
    WHERE  id = p_id_producto
    FOR UPDATE;

    IF NOT FOUND THEN
        o_resultado   := 'ERROR: Producto no encontrado id=' || p_id_producto;
        o_stock_nuevo := -1;
        RETURN;
    END IF;

    IF NOT v_activo THEN
        o_resultado   := 'ERROR: Producto dado de baja.';
        o_stock_nuevo := -1;
        RETURN;
    END IF;

    v_delta := CASE
        WHEN p_tipo_movimiento = 'SALIDA' THEN -ABS(p_cantidad)
        WHEN p_tipo_movimiento = 'AJUSTE' THEN p_cantidad
        ELSE                                   ABS(p_cantidad)
    END;

    IF (v_stock_actual + v_delta) < 0 THEN
        o_resultado := 'ERROR: Stock insuficiente. Disponible: ' || v_stock_actual
                    || CASE WHEN v_tipo_producto = 'RETRO'
                            THEN ' | Pieza RETRO única: ya fue vendida.'
                            ELSE '' END;
        o_stock_nuevo := v_stock_actual;
        RETURN;
    END IF;

    v_stock_antes := v_stock_actual;

    UPDATE productos
    SET    stock_actual    = v_stock_actual + v_delta,
           actualizado_en  = NOW()
    WHERE  id = p_id_producto;

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
        RAISE;
END;
$$;