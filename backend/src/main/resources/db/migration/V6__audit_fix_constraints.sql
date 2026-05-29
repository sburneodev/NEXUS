-- ============================================================
--  NEXUS ERP — V6__audit_fix_constraints.sql (Flyway)
--
--  Corrige dos problemas en audit_log que impedían registrar
--  eventos de auditoría de la capa de aplicación:
--
--  1. id_registro era NOT NULL → los eventos AUTH (LOGIN,
--     REGISTER, VERIFY_EMAIL) sin entidad asociada fallaban
--     con violación de constraint, capturada en silencio.
--
--  2. La constraint CHECK sobre operacion podía haber quedado
--     con el nombre auto-generado por PostgreSQL diferente al
--     que V5 intentó eliminar, dejando activa la restricción
--     original que solo admite INSERT/UPDATE/DELETE.
--     Esta migración usa pg_constraint para eliminar TODAS las
--     constraints CHECK sobre la columna operacion, sin importar
--     su nombre, y vuelve a añadir la definitiva.
--
--  SAFE: completamente idempotente — no afecta datos existentes.
-- ============================================================


-- ── 1. id_registro ahora opcional ────────────────────────────
--  Los eventos AUTH (LOGIN, REGISTER…) no tienen entidad ID.
--  Los triggers de BD siempre escriben NEW.id::TEXT → no les afecta.
ALTER TABLE audit_log ALTER COLUMN id_registro DROP NOT NULL;


-- ── 2. Columnas de contexto (idempotente con IF NOT EXISTS) ──
--  Por si V5 no se aplicó o se aplicó parcialmente.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS usuario_email VARCHAR(200) DEFAULT NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip            VARCHAR(45)  DEFAULT NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS detalles      TEXT         DEFAULT NULL;


-- ── 3. Ampliar VARCHAR(10) → VARCHAR(30) si aún no se hizo ──
ALTER TABLE audit_log ALTER COLUMN operacion TYPE VARCHAR(30);


-- ── 4. Eliminar TODAS las CHECK constraints sobre "operacion" ─
--  Usa pg_constraint para encontrar el nombre real, sea cual sea
--  (audit_log_operacion_check, audit_log_operacion_check1, etc.)
DO $$
DECLARE
    v_nombre TEXT;
BEGIN
    FOR v_nombre IN
        SELECT con.conname
        FROM   pg_constraint  con
        JOIN   pg_class       cls ON cls.oid = con.conrelid
        JOIN   pg_attribute   att ON att.attrelid = cls.oid
                                 AND att.attnum   = ANY(con.conkey)
        WHERE  cls.relname  = 'audit_log'
          AND  con.contype  = 'c'          -- 'c' = CHECK constraint
          AND  att.attname  = 'operacion'
    LOOP
        EXECUTE format('ALTER TABLE audit_log DROP CONSTRAINT %I', v_nombre);
        RAISE NOTICE 'Eliminada constraint: %', v_nombre;
    END LOOP;
END $$;


-- ── 5. Añadir constraint CHECK definitiva ─────────────────────
ALTER TABLE audit_log ADD CONSTRAINT audit_log_operacion_check CHECK (
    operacion IN (
        -- Triggers de BD (no cambian)
        'INSERT', 'UPDATE', 'DELETE',
        -- Autenticación
        'LOGIN', 'LOGOUT', 'REGISTER', 'VERIFY_EMAIL',
        -- Gestión de cuentas
        'ACTIVATE', 'DEACTIVATE',
        -- Roles
        'ROLE_ASSIGN', 'ROLE_REMOVE',
        -- Inventario
        'STOCK_MOVEMENT'
    )
);


-- ── 6. Índices (idempotente con IF NOT EXISTS) ────────────────
CREATE INDEX IF NOT EXISTS idx_al_usuario_email
    ON audit_log (usuario_email);

CREATE INDEX IF NOT EXISTS idx_al_operacion_app
    ON audit_log (operacion)
    WHERE usuario_email IS NOT NULL;
