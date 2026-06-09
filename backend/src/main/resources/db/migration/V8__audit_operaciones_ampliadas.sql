-- V8 — Amplía los valores permitidos en audit_log.operacion
--
-- La constraint original solo incluía operaciones de trigger BD (INSERT/UPDATE/DELETE)
-- y algunas de autenticación. Faltaban:
--   · CREATE        → alta de entidades desde la capa de negocio
--   · BACKUP_EXPORT → exportación de copia de seguridad
--   · BACKUP_RESTORE → restauración desde backup
-- Sin estos valores, las operaciones se ejecutaban correctamente pero su entrada
-- en el log de auditoría se descartaba en silencio con un error de constraint.

ALTER TABLE audit_log
    DROP CONSTRAINT IF EXISTS audit_log_operacion_check;

ALTER TABLE audit_log
    ADD CONSTRAINT audit_log_operacion_check CHECK (
        operacion IN (
            -- Operaciones de triggers BD
            'INSERT', 'UPDATE', 'DELETE',
            -- Autenticación
            'LOGIN', 'LOGOUT', 'REGISTER', 'VERIFY_EMAIL',
            -- Gestión de usuarios
            'ACTIVATE', 'DEACTIVATE', 'ROLE_ASSIGN', 'ROLE_REMOVE',
            -- Negocio / CRUD capa aplicación
            'CREATE',
            -- Stock
            'STOCK_MOVEMENT',
            -- Sistema
            'BACKUP_EXPORT', 'BACKUP_RESTORE'
        )
    );
