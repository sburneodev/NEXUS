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

    private static final String COL_PASILLO    = "pasillo";
    private static final String COL_ESTANTERIA = "estanteria";
    private static final String COL_NIVEL      = "nivel";

    private final JdbcTemplate jdbcTemplate;

    public AlmacenController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

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
            u.put(COL_PASILLO,    row.get(COL_PASILLO));
            u.put(COL_ESTANTERIA, row.get(COL_ESTANTERIA));
            u.put(COL_NIVEL,      row.get(COL_NIVEL));
            u.put("numProductos", row.get("num_productos") != null
                                    ? ((Number) row.get("num_productos")).intValue()
                                    : 0);
            result.add(u);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/mapa")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> getMapa() {
        String sql = """
            SELECT ua.pasillo,
                   ua.estanteria,
                   ua.nivel                        AS nivel_rack,
                   p.id                            AS id_producto,
                   p.sku,
                   p.nombre,
                   p.stock_actual,
                   p.stock_minimo,
                   p.tipo_producto,
                   p.estado_conservacion,
                   CASE
                       WHEN p.stock_actual IS NOT NULL
                        AND p.stock_minimo IS NOT NULL
                        AND p.stock_actual <= p.stock_minimo
                       THEN TRUE ELSE FALSE
                   END                             AS bajo_minimo
            FROM ubicaciones_almacen ua
            LEFT JOIN productos p ON ua.id = p.id_ubicacion AND p.activo = TRUE
            ORDER BY ua.pasillo, ua.estanteria, ua.nivel, p.id
            """;

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql);

        Map<String, Object> mapa = new LinkedHashMap<>();
        int totalRacks = 0, racksOcupados = 0;

        for (Map<String, Object> fila : filas) {
            String pasillo    = (String) fila.get(COL_PASILLO);
            String estanteria = (String) fila.get(COL_ESTANTERIA);
            int    nivelRack  = ((Number) fila.get("nivel_rack")).intValue();

            mapa.computeIfAbsent(pasillo, k -> new LinkedHashMap<>());
            @SuppressWarnings("unchecked")
            Map<String, Object> pasilloMap = (Map<String, Object>) mapa.get(pasillo);

            pasilloMap.computeIfAbsent(estanteria, k -> new LinkedHashMap<>());
            @SuppressWarnings("unchecked")
            Map<String, Object> estanteriaMap = (Map<String, Object>) pasilloMap.get(estanteria);

            if (fila.get("id_producto") != null) {
                String prodKey = String.valueOf(fila.get("id_producto"));
                Map<String, Object> rack = new LinkedHashMap<>();
                rack.put(COL_NIVEL,             nivelRack);
                rack.put("id_producto",         ((Number) fila.get("id_producto")).longValue());
                rack.put("sku",                 fila.get("sku"));
                rack.put("nombre",              fila.get("nombre"));
                rack.put("stock_actual",        fila.get("stock_actual") != null
                                                    ? ((Number) fila.get("stock_actual")).intValue()
                                                    : null);
                rack.put("stock_minimo",        fila.get("stock_minimo") != null
                                                    ? ((Number) fila.get("stock_minimo")).intValue()
                                                    : null);
                rack.put("tipo_producto",       fila.get("tipo_producto"));
                rack.put("estado_conservacion", fila.get("estado_conservacion"));
                rack.put("bajo_minimo",         Boolean.TRUE.equals(fila.get("bajo_minimo")));
                estanteriaMap.put(prodKey, rack);
            }
        }

        for (Map.Entry<String, Object> pe : mapa.entrySet()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> pm = (Map<String, Object>) pe.getValue();
            for (Map.Entry<String, Object> ee : pm.entrySet()) {
                totalRacks++;
                @SuppressWarnings("unchecked")
                Map<String, Object> em = (Map<String, Object>) ee.getValue();
                if (!em.isEmpty()) racksOcupados++;
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapa",           mapa);
        response.put("total_racks",    totalRacks);
        response.put("racks_ocupados", racksOcupados);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/validar-ubicacion")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> validarUbicacion(
            @RequestBody Map<String, Object> body) {

        String pasillo    = (String) body.get(COL_PASILLO);
        String estanteria = (String) body.get(COL_ESTANTERIA);
        Object nivelObj   = body.get(COL_NIVEL);
        Object idProdObj  = body.get("idProducto");

        if (pasillo == null || estanteria == null || nivelObj == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Se requieren pasillo, estanteria y nivel."
            );
        }

        int  nivel      = ((Number) nivelObj).intValue();
        Long idProducto = idProdObj != null ? ((Number) idProdObj).longValue() : null;

        String sqlOcupante = """
            SELECT p.id, p.sku, p.nombre, p.tipo_producto
            FROM ubicaciones_almacen ua
            JOIN productos p ON ua.id = p.id_ubicacion
            WHERE ua.pasillo = ? AND ua.estanteria = ? AND ua.nivel = ?
            """;

        List<Map<String, Object>> ocupantes = jdbcTemplate.queryForList(
            sqlOcupante, pasillo, estanteria, nivel
        );

        if (idProducto != null) {
            final Long pid = idProducto;
            ocupantes = ocupantes.stream()
                .filter(o -> !pid.equals(((Number) o.get("id")).longValue()))
                .toList();
        }

        if (ocupantes.isEmpty()) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("libre", true);
            return ResponseEntity.ok(resp);
        }

        Map<String, Object> ocupadoPor = ocupantes.get(0);

        String sqlLibres = """
            SELECT ua.pasillo, ua.estanteria, ua.nivel
            FROM ubicaciones_almacen ua
            LEFT JOIN productos p ON ua.id = p.id_ubicacion
            WHERE p.id IS NULL
            ORDER BY ua.pasillo, ua.estanteria, ua.nivel
            """;

        List<Map<String, Object>> libres = jdbcTemplate.queryForList(sqlLibres);

        Map<String, Object> alternativa = libres.stream()
            .filter(u -> pasillo.equals(u.get(COL_PASILLO)))
            .findFirst()
            .orElse(libres.isEmpty() ? null : libres.get(0));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("libre",       false);
        resp.put("ocupadoPor",  ocupadoPor);
        resp.put("alternativa", alternativa);
        return ResponseEntity.ok(resp);
    }
}