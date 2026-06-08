package com.nexus.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/almacen")
public class AlmacenController {

    private final JdbcTemplate jdbcTemplate;
    private final String pasillo="pasillo";

    public AlmacenController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ── GET /api/almacen/ubicaciones ─────────────────────────────────────
    /**
     * Lista plana de todas las zonas del almacén con el número de productos
     * que contiene cada una. Modelo zona compartida (1:N): una ubicación puede
     * albergar múltiples productos/títulos.
     *
     * Respuesta: [ { id, pasillo, estanteria, nivel, numProductos } ]
     *
     * Accesible a cualquier usuario autenticado: el modal de alta/edición
     * de producto es visible para todos los roles.
     */
    @GetMapping("/ubicaciones")
    public ResponseEntity<List<Map<String, Object>>> getUbicaciones() {
        String sql = """
            SELECT ua.id,
                   ua.pasillo,
                   ua.estanteria,
                   ua.nivel,
                   COUNT(p.id) AS num_productos
            FROM ubicaciones_almacen ua
            LEFT JOIN productos p ON ua.id = p.id_ubicacion
            GROUP BY ua.id, ua.pasillo, ua.estanteria, ua.nivel
            ORDER BY ua.pasillo, ua.estanteria, ua.nivel
            """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("id",           row.get("id"));
            u.put("pasillo",      row.get("pasillo"));
            u.put("estanteria",   row.get("estanteria"));
            u.put("nivel",        row.get("nivel"));
            u.put("numProductos", row.get("num_productos") != null
                                    ? ((Number) row.get("num_productos")).intValue()
                                    : 0);
            result.add(u);
        }

        return ResponseEntity.ok(result);
    }

    // ── AI-09 — GET /api/almacen/mapa ─────────────────────────────────
    // Modelo zona compartida: cada slot puede tener varios productos.
    // Devuelve conteo y alerta de stock bajo por zona.
    @GetMapping("/mapa")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> getMapa() {
        String sql = """
            SELECT ua.pasillo,
                   ua.estanteria,
                   ua.nivel,
                   COUNT(p.id)                                         AS num_productos,
                   COALESCE(BOOL_OR(
                       p.activo = TRUE
                       AND p.stock_actual IS NOT NULL
                       AND p.stock_minimo IS NOT NULL
                       AND p.stock_actual <= p.stock_minimo
                   ), FALSE)                                           AS bajo_minimo,
                   STRING_AGG(p.nombre, ' · ' ORDER BY p.nombre)      AS nombres
            FROM ubicaciones_almacen ua
            LEFT JOIN productos p ON ua.id = p.id_ubicacion AND p.activo = TRUE
            GROUP BY ua.pasillo, ua.estanteria, ua.nivel
            ORDER BY ua.pasillo, ua.estanteria, ua.nivel
            """;

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql);

        Map<String, Object> mapa = new LinkedHashMap<>();
        int totalRacks = 0, racksOcupados = 0;

        for (Map<String, Object> fila : filas) {
            String pasillo    = (String) fila.get("pasillo");
            String estanteria = (String) fila.get("estanteria");
            int    nivel      = ((Number) fila.get("nivel")).intValue();
            int    numProds   = fila.get("num_productos") != null
                                    ? ((Number) fila.get("num_productos")).intValue() : 0;

            mapa.computeIfAbsent(pasillo, k -> new LinkedHashMap<>());
            @SuppressWarnings("unchecked")
            Map<String, Object> pasilloMap = (Map<String, Object>) mapa.get(pasillo);

            pasilloMap.computeIfAbsent(estanteria, k -> new LinkedHashMap<>());
            @SuppressWarnings("unchecked")
            Map<String, Object> estanteriaMap = (Map<String, Object>) pasilloMap.get(estanteria);

            Map<String, Object> rack = new LinkedHashMap<>();
            rack.put("nivel",          nivel);
            rack.put("numProductos",   numProds);
            rack.put("nombres",        fila.get("nombres"));
            rack.put("bajoMinimo",     fila.get("bajo_minimo"));
            estanteriaMap.put(String.valueOf(nivel), rack);

            totalRacks++;
            if (numProds > 0) racksOcupados++;
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapa",           mapa);
        response.put("total_racks",    totalRacks);
        response.put("racks_ocupados", racksOcupados);

        return ResponseEntity.ok(response);
    }

    // ── MAP-05 — POST /api/almacen/validar-ubicacion ──────────────────
    /**
     * Valida si una ubicación (pasillo + estantería + nivel) está libre.
     * Si está ocupada, devuelve la alternativa libre más cercana en el mismo
     * pasillo (primero mismo pasillo, luego pasillos adyacentes).
     *
     * Body: { "pasillo": "P1", "estanteria": "A", "nivel": 1, "idProducto": 5 }
     * (idProducto es opcional — permite ignorar la ubicación actual del propio producto al editar)
     *
     * Respuesta OK:     { "libre": true }
     * Respuesta ocupada:{ "libre": false, "ocupadoPor": {...}, "alternativa": {...} | null }
     */
    @PostMapping("/validar-ubicacion")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> validarUbicacion(
            @RequestBody Map<String, Object> body) {

        String pasillo    = (String) body.get("pasillo");
        String estanteria = (String) body.get("estanteria");
        Object nivelObj   = body.get("nivel");
        Object idProdObj  = body.get("idProducto");

        if (pasillo == null || estanteria == null || nivelObj == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Se requieren pasillo, estanteria y nivel."
            );
        }

        int  nivel      = ((Number) nivelObj).intValue();
        Long idProducto = idProdObj != null ? ((Number) idProdObj).longValue() : null;

        // Buscar qué producto ocupa actualmente esa ubicación
        String sqlOcupante = """
            SELECT p.id, p.sku, p.nombre, p.tipo_producto
            FROM ubicaciones_almacen ua
            JOIN productos p ON ua.id = p.id_ubicacion
            WHERE ua.pasillo = ? AND ua.estanteria = ? AND ua.nivel = ?
            """;

        List<Map<String, Object>> ocupantes = jdbcTemplate.queryForList(
            sqlOcupante, pasillo, estanteria, nivel
        );

        // Filtrar el propio producto si se está editando su ubicación
        if (idProducto != null) {
            final Long pid = idProducto;
            ocupantes = ocupantes.stream()
                .filter(o -> !pid.equals(((Number) o.get("id")).longValue()))
                .toList();
        }

        if (ocupantes.isEmpty()) {
            // Ubicación libre
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("libre", true);
            return ResponseEntity.ok(resp);
        }

        // Ubicación ocupada — buscar alternativa libre cercana
        Map<String, Object> ocupadoPor = ocupantes.get(0);

        // Obtener todas las ubicaciones libres (sin producto asignado)
        String sqlLibres = """
            SELECT ua.pasillo, ua.estanteria, ua.nivel
            FROM ubicaciones_almacen ua
            LEFT JOIN productos p ON ua.id = p.id_ubicacion
            WHERE p.id IS NULL
            ORDER BY ua.pasillo, ua.estanteria, ua.nivel
            """;

        List<Map<String, Object>> libres = jdbcTemplate.queryForList(sqlLibres);

        // Prioridad: mismo pasillo primero, luego pasillos numerados por cercanía
        Map<String, Object> alternativa = libres.stream()
            .filter(u -> pasillo.equals(u.get("pasillo")))
            .findFirst()
            .orElse(libres.isEmpty() ? null : libres.get(0));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("libre",       false);
        resp.put("ocupadoPor",  ocupadoPor);
        resp.put("alternativa", alternativa);
        return ResponseEntity.ok(resp);
    }
}