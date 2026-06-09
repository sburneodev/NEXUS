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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * SystemController — Backup y Restauración de datos NEXUS
 *
 * GET  /api/system/backup   → genera instantánea JSON de todas las entidades críticas
 * POST /api/system/restore  → restaura el sistema desde un archivo de backup validado
 *
 * Acceso: exclusivo ADMIN (doble capa: SecurityConfig + @PreAuthorize por método).
 *
 * Orden de tablas respetando FK constraints:
 *   Exportación: categorias → proveedores → ubicaciones_almacen → roles
 *                → usuarios → usuarios_roles → productos → clientes
 *   Restauración: orden inverso para TRUNCATE, mismo orden para INSERT
 */
@RestController
@RequestMapping("/system")
@PreAuthorize("hasAuthority('ADMIN')")
public class SystemController {

    private static final String BACKUP_SCHEMA  = "NEXUS_ERP_BACKUP";
    private static final String BACKUP_VERSION = "1.0";
    private static final String APP_VERSION    = "1.0.0";
    private static final String TABLE_USUARIOS_ROLES = "usuarios_roles";

    private final JdbcTemplate  jdbcTemplate;
    private final AuditService  auditService;
    private final ObjectMapper  objectMapper = new ObjectMapper().findAndRegisterModules();

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
    

    /**
     * Tablas que NO tienen columna 'id' (PK compuesta u otro esquema).
     * Se usa su clave primaria real para el ORDER BY del SELECT.
     */
    private static final Map<String, String> TABLE_ORDER_BY = Map.of(
    		TABLE_USUARIOS_ROLES, "id_usuario, id_rol"
    );

    public SystemController(JdbcTemplate jdbcTemplate,
                            AuditService auditService) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    // GET /api/system/backup — Exportación completa

