-- ============================================================
--  NEXUS ERP — V5__audit_enrich_columns.sql (Flyway)
--  Enriquece audit_log con contexto de aplicación:
--  usuario, IP y detalle de la acción.
--  SAFE: solo ADD COLUMN (NULL defaults) y ALTER CONSTRAINT.
--  Los datos existentes NO se ven afectados.
-- ============================================================

-- 1. Ampliar VARCHAR(10) → VARCHAR(30) para admitir operaciones
--    de aplicación (ROLE_ASSIGN, STOCK_MOVEMENT, VERIFY_EMAIL…)
ALTER TABLE audit_log ALTER COLUMN operacion TYPE VARCHAR(30);

-- 2. Reemplazar el CHECK restrictivo por uno que incluya todos
--    los tipos de operación que emite la capa de aplicación.
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_operacion_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_operacion_check CHECK (
    operacion IN (
        'INSERT', 'UPDATE', 'DELETE',
        'LOGIN', 'LOGOUT', 'REGISTER', 'VERIFY_EMAIL',
        'ACTIVATE', 'DEACTIVATE',
        'ROLE_ASSIGN', 'ROLE_REMOVE',
        'STOCK_MOVEMENT'
    )
);

-- 3. Columnas de contexto de aplicación (NULL por defecto
--    para no romper las filas ya escritas por los triggers).
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS usuario_email VARCHAR(200) DEFAULT NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip            VARCHAR(45)  DEFAULT NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS detalles      TEXT         DEFAULT NULL;

-- 4. Índices para filtrado eficiente en la pantalla de auditoría
CREATE INDEX IF NOT EXISTS idx_al_usuario_email ON audit_log (usuario_email);
CREATE INDEX IF NOT EXISTS idx_al_operacion_app ON audit_log (operacion)
    WHERE usuario_email IS NOT NULL;
