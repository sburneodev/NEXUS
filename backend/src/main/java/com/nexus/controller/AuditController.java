package com.nexus.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/audit")
@PreAuthorize("hasAuthority('ADMIN')")
public class AuditController {

    private final JdbcTemplate jdbcTemplate;

    public AuditController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(
            @RequestParam(required = false) String tabla,
            @RequestParam(required = false) String operacion,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "0") int page,
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
        if (desde != null) {
            where.append(" AND creado_en >= ?");
            params.add(desde);
        }
        if (hasta != null) {
            where.append(" AND creado_en <= ?");
            params.add(hasta);
        }

        String sqlCount = "SELECT COUNT(*) FROM audit_log " + where;
        int total = jdbcTemplate.queryForObject(sqlCount, Integer.class, params.toArray());

        String sql = "SELECT * FROM audit_log " + where +
                     " ORDER BY creado_en DESC LIMIT ? OFFSET ?";
        params.add(size);
        params.add(page * size);

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql, params.toArray());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("total",   total);
        response.put("page",    page);
        response.put("size",    size);
        response.put("filas",   filas);
        return ResponseEntity.ok(response);
    }
}	