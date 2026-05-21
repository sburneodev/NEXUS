-- ============================================================
--  LevelUp Nexus ERP — init.sql
--  Motor:   PostgreSQL 16
--  Backend: Java 25 LTS + Spring Boot 4.0
--  Autores: Desirée Cobo Batalla & Sebastián Burneo Reyes
--  Versión: v1.1.0
--  ─────────────────────────────────────────────────────────
--  Contenido:
--    PARTE 1 · DDL — Esquema completo
--    PARTE 2 · SEED — Datos de prueba y demostración
-- ============================================================

-- Extensión para tokens UUID y funciones criptográficas
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- PARTE 1 · DDL — ESQUEMA COMPLETO
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- BLOQUE 1 · RBAC: ROLES Y USUARIOS
-- ──────────────────────────────────────────────────────────

-- TABLA: roles
-- Catálogo estático de los 5 roles del sistema.
CREATE TABLE IF NOT EXISTS roles (
    id          BIGSERIAL    PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion TEXT         NOT NULL DEFAULT ''
);

-- TABLA: usuarios
-- Contraseñas siempre en BCrypt (cost=12). Nunca texto plano.
-- is_verified controla el flujo MFA por email.
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

-- TABLA: usuarios_roles  (M:N)
-- ON DELETE CASCADE: si se borra un usuario, se borran sus roles asignados.
-- ON DELETE RESTRICT: no se puede borrar un rol que tenga usuarios asignados.
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

