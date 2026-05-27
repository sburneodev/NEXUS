package com.nexus.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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
     * Parámetros de filtrado:
     *   tabla     — filtro exacto por entidad (PRODUCTO, CLIENTE…)
     *   operacion — filtro exacto por acción (CREATE, UPDATE, DELETE…)
     *   buscar    — búsqueda libre en usuario_email, detalles, tabla, operacion
     *   desde/hasta — rango temporal ISO-8601
     *   page / size — paginación (0-indexed, default 0/50)
     *
     * Respuesta: { totalElements, totalPages, number, size, content }
     * — compatible con PaginatedResponse<T> del frontend.
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

        StringBuilder where = new StringBuilder("WHERE 1=1");
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
                       + " OR LOWER(detalles) LIKE ?"
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

        // Total
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

        // Normalizar claves de columna → nombres del frontend (AuditEntry interface)
        List<Map<String, Object>> content = filas.stream().map(fila -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id",           fila.get("id"));
            entry.put("entidad",      fila.get("tabla"));
            entry.put("accion",       fila.get("operacion"));
            entry.put("usuarioEmail", fila.get("usuario_email"));
            entry.put("entidadId",    fila.get("entidad_id"));
            entry.put("detalles",     fila.get("detalles"));
            entry.put("timestamp",    fila.get("creado_en"));
            entry.put("ip",           fila.get("ip"));
            return entry;
        }).collect(Collectors.toList());

        // Respuesta compatible con PaginatedResponse<T>
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalElements", totalElements);
        response.put("totalPages",    totalPages);
        response.put("number",        page);
        response.put("size",          size);
        response.put("content",       content);
        return ResponseEntity.ok(response);
    }
}	