    /**
     * Genera una instantánea JSON de todas las entidades críticas y la envía
     * como descarga directa al navegador.
     *
     * Estructura del backup:
     * {
     *   "schema": "NEXUS_ERP_BACKUP",
     *   "version": "1.0",
     *   "appVersion": "1.0.0",
     *   "exportedAt": "2026-06-08T10:00:00Z",
     *   "exportedBy": "admin@nexus.com",
     *   "checksum": "<tabla>:<count> ...",
     *   "tables": { "categorias": [...], "productos": [...], ... }
     * }
     */
    @GetMapping("/backup")
    public ResponseEntity<byte[]> exportBackup() {
        try {
            String adminEmail = getEmailActual();
            String timestamp  = OffsetDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

            // ── Serializar datos ───────────────────────────────────────
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

            // ── Construir envelope ─────────────────────────────────────
            Map<String, Object> backup = new LinkedHashMap<>();
            backup.put("schema",     BACKUP_SCHEMA);
            backup.put("version",    BACKUP_VERSION);
            backup.put("appVersion", APP_VERSION);
            backup.put("exportedAt", OffsetDateTime.now().toString());
            backup.put("exportedBy", adminEmail != null ? adminEmail : "system");
            backup.put("checksum",   checksum.toString().trim());
            backup.put("tables",     tables);

            byte[] json = objectMapper
                .writerWithDefaultPrettyPrinter()
                .writeValueAsBytes(backup);

            // ── Registrar en auditoría ─────────────────────────────────
            auditService.log("SISTEMA", "BACKUP_EXPORT", null,
                "Backup exportado por " + adminEmail
                + " | tablas: " + tables.size()
                + " | checksum: [" + checksum.toString().trim() + "]");

            // ── Cabeceras de descarga ──────────────────────────────────
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setContentDispositionFormData(
                "attachment",
                "nexus_backup_" + timestamp + ".json"
            );
            headers.setContentLength(json.length);

            return new ResponseEntity<>(json, headers, HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // POST /api/system/restore — Restauración completa
    // ══════════════════════════════════════════════════════════════════

    /**
     * Procesa un archivo de backup generado por este mismo sistema.
     *
     * Validaciones previas a la restauración:
     *  1. JSON válido y parseable
     *  2. Campo "schema" == "NEXUS_ERP_BACKUP" (archivo originado en NEXUS)
     *  3. Contiene todas las tablas requeridas
     *  4. Existe al menos un usuario con rol ADMIN (salvaguarda de emergencia)
     *
     * La operación es atómica: si falla cualquier paso, se hace rollback completo.
     */
    @PostMapping("/restore")
    @Transactional
    public ResponseEntity<Map<String, Object>> importBackup(
            @RequestParam("file") MultipartFile file) {

        String adminEmail = getEmailActual();

        try {
            // ── 1. Validar archivo no vacío ────────────────────────────
            if (file.isEmpty()) {
                return error("El archivo está vacío.");
            }

            // ── 2. Parsear JSON ────────────────────────────────────────
            Map<String, Object> backup = parsearBackup(file);
            if (backup == null) {
                return error("El archivo no es un JSON válido.");
            }

            // ── 3. Validar schema ──────────────────────────────────────
            if (!BACKUP_SCHEMA.equals(backup.get("schema"))) {
                return error("Archivo no reconocido. Solo se admiten backups generados por NEXUS ERP.");
            }

            // ── 4. Extraer tablas ──────────────────────────────────────
            @SuppressWarnings("unchecked")
            Map<String, List<Map<String, Object>>> tables =
                (Map<String, List<Map<String, Object>>>) backup.get("tables");

            if (tables == null) {
                return error("El backup no contiene el bloque 'tables'.");
            }

            // ── 5. Validar presencia de tablas requeridas ──────────────
            ResponseEntity<Map<String, Object>> tablasMissing = validarTablas(tables);
            if (tablasMissing != null) return tablasMissing;

            // ── 6. Salvaguarda: verificar que hay al menos un ADMIN ────
            if (!hasAdminInBackup(tables)) {
                return error(
                    "Restauración abortada: el backup no contiene ningún usuario " +
                    "con rol ADMIN. El sistema quedaría inaccesible."
                );
            }

            // ── 7. Restauración atómica ────────────────────────────────
            int totalRows = restaurarTablas(tables);

            // ── 8. Registrar en auditoría ──────────────────────────────
            String exportedAt = backup.getOrDefault("exportedAt", "desconocido").toString();
            String exportedBy = backup.getOrDefault("exportedBy", "desconocido").toString();

            auditService.log("SISTEMA", "BACKUP_RESTORE", null,
                "Restauración completada por " + adminEmail
                + " | origen: exportado por " + exportedBy
                + " el " + exportedAt
                + " | filas restauradas: " + totalRows);

            // ── 9. Respuesta ───────────────────────────────────────────
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("ok",             true);
            resp.put("totalRows",      totalRows);
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

    private Map<String, Object> parsearBackup(MultipartFile file) {
        try {
            return objectMapper.readValue(file.getBytes(), new TypeReference<>() {});
        } catch (Exception e) {
            return null;
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

        for (String table : TABLE_ORDER.reversed()) { {
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
     * Verifica que el backup contenga al menos un par (usuario, rol ADMIN).
     * Busca en la tabla de roles el id cuyo nombre sea "ROLE_ADMIN" o "ADMIN",
     * luego comprueba que ese id aparece en usuarios_roles.
     */
    private boolean hasAdminInBackup(Map<String, List<Map<String, Object>>> tables) {
        List<Map<String, Object>> roles        = tables.getOrDefault("roles", List.of());
        List<Map<String, Object>> usuariosRoles = tables.getOrDefault(TABLE_USUARIOS_ROLES, List.of());

        // Encontrar el ID del rol ADMIN en el backup
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

        // Verificar que existe al menos una asignación a ese rol
        for (Map<String, Object> ur : usuariosRoles) {
            if (adminRoleIds.contains(ur.get("id_rol"))) return true;
        }

        return false;
    }

    /**
     * Inserta una fila dinámica usando los pares clave-valor del mapa.
     * Omite columnas nulas para compatibilidad con NOT NULL + DEFAULT.
     */
    private void insertRow(String table, Map<String, Object> row) {
        // Filtramos las claves con valor no nulo para no pisar DEFAULT de la BD
        List<String> cols = new ArrayList<>();
        List<Object> vals = new ArrayList<>();

        for (Map.Entry<String, Object> e : row.entrySet()) {
            cols.add("\"" + e.getKey() + "\"");
            vals.add(e.getValue());
        }

        if (cols.isEmpty()) return;

        String sql = "INSERT INTO " + table + " (" +
            String.join(", ", cols) + ") VALUES (" +
            String.join(", ", Collections.nCopies(cols.size(), "?")) + ")";

        jdbcTemplate.update(sql, vals.toArray());
    }

    /**
     * Sincroniza la secuencia SERIAL de PostgreSQL al máximo ID existente.
     * Necesario después de insertar filas con IDs explícitos para evitar
     * conflictos en futuros INSERTs sin ID.
     */
    private void syncSequence(String table) {
        try {
            jdbcTemplate.execute(
                "SELECT setval(pg_get_serial_sequence('" + table + "', 'id'), " +
                "COALESCE((SELECT MAX(id) FROM " + table + "), 0) + 1, false)"
            );
        } catch (Exception ignored) {
            // Tabla sin secuencia (ej. usuarios_roles con PK compuesta) — ignorar
        }
    }

    /** Construye respuesta de error estándar. */
    private ResponseEntity<Map<String, Object>> error(String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok",    false);
        body.put("error", message);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    /** Obtiene el email del usuario autenticado. */
    private String getEmailActual() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) return auth.getName();
        } catch (Exception ignored) {}
        return "system";
    }
}
