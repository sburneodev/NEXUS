package com.nexus.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.audit.AuditService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * SystemController — Backup y Restauración de datos NEXUS
 *
 * GET  /api/system/backup   → genera instantánea JSON de todas las entidades críticas
 * POST /api/system/restore  → restaura el sistema desde un archivo de backup validado
 *
 * Acceso: exclusivo ADMIN (doble capa: SecurityConfig + @PreAuthorize por método).
 */
@RestController
@RequestMapping("/system")
@PreAuthorize("hasAuthority('ADMIN')")
public class SystemController {

    private static final String BACKUP_SCHEMA        = "NEXUS_ERP_BACKUP";
    private static final String BACKUP_VERSION       = "1.0";
    private static final String APP_VERSION          = "1.0.0";
    private static final String TABLE_USUARIOS_ROLES = "usuarios_roles";

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    /** Tablas en orden de inserción (respeta FK constraints) */
    private static final List<String> TABLE_ORDER = List.of(
        "categorias",
        "proveedores",
        "ubicaciones_almacen",
        "roles",
        "usuarios",
        TABLE_USUARIOS_ROLES,
        "productos",
        "clientes"
    );

    /** Tablas con PK compuesta — ORDER BY personalizado */
    private static final Map<String, String> TABLE_ORDER_BY = Map.of(
        TABLE_USUARIOS_ROLES, "id_usuario, id_rol"
    );

    /**
     * Columnas de tipo timestamp.
     * En el backup pueden venir como epoch (Long) o como String ISO 8601.
     * Ambos casos se convierten a java.sql.Timestamp antes del INSERT.
     */
    private static final Set<String> TIMESTAMP_COLS = Set.of(
        "creado_en",
        "actualizado_en",
        "asignado_en",
        "fecha_transaccion",
        "last_login",
        "fecha_emision",
        "fecha_esperada",
        "verify_token_expiry",
        "created_at",
        "updated_at"
    );

