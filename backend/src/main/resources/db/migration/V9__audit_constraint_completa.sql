-- V9: constraint completa con CHANGE_PASSWORD
DO $$
DECLARE v_nombre TEXT;
BEGIN
    FOR v_nombre IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_class cls ON cls.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey)
        WHERE cls.relname = 'audit_log' AND con.contype = 'c' AND att.attname = 'operacion'
    LOOP
        EXECUTE format('ALTER TABLE audit_log DROP CONSTRAINT %I', v_nombre);
    END LOOP;
END $$;

ALTER TABLE audit_log ADD CONSTRAINT audit_log_operacion_check CHECK (
    operacion IN (
        'INSERT', 'UPDATE', 'DELETE',
        'LOGIN', 'LOGOUT', 'REGISTER', 'VERIFY_EMAIL',
        'ACTIVATE', 'DEACTIVATE', 'ROLE_ASSIGN', 'ROLE_REMOVE',
        'CREATE', 'STOCK_MOVEMENT',
        'BACKUP_EXPORT', 'BACKUP_RESTORE',
        'CHANGE_PASSWORD'
    )
);