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

    // ── AI-09 — GET /api/almacen/mapa ─────────────────────────────────
    @GetMapping("/mapa")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> getMapa() {
        String sql = """
            SELECT ua.pasillo, ua.estanteria, ua.nivel,
                   p.id as id_producto, p.sku, p.nombre,
                   p.stock_actual, p.stock_minimo, p.tipo_producto,
                   p.estado_conservacion, p.activo
            FROM ubicaciones_almacen ua
            LEFT JOIN productos p ON ua.id = p.id_ubicacion
            ORDER BY ua.pasillo, ua.estanteria, ua.nivel
            """;

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql);

        Map<String, Object> mapa = new LinkedHashMap<>();
        for (Map<String, Object> fila : filas) {
            String pasillo    = (String) fila.get("pasillo");
            String estanteria = (String) fila.get("estanteria");
            int    nivel      = ((Number) fila.get("nivel")).intValue();

            mapa.computeIfAbsent(pasillo, k -> new LinkedHashMap<>());
            @SuppressWarnings("unchecked")
            Map<String, Object> pasilloMap = (Map<String, Object>) mapa.get(pasillo);

            pasilloMap.computeIfAbsent(estanteria, k -> new LinkedHashMap<>());
            @SuppressWarnings("unchecked")
            Map<String, Object> estanteriaMap = (Map<String, Object>) pasilloMap.get(estanteria);

            Map<String, Object> rack = new LinkedHashMap<>();
            rack.put("nivel",               nivel);
            rack.put("id_producto",         fila.get("id_producto"));
            rack.put("sku",                 fila.get("sku"));
            rack.put("nombre",              fila.get("nombre"));
            rack.put("stock_actual",        fila.get("stock_actual"));
            rack.put("stock_minimo",        fila.get("stock_minimo"));
            rack.put("tipo_producto",       fila.get("tipo_producto"));
            rack.put("estado_conservacion", fila.get("estado_conservacion"));
            rack.put("bajo_minimo",
                fila.get("stock_actual") != null && fila.get("stock_minimo") != null &&
                ((Number) fila.get("stock_actual")).intValue() <=
                ((Number) fila.get("stock_minimo")).intValue());

            estanteriaMap.put(String.valueOf(nivel), rack);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapa",           mapa);
        response.put("total_racks",    filas.size());
        response.put("racks_ocupados", filas.stream().filter(f -> f.get("id_producto") != null).count());

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