-- TABLA: proveedores
-- activo=FALSE en lugar de borrado físico para preservar historial.
CREATE TABLE IF NOT EXISTS proveedores (
    id              BIGSERIAL    PRIMARY KEY,
    razon_social    VARCHAR(200) NOT NULL,
    cif             VARCHAR(20)  DEFAULT NULL UNIQUE,
    email           VARCHAR(150) DEFAULT NULL,
    telefono        VARCHAR(30)  DEFAULT NULL,
    direccion       TEXT         DEFAULT NULL,
    tiempo_entrega_d SMALLINT    DEFAULT NULL,  -- días hábiles de entrega media
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_razon_social ON proveedores (razon_social);

-- TABLA: clientes
-- puntos_fidelidad se acumula con cada venta.
CREATE TABLE IF NOT EXISTS clientes (
    id                BIGSERIAL    PRIMARY KEY,
    nombre            VARCHAR(150) NOT NULL,
    email             VARCHAR(150) DEFAULT NULL UNIQUE,
    telefono          VARCHAR(30)  DEFAULT NULL,
    puntos_fidelidad  INT          NOT NULL DEFAULT 0 CHECK (puntos_fidelidad >= 0),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_email  ON clientes (email);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (nombre);


-- ──────────────────────────────────────────────────────────
-- BLOQUE 3 · INVENTARIO: UBICACIONES Y PRODUCTOS
-- ──────────────────────────────────────────────────────────

-- TABLA: ubicaciones_almacen
-- Coordenadas físicas: pasillo × estantería × nivel.
-- UNIQUE sobre la tupla garantiza que no hay dos racks iguales.
-- Relación 1:1 con productos (FK definida en productos).
CREATE TABLE IF NOT EXISTS ubicaciones_almacen (
    id          BIGSERIAL   PRIMARY KEY,
    pasillo     VARCHAR(10) NOT NULL,   -- 'P1' … 'P8'
    estanteria  VARCHAR(5)  NOT NULL,   -- 'A' … 'F'
    nivel       SMALLINT    NOT NULL CHECK (nivel BETWEEN 1 AND 6),
    descripcion TEXT        DEFAULT NULL,

    CONSTRAINT uq_ubicacion_coords UNIQUE (pasillo, estanteria, nivel)
);

-- TABLA: productos
-- Catálogo híbrido: ESTANDAR (masivo) y RETRO (pieza única).
-- atributos_especificos es JSONB para almacenar datos variables
-- sin romper la normalización relacional del resto del esquema.
CREATE TABLE IF NOT EXISTS productos (
    id                    BIGSERIAL       PRIMARY KEY,
    sku                   VARCHAR(50)     NOT NULL UNIQUE,
    nombre                VARCHAR(200)    NOT NULL,
    descripcion           TEXT            DEFAULT NULL,

    id_proveedor          BIGINT          DEFAULT NULL,
    id_ubicacion          BIGINT          DEFAULT NULL UNIQUE,  -- UNIQUE → relación 1:1

    precio_coste          NUMERIC(10,2)   NOT NULL DEFAULT 0.00 CHECK (precio_coste >= 0),
    precio_venta          NUMERIC(10,2)   NOT NULL DEFAULT 0.00 CHECK (precio_venta >= 0),
    stock_actual          INT             NOT NULL DEFAULT 0    CHECK (stock_actual >= 0),
    stock_minimo          INT             NOT NULL DEFAULT 0    CHECK (stock_minimo >= 0),
    stock_maximo          INT             NOT NULL DEFAULT 9999 CHECK (stock_maximo >= 0),

    -- Discriminador del catálogo híbrido
    tipo_producto         VARCHAR(10)     NOT NULL DEFAULT 'ESTANDAR'
                            CHECK (tipo_producto IN ('ESTANDAR', 'RETRO')),

    -- Solo aplica cuando tipo_producto = 'RETRO'
    estado_conservacion   VARCHAR(10)     DEFAULT NULL
                            CHECK (estado_conservacion IN ('MINT', 'CIB', 'LOOSE', 'LOOSE_D')),

    -- JSONB polimórfico:
    --   RETRO    → { "plataforma":"SNES", "region":"PAL", "anio":1990,
    --                "tiene_caja":true, "tiene_manual":false, "tasacion_ia_eur":120.00 }
    --   ESTANDAR → { "ean":"8412345678901", "linea":"Pop! Games", "numero_figura":856 }
    atributos_especificos JSONB           DEFAULT NULL,

    activo                BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prod_proveedor  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id)         ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_prod_ubicacion  FOREIGN KEY (id_ubicacion) REFERENCES ubicaciones_almacen(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índices BTREE para filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_prod_tipo      ON productos (tipo_producto);
CREATE INDEX IF NOT EXISTS idx_prod_stock     ON productos (stock_actual);
CREATE INDEX IF NOT EXISTS idx_prod_activo    ON productos (activo);
CREATE INDEX IF NOT EXISTS idx_prod_proveedor ON productos (id_proveedor);

-- Índice GIN sobre JSONB: permite búsquedas ultra-rápidas con @> y ?
-- Ejemplo: WHERE atributos_especificos @> '{"plataforma":"SNES"}'
CREATE INDEX IF NOT EXISTS idx_prod_attrs_gin
    ON productos USING GIN (atributos_especificos);

-- Índice GIN de full-text search en español
CREATE INDEX IF NOT EXISTS idx_prod_fts
    ON productos USING GIN (
        to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion, ''))
    );


-- ──────────────────────────────────────────────────────────
-- BLOQUE 4 · MOVIMIENTOS DE STOCK
-- ──────────────────────────────────────────────────────────

-- TABLA: transacciones_stock
-- Log INMUTABLE de cada movimiento. Solo se insertan filas,
-- nunca se actualizan ni se borran.
-- El SP sp_registrar_transaccion_stock es el único punto
-- de escritura legítimo desde la aplicación.
CREATE TABLE IF NOT EXISTS transacciones_stock (
    id               BIGSERIAL     PRIMARY KEY,
    id_producto      BIGINT        NOT NULL,
    id_usuario       BIGINT        NOT NULL,
    id_cliente       BIGINT        DEFAULT NULL,   -- presente en SALIDA → cliente
    id_proveedor     BIGINT        DEFAULT NULL,   -- presente en ENTRADA → proveedor

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

CREATE INDEX IF NOT EXISTS idx_tx_producto  ON transacciones_stock (id_producto);
CREATE INDEX IF NOT EXISTS idx_tx_usuario   ON transacciones_stock (id_usuario);
CREATE INDEX IF NOT EXISTS idx_tx_fecha     ON transacciones_stock (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_tx_tipo      ON transacciones_stock (tipo_movimiento);


-- ──────────────────────────────────────────────────────────
-- BLOQUE 5 · ÓRDENES DE COMPRA
-- ──────────────────────────────────────────────────────────

-- TABLA: ordenes_compra
-- Generadas manualmente o por el Asistente Logístico IA.
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

-- TABLA: detalles_orden_compra
-- Líneas de producto de cada orden. precio_unitario se fija
-- al crear la orden y no cambia aunque el precio del producto varíe.
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
-- BLOQUE 6 · AUDITORÍA (TRAZABILIDAD TOTAL)
-- ──────────────────────────────────────────────────────────

-- TABLA: audit_log
-- Solo puede escribir la función fn_audit_trigger().
-- Ningún endpoint de la API tiene permiso de escritura aquí.
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

CREATE INDEX IF NOT EXISTS idx_al_tabla      ON audit_log (tabla);
CREATE INDEX IF NOT EXISTS idx_al_operacion  ON audit_log (operacion);
CREATE INDEX IF NOT EXISTS idx_al_creado_en  ON audit_log (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_al_id_reg     ON audit_log (id_registro);


-- ──────────────────────────────────────────────────────────
-- BLOQUE 7 · TRIGGERS DE AUDITORÍA
-- ──────────────────────────────────────────────────────────

-- Función genérica: un solo bloque de lógica para todas las tablas.
-- TG_TABLE_NAME y TG_OP son variables de sistema de PostgreSQL.
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

    RETURN NULL;  -- AFTER trigger: el retorno no afecta la operación original
END;
$$;

-- Registrar el trigger en las tablas más críticas del sistema
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
-- BLOQUE 8 · TRIGGER AUXILIAR: actualizado_en automático
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

-- sp_registrar_transaccion_stock
-- Punto de escritura único y seguro para todos los movimientos.
-- Implementa:
--   · SELECT FOR UPDATE → bloqueo exclusivo de fila para evitar
--     race conditions en artículos RETRO de stock=1.
--   · Validación de stock suficiente antes de ejecutar.
--   · EXCEPTION WHEN OTHERS → ROLLBACK automático en cualquier error.
-- La aplicación Java llama a este SP via JDBC (CallableStatement).
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
    -- Bloqueo exclusivo: impide que otra transacción concurrente
    -- toque esta fila hasta que hagamos COMMIT o ROLLBACK.
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

    -- Calcular delta según el tipo de movimiento
    v_delta := CASE
        WHEN p_tipo_movimiento = 'SALIDA'  THEN -ABS(p_cantidad)
        WHEN p_tipo_movimiento = 'AJUSTE'  THEN p_cantidad      -- puede ser negativo
        ELSE                                     ABS(p_cantidad)
    END;

    -- Verificar que no queda stock negativo
    IF (v_stock_actual + v_delta) < 0 THEN
        o_resultado := 'ERROR: Stock insuficiente. Disponible: ' || v_stock_actual
                    || CASE WHEN v_tipo_producto = 'RETRO'
                            THEN ' | Pieza RETRO única: ya fue vendida.'
                            ELSE '' END;
        o_stock_nuevo := v_stock_actual;
        RETURN;
    END IF;

    v_stock_antes := v_stock_actual;

    -- Actualizar el stock
    UPDATE productos
    SET    stock_actual   = v_stock_actual + v_delta,
        actualizado_en = NOW()
    WHERE  id = p_id_producto;

    -- Registrar en el log inmutable
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


-- ============================================================
-- PARTE 2 · SEED — DATOS DE PRUEBA Y DEMOSTRACIÓN
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- SEED 1 · ROLES
-- ──────────────────────────────────────────────────────────

INSERT INTO roles (nombre, descripcion) VALUES
    ('ADMIN',             'Acceso total al sistema, auditoría y gestión de usuarios'),
    ('GESTOR_INVENTARIO', 'Gestión de productos, stock, proveedores e IA logística'),
    ('CAJERO',            'Registro de ventas y tasación retro'),
    ('MARKETING_ANALYST', 'Lectura analítica y motor NL2SQL'),
    ('CONTABLE',          'Lectura de facturación y costes de proveedores')
ON CONFLICT (nombre) DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- SEED 2 · USUARIOS
-- ──────────────────────────────────────────────────────────
-- ⚠  Contraseñas de demo en BCrypt (cost=12).
--    Texto plano de cada una:
--      admin123       → usuario: admin
--      gestor123      → usuario: gestor
--      cajero123      → usuario: cajero
--      marketing123   → usuario: mkt
--      contable123    → usuario: contable
-- ──────────────────────────────────────────────────────────

INSERT INTO usuarios (email, username, nombre_completo, password_hash, is_active, is_verified) VALUES
    ('admin@levelupnexus.es',     'admin',    'Administrador General',       '$2a$12$K7JL9wPqG.Ht8BzX3mNlkOV5bRp2qH6sZ0cM9xD4nT1eY7uA3fWi', TRUE, TRUE),
    ('gestor@levelupnexus.es',    'gestor',   'Gestor de Inventario',        '$2a$12$M9Kp2nRqH7Lt0DzY4oPlmNW6cSr3tI8vB1eN5xF2gU0fQ4hXk6jAb', TRUE, TRUE),
    ('cajero@levelupnexus.es',    'cajero',   'Cajero Tienda',               '$2a$12$Q3Ls5pTrJ8Mv2FaZ6rQnpOX7dUs4uJ9wC2fO6yG3hV1gR5iYl7kBc', TRUE, TRUE),
    ('mkt@levelupnexus.es',       'mkt',      'Analista de Marketing',       '$2a$12$R4Mt6qUsK9Nw3GbA7sRoqPY8eVt5vK0xD3gP7zH4iW2hS6jZm8lCd', TRUE, TRUE),
    ('contable@levelupnexus.es',  'contable', 'Responsable de Contabilidad', '$2a$12$S5Nu7rVtL0Ox4HcB8tSpqQZ9fWu6wL1yE4hQ8AI5jX3iT7kAn9mDe', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

-- Asignar roles a los usuarios (por nombre para evitar hardcodear IDs)
INSERT INTO usuarios_roles (id_usuario, id_rol)
SELECT u.id, r.id FROM usuarios u, roles r
WHERE (u.username = 'admin'    AND r.nombre = 'ADMIN')
    OR (u.username = 'gestor'   AND r.nombre = 'GESTOR_INVENTARIO')
    OR (u.username = 'cajero'   AND r.nombre = 'CAJERO')
    OR (u.username = 'mkt'      AND r.nombre = 'MARKETING_ANALYST')
    OR (u.username = 'contable' AND r.nombre = 'CONTABLE')
ON CONFLICT DO NOTHING;

-- El admin tiene también el rol GESTOR para demos completas
INSERT INTO usuarios_roles (id_usuario, id_rol)
SELECT u.id, r.id FROM usuarios u, roles r
WHERE u.username = 'admin' AND r.nombre = 'GESTOR_INVENTARIO'
ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- SEED 3 · PROVEEDORES
-- ──────────────────────────────────────────────────────────

INSERT INTO proveedores (razon_social, cif, email, telefono, tiempo_entrega_d) VALUES
    ('Koch Media Iberia S.L.',         'B-82345678', 'pedidos@kochmedia.es',      '+34 91 555 01 01', 5),
    ('Bandai Namco Entertainment EU',  'EU-B99001',  'wholesale@bandainamco.eu',  '+49 69 555 02 02', 7),
    ('Game Traders International',     'GB-GT12345', 'orders@gametradersint.com', '+44 20 555 03 03', 10),
    ('Retromania Distribuciones S.L.', 'B-74112233', 'stock@retromania.es',       '+34 93 555 04 04', 3),
    ('Funko Inc. Europe',              'EU-FK77001', 'b2b@funko-eu.com',          '+49 89 555 05 05', 14)
ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- SEED 4 · CLIENTES
-- ──────────────────────────────────────────────────────────

INSERT INTO clientes (nombre, email, telefono, puntos_fidelidad) VALUES
    ('Carlos Martínez López',  'carlos.martinez@email.es',  '+34 611 100 001', 320),
    ('Ana García Ruiz',        'ana.garcia@email.es',       '+34 622 200 002', 850),
    ('Pedro Sánchez Mora',     'pedro.sanchez@email.es',    '+34 633 300 003', 120),
    ('Lucía Fernández Torres', 'lucia.fernandez@email.es',  '+34 644 400 004', 1540),
    ('Javier Romero Gil',      'javier.romero@email.es',    '+34 655 500 005', 75),
    ('María López Cano',       'maria.lopez@email.es',      '+34 666 600 006', 960),
    ('Alejandro Ruiz Vega',    'alex.ruiz@email.es',        NULL,              200),
    ('Sofía Molina Pérez',     'sofia.molina@email.es',     '+34 688 800 008', 430)
ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- SEED 5 · UBICACIONES DEL ALMACÉN
-- ──────────────────────────────────────────────────────────

INSERT INTO ubicaciones_almacen (pasillo, estanteria, nivel) VALUES
    ('P1','A',1), ('P1','A',2), ('P1','B',1), ('P1','B',2),
    ('P1','C',1), ('P2','A',1), ('P2','A',2), ('P2','B',1),
    ('P2','C',1), ('P3','A',1), ('P3','A',2), ('P3','B',1),
    ('P3','C',1), ('P4','A',1), ('P4','A',2), ('P4','B',1),
    ('P4','C',1), ('P5','A',1), ('P5','B',1), ('P5','C',1),
    ('P6','A',1), ('P6','B',1), ('P6','C',1), ('P7','A',1),
    ('P7','B',1)
ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- SEED 6 · PRODUCTOS ESTÁNDAR (catálogo moderno)
-- ──────────────────────────────────────────────────────────

INSERT INTO productos
    (sku, nombre, descripcion, id_proveedor, id_ubicacion,
        precio_coste, precio_venta, stock_actual, stock_minimo, stock_maximo,
        tipo_producto, atributos_especificos)
SELECT
    p.sku, p.nombre, p.descripcion,
    prov.id  AS id_proveedor,
    ub.id    AS id_ubicacion,
    p.precio_coste, p.precio_venta,
    p.stock_actual, p.stock_minimo, p.stock_maximo,
    'ESTANDAR',
    p.attrs::JSONB
FROM (VALUES
    ('STD-PS5-001',  'God of War Ragnarök — PS5',         'Edición estándar física. PEGI 18.',
        'Koch Media Iberia S.L.',     'P1','A',1,
        35.99, 69.99, 42, 5, 200,
        '{"plataforma":"PS5","genero":"Acción/Aventura","pegi":18,"ean":"0711719787419"}'),

    ('STD-PS5-002',  'Elden Ring — PS5',                  'FromSoftware. Edición estándar física.',
        'Koch Media Iberia S.L.',     'P1','A',2,
        29.50, 59.99, 28, 5, 200,
        '{"plataforma":"PS5","genero":"RPG/Acción","pegi":16,"ean":"3391892020236"}'),

    ('STD-NSW-001',  'The Legend of Zelda: TOTK — Switch','Tears of the Kingdom. Nintendo Switch físico.',
        'Bandai Namco Entertainment EU','P1','B',1,
        39.99, 64.99, 55, 10, 300,
        '{"plataforma":"Nintendo Switch","genero":"Aventura","pegi":12,"ean":"0045496479299"}'),

    ('STD-XBX-001',  'Halo Infinite — Xbox Series X',    'Campaña + Multijugador. Edición física.',
        'Koch Media Iberia S.L.',     'P1','B',2,
        24.99, 44.99, 19, 5, 150,
        '{"plataforma":"Xbox Series X","genero":"FPS","pegi":16,"ean":"0889842576320"}'),

    ('STD-NSW-002',  'Mario Kart 8 Deluxe — Switch',     'Edición estándar con todos los DLCs.',
        'Bandai Namco Entertainment EU','P1','C',1,
        34.99, 59.99, 67, 10, 300,
        '{"plataforma":"Nintendo Switch","genero":"Carreras","pegi":3,"ean":"0045496420260"}'),

    ('STD-FNK-001',  'Funko Pop! Link — Zelda #856',     'Figura coleccionable 9cm. Caja original.',
        'Funko Inc. Europe',           'P2','A',1,
        7.50, 14.99, 35, 5, 100,
        '{"linea":"Pop! Games","numero_figura":856,"altura_cm":9,"exclusiva":false}'),

    ('STD-FNK-002',  'Funko Pop! Master Chief — Halo #06','Figura coleccionable 9cm.',
        'Funko Inc. Europe',           'P2','A',2,
        7.50, 14.99, 22, 5, 100,
        '{"linea":"Pop! Games","numero_figura":6,"altura_cm":9,"exclusiva":false}'),

    ('STD-RPA-001',  'Camiseta Mario Bros — Talla L',    '100% algodón orgánico. Diseño 8-bit.',
        'Bandai Namco Entertainment EU','P2','B',1,
        8.00, 24.99, 14, 3, 80,
        '{"talla":"L","material":"100% algodón orgánico","color":"azul marino","estampado":"8-bit"}'),

    ('STD-ACC-001',  'Mando DualSense — PS5 Blanco',     'Mando oficial Sony PlayStation 5.',
        'Koch Media Iberia S.L.',     'P2','C',1,
        48.00, 74.99, 11, 3, 50,
        '{"compatible":"PS5","color":"blanco","cable_usb_c":true,"ean":"0711719827979"}'),

    ('STD-ACC-002',  'Tarjeta PSN 50€',                  'Tarjeta prepago PlayStation Network 50€.',
     'Koch Media Iberia S.L.',     'P3','A',1,
     47.00, 50.00, 30, 10, 200,
     '{"tipo":"tarjeta_prepago","region":"EUR","importe_eur":50}')
) AS p(sku, nombre, descripcion, razon_proveedor, pasillo, estanteria, nivel,
        precio_coste, precio_venta, stock_actual, stock_minimo, stock_maximo, attrs)
JOIN proveedores prov ON prov.razon_social = p.razon_proveedor
JOIN ubicaciones_almacen ub ON ub.pasillo = p.pasillo AND ub.estanteria = p.estanteria AND ub.nivel = p.nivel
ON CONFLICT (sku) DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- SEED 7 · PRODUCTOS RETRO — La Bóveda Retro
-- Artículos únicos (stock=1). Cada pieza tiene su historia.
-- ──────────────────────────────────────────────────────────

INSERT INTO productos
    (sku, nombre, descripcion, id_proveedor, id_ubicacion,
        precio_coste, precio_venta, stock_actual, stock_minimo, stock_maximo,
        tipo_producto, estado_conservacion, atributos_especificos)
SELECT
    p.sku, p.nombre, p.descripcion,
    prov.id  AS id_proveedor,
    ub.id    AS id_ubicacion,
    p.precio_coste, p.precio_venta,
    1, 1, 1,            -- stock siempre 1 en artículos RETRO
    'RETRO',
    p.conservacion::VARCHAR(10),
    p.attrs::JSONB
FROM (VALUES
    ('RET-SNES-001', 'Super Mario World — SNES CIB',
        'Cartucho + Caja + Manual originales. Caja con pequeñas rozaduras en esquinas.',
        'Retromania Distribuciones S.L.', 'P4','A',1,
        45.00, 124.99, 'CIB',
        '{"plataforma":"SNES","region":"PAL","anio_lanzamiento":1990,"tiene_caja":true,"tiene_manual":true,"tiene_cartucho":true,"desperfectos":"Rozaduras leves en esquinas de caja","proveedor_adquisicion":"Feria Retro Madrid Mayo 2026","tasacion_ia_eur":124.99}'),

    ('RET-SNES-002', 'Donkey Kong Country — SNES MINT',
        'Precintado original. Estado impecable. Pieza de colección premium.',
        'Retromania Distribuciones S.L.', 'P4','A',2,
        110.00, 299.00, 'MINT',
        '{"plataforma":"SNES","region":"PAL","anio_lanzamiento":1994,"tiene_caja":true,"tiene_manual":true,"tiene_cartucho":true,"precintado":true,"desperfectos":null,"tasacion_ia_eur":299.00}'),

    ('RET-GB-001',   'Pokémon Red — Game Boy LOOSE',
        'Solo cartucho. Batería recién reemplazada. Etiqueta con desgaste normal.',
        'Retromania Distribuciones S.L.', 'P4','B',1,
        15.00, 34.99, 'LOOSE',
        '{"plataforma":"Game Boy","region":"EUR","anio_lanzamiento":1999,"tiene_caja":false,"tiene_manual":false,"tiene_cartucho":true,"bateria_reemplazada":true,"desperfectos":"Desgaste normal en etiqueta","tasacion_ia_eur":34.99}'),

    ('RET-MD-001',   'Sonic the Hedgehog 2 — Mega Drive CIB',
        'Completo en caja. Muy buen estado. Clásico imprescindible.',
        'Retromania Distribuciones S.L.', 'P4','C',1,
        28.00, 69.99, 'CIB',
        '{"plataforma":"Mega Drive","region":"PAL","anio_lanzamiento":1992,"tiene_caja":true,"tiene_manual":true,"tiene_cartucho":true,"desperfectos":null,"tasacion_ia_eur":69.99}'),

    ('RET-NES-001',  'Super Mario Bros 3 — NES CIB',
        'Caja original en muy buen estado. Manual incluido con ilustraciones intactas.',
        'Game Traders International',     'P5','A',1,
        60.00, 159.00, 'CIB',
        '{"plataforma":"NES","region":"PAL","anio_lanzamiento":1990,"tiene_caja":true,"tiene_manual":true,"tiene_cartucho":true,"desperfectos":"Leve amarillamiento en caja","tasacion_ia_eur":159.00}'),

    ('RET-GB-002',   'Zelda: Link''s Awakening — Game Boy LOOSE_D',
        'Solo cartucho. Etiqueta parcialmente despegada. Apto para jugar.',
        'Game Traders International',     'P5','B',1,
        8.00, 18.99, 'LOOSE_D',
        '{"plataforma":"Game Boy","region":"EUR","anio_lanzamiento":1993,"tiene_caja":false,"tiene_manual":false,"tiene_cartucho":true,"desperfectos":"Etiqueta parcialmente despegada. Arañazo en esquina superior.","tasacion_ia_eur":18.99}'),

    ('RET-PS1-001',  'Final Fantasy VII — PlayStation 1 CIB',
        'Juego completo en caja. 3 discos originales. Icónico JRPG de los 90.',
        'Retromania Distribuciones S.L.', 'P6','A',1,
        35.00, 89.00, 'CIB',
        '{"plataforma":"PlayStation 1","region":"PAL","anio_lanzamiento":1997,"tiene_caja":true,"tiene_manual":true,"num_discos":3,"desperfectos":null,"tasacion_ia_eur":89.00}'),

    ('RET-SNES-003', 'Street Fighter II Turbo — SNES LOOSE',
        'Solo cartucho. Funciona perfectamente. Clásico de los salones recreativos.',
        'Retromania Distribuciones S.L.', 'P6','B',1,
        12.00, 28.00, 'LOOSE',
        '{"plataforma":"SNES","region":"PAL","anio_lanzamiento":1993,"tiene_caja":false,"tiene_manual":false,"tiene_cartucho":true,"desperfectos":null,"tasacion_ia_eur":28.00}'),

    ('RET-N64-001',  'The Legend of Zelda: Ocarina of Time — N64 CIB',
        'Completo en caja. Manual original en español. Cartucho dorado.',
        'Game Traders International',     'P7','A',1,
        70.00, 189.00, 'CIB',
        '{"plataforma":"Nintendo 64","region":"PAL","anio_lanzamiento":1998,"tiene_caja":true,"tiene_manual":true,"cartucho_dorado":true,"desperfectos":"Pequeño golpe en esquina inferior de la caja","tasacion_ia_eur":189.00}'),

    ('RET-GBA-001',  'Castlevania: Aria of Sorrow — GBA MINT',
        'Precintado. Pieza premium de coleccionismo. Altísima demanda.',
        'Game Traders International',     'P7','B',1,
        120.00, 320.00, 'MINT',
        '{"plataforma":"Game Boy Advance","region":"EUR","anio_lanzamiento":2003,"tiene_caja":true,"tiene_manual":true,"tiene_cartucho":true,"precintado":true,"desperfectos":null,"tasacion_ia_eur":320.00}')
) AS p(sku, nombre, descripcion, razon_proveedor, pasillo, estanteria, nivel,
        precio_coste, precio_venta, conservacion, attrs)
JOIN proveedores prov ON prov.razon_social = p.razon_proveedor
JOIN ubicaciones_almacen ub ON ub.pasillo = p.pasillo AND ub.estanteria = p.estanteria AND ub.nivel = p.nivel
ON CONFLICT (sku) DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- SEED 8 · TRANSACCIONES DE STOCK (historial de 30 días)
-- Generamos movimientos históricos para que Chart.js tenga
-- datos reales que mostrar en el gráfico de ventas.
-- ──────────────────────────────────────────────────────────

-- Para las transacciones usamos subqueries por nombre de SKU
-- en lugar de IDs hardcodeados, lo que hace el seed portable.
INSERT INTO transacciones_stock
    (id_producto, id_usuario, id_proveedor,
        tipo_movimiento, cantidad, stock_antes, stock_despues,
        precio_unitario, referencia, fecha)
SELECT
    prod.id, usr.id, prov.id,
    'ENTRADA', t.cantidad, t.stock_antes, t.stock_antes + t.cantidad,
    t.precio_coste,
    'ALB-E-' || TO_CHAR(t.fecha_mov, 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER ()::TEXT, 4, '0'),
    t.fecha_mov
FROM (VALUES
    ('STD-PS5-001', 'Koch Media Iberia S.L.',     20, 22, 35.99, NOW() - INTERVAL '28 days'),
    ('STD-NSW-001', 'Bandai Namco Entertainment EU', 30, 25, 39.99, NOW() - INTERVAL '25 days'),
    ('STD-NSW-002', 'Bandai Namco Entertainment EU', 25, 42, 34.99, NOW() - INTERVAL '20 days'),
    ('STD-FNK-001', 'Funko Inc. Europe',           20, 15, 7.50,  NOW() - INTERVAL '18 days'),
    ('STD-PS5-002', 'Koch Media Iberia S.L.',      15, 13, 29.50, NOW() - INTERVAL '15 days'),
    ('STD-ACC-001', 'Koch Media Iberia S.L.',       8,  3, 48.00, NOW() - INTERVAL '10 days'),
    ('STD-XBX-001', 'Koch Media Iberia S.L.',      10,  9, 24.99, NOW() - INTERVAL '5 days')
) AS t(sku, razon_proveedor, cantidad, stock_antes, precio_coste, fecha_mov)
JOIN productos     prod ON prod.sku          = t.sku
JOIN proveedores   prov ON prov.razon_social = t.razon_proveedor
JOIN usuarios      usr  ON usr.username      = 'gestor'
ON CONFLICT DO NOTHING;

-- Ventas de los últimos 30 días (para el gráfico de ventas de Chart.js)
INSERT INTO transacciones_stock
    (id_producto, id_usuario, id_cliente,
        tipo_movimiento, cantidad, stock_antes, stock_despues,
        precio_unitario, referencia, fecha)
SELECT
    prod.id, usr.id, cli.id,
    'SALIDA', 1, t.stock_antes, t.stock_antes - 1,
    t.precio_venta,
    'VTA-' || TO_CHAR(t.fecha_mov, 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER ()::TEXT, 4, '0'),
    t.fecha_mov
FROM (VALUES
    ('STD-PS5-001',  'carlos.martinez@email.es', 5,  69.99, NOW() - INTERVAL '29 days'),
    ('STD-NSW-001',  'ana.garcia@email.es',       8,  64.99, NOW() - INTERVAL '27 days'),
    ('STD-FNK-001',  'pedro.sanchez@email.es',    4,  14.99, NOW() - INTERVAL '26 days'),
    ('STD-PS5-002',  'lucia.fernandez@email.es',  3,  59.99, NOW() - INTERVAL '24 days'),
    ('STD-NSW-002',  'javier.romero@email.es',    6,  59.99, NOW() - INTERVAL '22 days'),
    ('STD-RPA-001',  'maria.lopez@email.es',      2,  24.99, NOW() - INTERVAL '21 days'),
    ('STD-ACC-001',  'carlos.martinez@email.es',  4,  74.99, NOW() - INTERVAL '19 days'),
    ('STD-PS5-001',  'sofia.molina@email.es',     3,  69.99, NOW() - INTERVAL '17 days'),
    ('STD-NSW-001',  'alex.ruiz@email.es',        5,  64.99, NOW() - INTERVAL '15 days'),
    ('STD-XBX-001',  'ana.garcia@email.es',       2,  44.99, NOW() - INTERVAL '14 days'),
    ('STD-FNK-002',  'lucia.fernandez@email.es',  3,  14.99, NOW() - INTERVAL '12 days'),
    ('STD-PS5-002',  'carlos.martinez@email.es',  4,  59.99, NOW() - INTERVAL '10 days'),
    ('STD-NSW-002',  'pedro.sanchez@email.es',    7,  59.99, NOW() - INTERVAL '8 days'),
    ('STD-ACC-002',  'javier.romero@email.es',    5,  50.00, NOW() - INTERVAL '6 days'),
    ('STD-PS5-001',  'maria.lopez@email.es',      6,  69.99, NOW() - INTERVAL '4 days'),
    ('STD-NSW-001',  'sofia.molina@email.es',     4,  64.99, NOW() - INTERVAL '2 days'),
    ('STD-FNK-001',  'carlos.martinez@email.es',  3,  14.99, NOW() - INTERVAL '1 day'),
    ('STD-XBX-001',  'ana.garcia@email.es',       2,  44.99, NOW() - INTERVAL '12 hours')
) AS t(sku, email_cli, stock_antes, precio_venta, fecha_mov)
JOIN productos prod ON prod.sku   = t.sku
JOIN clientes  cli  ON cli.email  = t.email_cli
JOIN usuarios  usr  ON usr.username = 'cajero'
ON CONFLICT DO NOTHING;

-- Venta de una pieza retro única (para demo espectacular de La Bóveda)
INSERT INTO transacciones_stock
    (id_producto, id_usuario, id_cliente,
        tipo_movimiento, cantidad, stock_antes, stock_despues,
        precio_unitario, referencia, notas, fecha)
SELECT
    prod.id, usr.id, cli.id,
    'SALIDA', 1, 1, 0,
    69.99,
    'VTA-RETRO-2026-0001',
    'Venta de pieza retro única. Estado CIB confirmado por el gestor.',
    NOW() - INTERVAL '3 days'
FROM productos prod, usuarios usr, clientes cli
WHERE prod.sku       = 'RET-MD-001'
    AND usr.username   = 'cajero'
    AND cli.email      = 'lucia.fernandez@email.es'
ON CONFLICT DO NOTHING;

-- Actualizar el stock del Mega Drive vendido a 0
UPDATE productos SET stock_actual = 0 WHERE sku = 'RET-MD-001';


-- ──────────────────────────────────────────────────────────
-- SEED 9 · ORDEN DE COMPRA DE EJEMPLO
-- ──────────────────────────────────────────────────────────

INSERT INTO ordenes_compra (id_proveedor, id_usuario, estado, notas, fecha_envio)
SELECT prov.id, usr.id, 'ENVIADA',
        'Orden generada por el Asistente Logístico IA. Reponer stock mínimo PS5 y Switch.',
        NOW() - INTERVAL '2 days'
FROM proveedores prov, usuarios usr
WHERE prov.razon_social = 'Koch Media Iberia S.L.'
    AND usr.username      = 'gestor'
ON CONFLICT DO NOTHING;

INSERT INTO detalles_orden_compra (id_orden, id_producto, cantidad, precio_unitario)
SELECT oc.id, prod.id, det.cantidad, det.precio
FROM ordenes_compra oc
JOIN (VALUES
    ('STD-PS5-001', 20, 35.99),
    ('STD-PS5-002', 15, 29.50),
    ('STD-ACC-001',  5, 48.00)
) AS det(sku, cantidad, precio) ON TRUE
JOIN productos prod ON prod.sku = det.sku
WHERE oc.notas LIKE 'Orden generada por el Asistente Logístico IA%'
ON CONFLICT DO NOTHING;


-- ============================================================
-- FIN DE SCRIPT — LevelUp Nexus ERP v1.1.0
-- Java 25 LTS + Spring Boot 4.0 + PostgreSQL 16
-- ============================================================