    public SystemController(JdbcTemplate jdbcTemplate, AuditService auditService) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/system/backup
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/backup")
    public ResponseEntity<byte[]> exportBackup() {
        try {
            String adminEmail = getEmailActual();
            String timestamp  = OffsetDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

            Map<String, List<Map<String, Object>>> tables = new LinkedHashMap<>();
            StringBuilder checksum = new StringBuilder();

            for (String table : TABLE_ORDER) {
                String orderBy = TABLE_ORDER_BY.getOrDefault(table, "id");
                List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT * FROM " + table + " ORDER BY " + orderBy
                );
                tables.put(table, rows);
                checksum.append(table).append(":").append(rows.size()).append(" ");
            }

            Map<String, Object> backup = new LinkedHashMap<>();
            backup.put("schema",     BACKUP_SCHEMA);
            backup.put("version",    BACKUP_VERSION);
            backup.put("appVersion", APP_VERSION);
            backup.put("exportedAt", OffsetDateTime.now().toString());
            backup.put("exportedBy", adminEmail != null ? adminEmail : "system");
            backup.put("checksum",   checksum.toString().trim());
            backup.put("tables",     tables);

            byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(backup);

            auditService.log("SISTEMA", "BACKUP_EXPORT", null,
                "Backup exportado por " + adminEmail
                + " | tablas: " + tables.size()
                + " | checksum: [" + checksum.toString().trim() + "]");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setContentDispositionFormData("attachment", "nexus_backup_" + timestamp + ".json");
            headers.setContentLength(json.length);

            return new ResponseEntity<>(json, headers, HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // POST /api/system/restore
    // ══════════════════════════════════════════════════════════════════

    @PostMapping("/restore")
    public ResponseEntity<Map<String, Object>> importBackup(
            @RequestParam("file") MultipartFile file) {

        String adminEmail = getEmailActual();

        try {
            if (file.isEmpty()) return error("El archivo está vacío.");

            Map<String, Object> backup = parsearBackup(file);
            if (backup.isEmpty()) return error("El archivo no es un JSON válido.");

            if (!BACKUP_SCHEMA.equals(backup.get("schema"))) {
                return error("Archivo no reconocido. Solo se admiten backups generados por NEXUS ERP.");
            }

            @SuppressWarnings("unchecked")
            Map<String, List<Map<String, Object>>> tables =
                (Map<String, List<Map<String, Object>>>) backup.get("tables");

            if (tables == null) return error("El backup no contiene el bloque 'tables'.");

            ResponseEntity<Map<String, Object>> tablasMissing = validarTablas(tables);
            if (tablasMissing != null) return tablasMissing;

            if (!hasAdminInBackup(tables)) {
                return error(
                    "Restauración abortada: el backup no contiene ningún usuario " +
                    "con rol ADMIN. El sistema quedaría inaccesible."
                );
            }

            // Transacción manual — rollback completo si falla cualquier INSERT
            int[] totalRows = {0};
            jdbcTemplate.execute((java.sql.Connection conn) -> {
                boolean autoCommit = conn.getAutoCommit();
                conn.setAutoCommit(false);
                try {
                    totalRows[0] = restaurarTablas(tables);
                    conn.commit();
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                } finally {
                    conn.setAutoCommit(autoCommit);
                }
                return null;
            });

            String exportedAt = backup.getOrDefault("exportedAt", "desconocido").toString();
            String exportedBy = backup.getOrDefault("exportedBy", "desconocido").toString();

            auditService.log("SISTEMA", "BACKUP_RESTORE", null,
                "Restauración completada por " + adminEmail
                + " | exportado por " + exportedBy
                + " el " + exportedAt
                + " | filas restauradas: " + totalRows[0]);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("ok",             true);
            resp.put("totalRows",      totalRows[0]);
            resp.put("tablesRestored", TABLE_ORDER.size());
            resp.put("backupDate",     exportedAt);
            resp.put("backupAuthor",   exportedBy);
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("ok", false, "error", "Error interno: " + e.getMessage()));
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // Métodos privados
    // ══════════════════════════════════════════════════════════════════

    private Map<String, Object> parsearBackup(MultipartFile file) {
        try {
            return objectMapper.readValue(file.getBytes(), new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private ResponseEntity<Map<String, Object>> validarTablas(
            Map<String, List<Map<String, Object>>> tables) {
        List<String> missing = new ArrayList<>();
        for (String required : TABLE_ORDER) {
            if (!tables.containsKey(required)) missing.add(required);
        }
        if (!missing.isEmpty()) {
            return error("Faltan tablas en el backup: " + String.join(", ", missing));
        }
        return null;
    }

    private int restaurarTablas(Map<String, List<Map<String, Object>>> tables) {
        for (String table : TABLE_ORDER.reversed()) {
            jdbcTemplate.execute("TRUNCATE TABLE " + table + " RESTART IDENTITY CASCADE");
        }

        int totalRows = 0;
        for (String table : TABLE_ORDER) {
            List<Map<String, Object>> rows = tables.get(table);
            if (rows == null || rows.isEmpty()) continue;
            for (Map<String, Object> row : rows) {
                insertRow(table, row);
                totalRows++;
            }
            syncSequence(table);
        }
        return totalRows;
    }

    /**
     * Inserta una fila dinámica.
     * Usa ?::jsonb para columnas JSONB y ? para el resto.
     * Solo incluye columnas que existen físicamente en la tabla.
     */
    private void insertRow(String table, Map<String, Object> row) {
        Set<String> columnasReales = getColumnasTabla(table);
        Set<String> columnasJsonb  = getColumnasJsonb(table);

        List<String> cols = new ArrayList<>();
        List<Object> vals = new ArrayList<>();

        for (Map.Entry<String, Object> e : row.entrySet()) {
            String colName = e.getKey().toLowerCase();
            if (!columnasReales.contains(colName)) continue;
            cols.add("\"" + e.getKey() + "\"");
            vals.add(convertirValor(colName, e.getValue()));
        }

        if (cols.isEmpty()) return;

        List<String> placeholders = new ArrayList<>();
        for (String col : cols) {
            String colLower = col.replace("\"", "").toLowerCase();
            placeholders.add(columnasJsonb.contains(colLower) ? "?::jsonb" : "?");
        }

        String sql = "INSERT INTO " + table + " (" +
            String.join(", ", cols) + ") VALUES (" +
            String.join(", ", placeholders) + ")";

        jdbcTemplate.update(sql, vals.toArray());
    }

    /**
     * Convierte un valor del backup al tipo Java correcto para JDBC.
     *
     * - Timestamps (epoch Long o String ISO 8601) → java.sql.Timestamp
     * - JSONB (Map o List de Jackson)             → String JSON (el placeholder ?::jsonb hace el cast)
     * - Resto                                     → sin cambios
     */
    private Object convertirValor(String colName, Object valor) {
        if (valor == null) return null;

        // ── Timestamps ────────────────────────────────────────────────
        if (TIMESTAMP_COLS.contains(colName)) {
            if (valor instanceof Long epoch) {
                return new Timestamp(epoch);
            }
            if (valor instanceof Integer epoch) {
                return new Timestamp(epoch.longValue());
            }
            if (valor instanceof String strVal) {
                return parsearTimestamp(strVal);
            }
            if (valor instanceof OffsetDateTime odt) {
                return Timestamp.from(odt.toInstant());
            }
            return Timestamp.valueOf(valor.toString()
                .replace("T", " ")
                .replaceAll("\\+.*$", "")
                .replaceAll("Z$", "")
                .replaceAll("\\.\\d+$", ""));
        }

        // ── JSONB — serializar a String, el placeholder ?::jsonb hace el cast
        if (valor instanceof Map || valor instanceof List) {
            try {
                return objectMapper.writeValueAsString(valor);
            } catch (Exception e) {
                return null;
            }
        }

        return valor;
    }

    /**
     * Convierte un String ISO 8601 a java.sql.Timestamp.
     */
    private Timestamp parsearTimestamp(String valor) {
        if (valor == null || valor.isBlank()) return null;

        try {
            return Timestamp.from(OffsetDateTime.parse(valor).toInstant());
        } catch (DateTimeParseException ignored) {}

        try {
            String normalizado = valor.replace("T", " ").replaceAll("\\.\\d+$", "");
            return Timestamp.valueOf(normalizado);
        } catch (Exception ignored) {}

        return null;
    }

    /** Obtiene las columnas reales de una tabla desde information_schema. */
    private Set<String> getColumnasTabla(String table) {
        List<Map<String, Object>> cols = jdbcTemplate.queryForList(
            "SELECT column_name FROM information_schema.columns " +
            "WHERE table_name = ? AND table_schema = 'public'",
            table
        );
        Set<String> nombres = new HashSet<>();
        for (Map<String, Object> c : cols) {
            nombres.add(c.get("column_name").toString().toLowerCase());
        }
        return nombres;
    }

    /** Obtiene las columnas de tipo JSONB de una tabla. */
    private Set<String> getColumnasJsonb(String table) {
        List<Map<String, Object>> cols = jdbcTemplate.queryForList(
            "SELECT column_name FROM information_schema.columns " +
            "WHERE table_name = ? AND table_schema = 'public' AND data_type = 'jsonb'",
            table
        );
        Set<String> nombres = new HashSet<>();
        for (Map<String, Object> c : cols) {
            nombres.add(c.get("column_name").toString().toLowerCase());
        }
        return nombres;
    }

    /** Sincroniza la secuencia SERIAL al MAX(id) actual para evitar conflictos futuros. */
    private void syncSequence(String table) {
        try {
            jdbcTemplate.execute(
                "SELECT setval(pg_get_serial_sequence('" + table + "', 'id'), " +
                "COALESCE((SELECT MAX(id) FROM " + table + "), 0) + 1, false)"
            );
        } catch (Exception ignored) {
            // Tablas sin secuencia (ej. usuarios_roles PK compuesta) — ignorar
        }
    }

    /** Verifica que el backup tenga al menos un usuario con rol ADMIN. */
    private boolean hasAdminInBackup(Map<String, List<Map<String, Object>>> tables) {
        List<Map<String, Object>> roles         = tables.getOrDefault("roles", List.of());
        List<Map<String, Object>> usuariosRoles = tables.getOrDefault(TABLE_USUARIOS_ROLES, List.of());

        Set<Object> adminRoleIds = new HashSet<>();
        for (Map<String, Object> rol : roles) {
            Object nombre = rol.get("nombre");
            if (nombre != null &&
                (nombre.toString().equalsIgnoreCase("ADMIN") ||
                 nombre.toString().equalsIgnoreCase("ROLE_ADMIN"))) {
                adminRoleIds.add(rol.get("id"));
            }
        }

        if (adminRoleIds.isEmpty()) return false;

        for (Map<String, Object> ur : usuariosRoles) {
            if (adminRoleIds.contains(ur.get("id_rol"))) return true;
        }

        return false;
    }

    private ResponseEntity<Map<String, Object>> error(String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok",    false);
        body.put("error", message);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    private String getEmailActual() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) return auth.getName();
        } catch (Exception ignored) {}
        return "system";
    }
}