-- ============================================================
--  LevelUp Nexus ERP — sql/init_schema.sql
--  Docker: montado como 01_schema.sql en initdb
--  Motor: PostgreSQL 16 | Versión: v1.2.0
--  Autores: Desirée Cobo Batalla & Sebastián Burneo Reyes
--  ─────────────────────────────────────────────────────────
--  SOLO DDL: CREATE TABLE, CREATE INDEX, extensiones.
--  SIN triggers, SIN stored procedures, SIN inserts.
--  Ejecutado por Docker al crear el contenedor por 1ª vez.
--  El equivalente Flyway es V1__init_schema.sql
-- ============================================================

-- ── EXTENSIONES ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- BLOQUE 1 · RBAC — ROLES, USUARIOS Y TABLA PUENTE
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id          BIGSERIAL   PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT        NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL    PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    username        VARCHAR(60)  NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL DEFAULT '',
    password_hash   VARCHAR(255) NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    verify_token    VARCHAR(36)  DEFAULT NULL,
    verify_expires  TIMESTAMPTZ  DEFAULT NULL,
    last_login      TIMESTAMPTZ  DEFAULT NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email        ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_verify_token ON usuarios (verify_token);

-- Relación M:N usuario ↔ rol
CREATE TABLE IF NOT EXISTS usuarios_roles (
    id_usuario  BIGINT      NOT NULL,
    id_rol      BIGINT      NOT NULL,
    asignado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_usuarios_roles PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT fk_ur_usuario     FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_ur_rol         FOREIGN KEY (id_rol)     REFERENCES roles(id)    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- BLOQUE 2 · CATEGORÍAS
-- Árbol auto-referenciado: una categoría puede tener un padre.
-- es_retro=TRUE marca las categorías que pertenecen a La Bóveda.
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias (
    id           BIGSERIAL    PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL UNIQUE,
    descripcion  TEXT         DEFAULT NULL,
    id_padre     BIGINT       DEFAULT NULL,
    es_retro     BOOLEAN      NOT NULL DEFAULT FALSE,
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_cat_padre FOREIGN KEY (id_padre) REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cat_padre   ON categorias (id_padre);
CREATE INDEX IF NOT EXISTS idx_cat_retro   ON categorias (es_retro);

-- ============================================================
-- BLOQUE 3 · TERCEROS — PROVEEDORES Y CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS proveedores (
    id               BIGSERIAL    PRIMARY KEY,
    razon_social     VARCHAR(200) NOT NULL,
    cif              VARCHAR(20)  DEFAULT NULL UNIQUE,
    email            VARCHAR(150) DEFAULT NULL,
    telefono         VARCHAR(30)  DEFAULT NULL,
    direccion        TEXT         DEFAULT NULL,
    -- días hábiles de plazo de entrega medio
    tiempo_entrega_d SMALLINT     DEFAULT NULL,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prov_razon_social ON proveedores (razon_social);
CREATE INDEX IF NOT EXISTS idx_prov_activo        ON proveedores (activo);

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

CREATE INDEX IF NOT EXISTS idx_cli_email  ON clientes (email);
CREATE INDEX IF NOT EXISTS idx_cli_nombre ON clientes (nombre);

-- ============================================================
-- BLOQUE 4 · INVENTARIO — UBICACIONES Y PRODUCTOS
-- ============================================================

-- Coordenadas físicas del almacén (pasillo × estantería × nivel).
-- Relación 1:1 con productos: la FK UNIQUE en productos lo garantiza.
CREATE TABLE IF NOT EXISTS ubicaciones_almacen (
    id          BIGSERIAL   PRIMARY KEY,
    pasillo     VARCHAR(10) NOT NULL,   -- 'P1' … 'P8'
    estanteria  VARCHAR(5)  NOT NULL,   -- 'A' … 'F'
    nivel       SMALLINT    NOT NULL CHECK (nivel BETWEEN 1 AND 6),
    descripcion TEXT        DEFAULT NULL,
    CONSTRAINT uq_ubicacion_coords UNIQUE (pasillo, estanteria, nivel)
);

-- Catálogo híbrido: ESTANDAR (masivo, reponible) y RETRO (pieza única).
-- atributos_especificos JSONB absorbe los campos variables de cada tipo
-- sin romper la 3FN del esquema relacional principal.
CREATE TABLE IF NOT EXISTS productos (
    id                    BIGSERIAL     PRIMARY KEY,
    sku                   VARCHAR(50)   NOT NULL UNIQUE,
    nombre                VARCHAR(200)  NOT NULL,
    descripcion           TEXT          DEFAULT NULL,

    id_categoria          BIGINT        DEFAULT NULL,
    id_proveedor          BIGINT        DEFAULT NULL,
    id_ubicacion          BIGINT        DEFAULT NULL UNIQUE,  -- UNIQUE → 1:1

    precio_coste          NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_coste  >= 0),
    precio_venta          NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_venta  >= 0),
    stock_actual          INT           NOT NULL DEFAULT 0    CHECK (stock_actual   >= 0),
    stock_minimo          INT           NOT NULL DEFAULT 0    CHECK (stock_minimo   >= 0),
    stock_maximo          INT           NOT NULL DEFAULT 9999 CHECK (stock_maximo   >= 0),

    tipo_producto         VARCHAR(10)   NOT NULL DEFAULT 'ESTANDAR'
                              CHECK (tipo_producto IN ('ESTANDAR','RETRO')),

    -- Solo aplica a tipo_producto = 'RETRO'
    estado_conservacion   VARCHAR(10)   DEFAULT NULL
                              CHECK (estado_conservacion IN ('MINT','CIB','LOOSE','LOOSE_D')),

    -- JSONB polimórfico:
    --   RETRO    → {"plataforma":"SNES","region":"PAL","anio":1990,
    --               "tiene_caja":true,"tiene_manual":false,"tasacion_ia_eur":120.00}
    --   ESTANDAR → {"ean":"8412345678901","linea":"Pop! Games","numero_figura":856}
    atributos_especificos JSONB         DEFAULT NULL,

    activo         BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prod_categoria  FOREIGN KEY (id_categoria) REFERENCES categorias(id)         ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_prod_proveedor  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id)        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_prod_ubicacion  FOREIGN KEY (id_ubicacion) REFERENCES ubicaciones_almacen(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- BTREE: filtros y JOINs frecuentes
CREATE INDEX IF NOT EXISTS idx_prod_tipo      ON productos (tipo_producto);
CREATE INDEX IF NOT EXISTS idx_prod_stock     ON productos (stock_actual);
CREATE INDEX IF NOT EXISTS idx_prod_activo    ON productos (activo);
CREATE INDEX IF NOT EXISTS idx_prod_proveedor ON productos (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_prod_categoria ON productos (id_categoria);

-- GIN: búsquedas dentro del JSONB (operadores @> y ?)
-- Ejemplo: WHERE atributos_especificos @> '{"plataforma":"SNES"}'
CREATE INDEX IF NOT EXISTS idx_prod_attrs_gin ON productos USING GIN (atributos_especificos);

-- GIN: full-text search en español sobre nombre y descripción
CREATE INDEX IF NOT EXISTS idx_prod_fts ON productos USING GIN (
    to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion,''))
);

-- ============================================================
-- BLOQUE 5 · MOVIMIENTOS DE STOCK
-- Log inmutable. Solo inserts. Nunca se actualiza ni borra.
-- ============================================================

CREATE TABLE IF NOT EXISTS transacciones_stock (
    id              BIGSERIAL     PRIMARY KEY,
    id_producto     BIGINT        NOT NULL,
    id_usuario      BIGINT        NOT NULL,
    id_cliente      BIGINT        DEFAULT NULL,  -- SALIDA → cliente
    id_proveedor    BIGINT        DEFAULT NULL,  -- ENTRADA → proveedor
    tipo_movimiento VARCHAR(10)   NOT NULL CHECK (tipo_movimiento IN ('ENTRADA','SALIDA','AJUSTE')),
    cantidad        INT           NOT NULL,
    stock_antes     INT           NOT NULL,
    stock_despues   INT           NOT NULL,
    precio_unitario NUMERIC(10,2) DEFAULT NULL,
    referencia      VARCHAR(100)  DEFAULT NULL,
    notas           TEXT          DEFAULT NULL,
    fecha           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tx_producto  FOREIGN KEY (id_producto)  REFERENCES productos(id)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tx_usuario   FOREIGN KEY (id_usuario)   REFERENCES usuarios(id)    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tx_cliente   FOREIGN KEY (id_cliente)   REFERENCES clientes(id)    ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_tx_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tx_producto ON transacciones_stock (id_producto);
CREATE INDEX IF NOT EXISTS idx_tx_usuario  ON transacciones_stock (id_usuario);
CREATE INDEX IF NOT EXISTS idx_tx_fecha    ON transacciones_stock (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_tx_tipo     ON transacciones_stock (tipo_movimiento);

-- ============================================================
-- BLOQUE 6 · ÓRDENES DE COMPRA
-- ============================================================

CREATE TABLE IF NOT EXISTS ordenes_compra (
    id              BIGSERIAL   PRIMARY KEY,
    id_proveedor    BIGINT      NOT NULL,
    id_usuario      BIGINT      NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
                        CHECK (estado IN ('BORRADOR','ENVIADA','CONFIRMADA','RECIBIDA','CANCELADA')),
    notas           TEXT        DEFAULT NULL,
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_envio     TIMESTAMPTZ DEFAULT NULL,
    fecha_recepcion TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT fk_oc_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_oc_usuario   FOREIGN KEY (id_usuario)   REFERENCES usuarios(id)    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oc_proveedor ON ordenes_compra (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_oc_estado    ON ordenes_compra (estado);
CREATE INDEX IF NOT EXISTS idx_oc_fecha     ON ordenes_compra (fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS detalles_orden_compra (
    id              BIGSERIAL     PRIMARY KEY,
    id_orden        BIGINT        NOT NULL,
    id_producto     BIGINT        NOT NULL,
    cantidad        INT           NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    CONSTRAINT fk_doc_orden    FOREIGN KEY (id_orden)    REFERENCES ordenes_compra(id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_doc_producto FOREIGN KEY (id_producto) REFERENCES productos(id)      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_doc_linea    UNIQUE (id_orden, id_producto)
);

CREATE INDEX IF NOT EXISTS idx_doc_orden ON detalles_orden_compra (id_orden);

-- ============================================================
-- BLOQUE 7 · AUDITORÍA
-- Tabla inmutable. Solo escribe fn_audit_trigger() (en triggers.sql).
-- Ningún endpoint de la API tiene permiso de INSERT/UPDATE/DELETE aquí.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id            BIGSERIAL   PRIMARY KEY,
    tabla         VARCHAR(60) NOT NULL,
    operacion     VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
    id_registro   TEXT        NOT NULL,
    datos_antes   JSONB       DEFAULT NULL,
    datos_despues JSONB       DEFAULT NULL,
    usuario_bd    TEXT        NOT NULL DEFAULT current_user,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_al_tabla      ON audit_log (tabla);
CREATE INDEX IF NOT EXISTS idx_al_operacion  ON audit_log (operacion);
CREATE INDEX IF NOT EXISTS idx_al_creado_en  ON audit_log (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_al_id_reg     ON audit_log (id_registro);