package com.nexus.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/almacen")
public class AlmacenController {

    private final JdbcTemplate jdbcTemplate;

    public AlmacenController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // AI-09 — GET /api/almacen/mapa
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

        // Estructurar pasillo → estanteria → nivel
        Map<String, Object> mapa = new LinkedHashMap<>();

        for (Map<String, Object> fila : filas) {
            String pasillo    = (String) fila.get("pasillo");
            String estanteria = (String) fila.get("estanteria");
            int    nivel      = ((Number) fila.get("nivel")).intValue();

            mapa.computeIfAbsent(pasillo, k -> new LinkedHashMap<>());
            Map<String, Object> pasilloMap = (Map<String, Object>) mapa.get(pasillo);

            pasilloMap.computeIfAbsent(estanteria, k -> new LinkedHashMap<>());
            Map<String, Object> estanteriaMap = (Map<String, Object>) pasilloMap.get(estanteria);

            Map<String, Object> rack = new LinkedHashMap<>();
            rack.put("nivel",              nivel);
            rack.put("id_producto",        fila.get("id_producto"));
            rack.put("sku",                fila.get("sku"));
            rack.put("nombre",             fila.get("nombre"));
            rack.put("stock_actual",       fila.get("stock_actual"));
            rack.put("stock_minimo",       fila.get("stock_minimo"));
            rack.put("tipo_producto",      fila.get("tipo_producto"));
            rack.put("estado_conservacion",fila.get("estado_conservacion"));
            rack.put("bajo_minimo",        fila.get("stock_actual") != null &&
                                           fila.get("stock_minimo") != null &&
                                           ((Number)fila.get("stock_actual")).intValue() <=
                                           ((Number)fila.get("stock_minimo")).intValue());

            estanteriaMap.put(String.valueOf(nivel), rack);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapa",          mapa);
        response.put("total_racks",   filas.size());
        response.put("racks_ocupados",filas.stream().filter(f -> f.get("id_producto") != null).count());

        return ResponseEntity.ok(response);
    }
}