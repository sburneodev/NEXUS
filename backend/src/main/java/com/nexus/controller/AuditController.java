package com.nexus.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AuditController — GET /api/audit
 *
 * Devuelve únicamente entradas generadas por la capa de aplicación
 * (usuario_email IS NOT NULL), que son las que contienen contexto
 * completo: quién, qué, cuándo, IP y detalles legibles.
 *
 * Las entradas de los triggers de BD (sin email) quedan en la tabla
 * como backup pero no se exponen en el panel de administración.
 */
@RestController
@RequestMapping("/audit")
@PreAuthorize("hasAuthority('ADMIN')")
public class AuditController {

    private final JdbcTemplate jdbcTemplate;

    public AuditController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * GET /api/audit
     *
     * Parámetros:
     *   buscar    — búsqueda libre en email, detalles, tabla, operacion
     *   operacion — filtro exacto por tipo de acción
     *   tabla     — filtro exacto por entidad
     *   desde/hasta — rango temporal ISO-8601
     *   page / size — paginación (0-indexed, default 0/50)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(
            @RequestParam(required = false) String tabla,
            @RequestParam(required = false) String operacion,
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {

        StringBuilder where = new StringBuilder("WHERE usuario_email IS NOT NULL");
        List<Object> params = new ArrayList<>();

        if (tabla != null && !tabla.isBlank()) {
            where.append(" AND tabla = ?");
            params.add(tabla);
        }
        if (operacion != null && !operacion.isBlank()) {
            where.append(" AND operacion = ?");
            params.add(operacion);
        }
        if (buscar != null && !buscar.isBlank()) {
            String like = "%" + buscar.toLowerCase() + "%";
            where.append(" AND (LOWER(usuario_email) LIKE ?"
                       + " OR LOWER(COALESCE(detalles,'')) LIKE ?"
                       + " OR LOWER(tabla) LIKE ?"
                       + " OR LOWER(operacion) LIKE ?)");
            params.add(like); params.add(like); params.add(like); params.add(like);
        }
        if (desde != null) {
            where.append(" AND creado_en >= ?");
            params.add(desde);
        }
        if (hasta != null) {
            where.append(" AND creado_en <= ?");
            params.add(hasta);
        }

        // Total de registros
        String sqlCount = "SELECT COUNT(*) FROM audit_log " + where;
        Integer totalRaw = jdbcTemplate.queryForObject(sqlCount, Integer.class, params.toArray());
        int totalElements = totalRaw != null ? totalRaw : 0;
        int totalPages    = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
        if (totalElements > 0 && totalPages == 0) totalPages = 1;

        // Filas paginadas
        String sql = "SELECT * FROM audit_log " + where
                   + " ORDER BY creado_en DESC LIMIT ? OFFSET ?";
        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add((long) page * size);

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql, pageParams.toArray());

        // Normalizar columnas de BD → nombres del frontend (AuditEntry interface)
        List<Map<String, Object>> content = filas.stream().map(fila -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id",           fila.get("id"));
            entry.put("entidad",      fila.get("tabla"));
            entry.put("accion",       fila.get("operacion"));
            entry.put("usuarioEmail", fila.get("usuario_email"));
            entry.put("entidadId",    fila.get("id_registro"));   // TEXT → frontend lo muestra como string
            entry.put("detalles",     fila.get("detalles"));
            entry.put("timestamp",    fila.get("creado_en"));
            entry.put("ip",           fila.get("ip"));
            return entry;
        }).collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalElements", totalElements);
        response.put("totalPages",    totalPages);
        response.put("number",        page);
        response.put("size",          size);
        response.put("content",       content);
        return ResponseEntity.ok(response);
    }
}
