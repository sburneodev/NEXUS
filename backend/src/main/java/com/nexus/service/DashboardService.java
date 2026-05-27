package com.nexus.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class DashboardService {

    private final JdbcTemplate jdbcTemplate;

    public DashboardService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getAnalytics() {
        // 4 queries en paralelo con CompletableFuture
        CompletableFuture<Object> ventas      = CompletableFuture.supplyAsync(this::getVentas30Dias);
        CompletableFuture<Object> proveedores = CompletableFuture.supplyAsync(this::getTopProveedores);
        CompletableFuture<Object> categorias  = CompletableFuture.supplyAsync(this::getVentasPorTipo);
        CompletableFuture<Object> kpis        = CompletableFuture.supplyAsync(this::getKpis);

        CompletableFuture.allOf(ventas, proveedores, categorias, kpis).join();

        Map<String, Object> result = new HashMap<>();
        result.put("ventas30Dias",   ventas.join());
        result.put("topProveedores", proveedores.join());
        result.put("ventasPorTipo",  categorias.join());
        result.put("kpis",           kpis.join());
        return result;
    }

    private Object getVentas30Dias() {
        String sql = """
            SELECT DATE(fecha) as dia, SUM(precio_unitario * cantidad) as total
            FROM transacciones_stock
            WHERE tipo_movimiento = 'SALIDA'
            AND fecha >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(fecha)
            ORDER BY dia ASC
            """;
        return jdbcTemplate.queryForList(sql);
    }

    private Object getTopProveedores() {
        String sql = """
            SELECT p.razon_social, COUNT(ts.id) as num_entradas,
                   SUM(ts.precio_unitario * ts.cantidad) as total_comprado
            FROM transacciones_stock ts
            JOIN proveedores p ON ts.id_proveedor = p.id
            WHERE ts.tipo_movimiento = 'ENTRADA'
            GROUP BY p.razon_social
            ORDER BY total_comprado DESC
            LIMIT 5
            """;
        return jdbcTemplate.queryForList(sql);
    }

    private Object getVentasPorTipo() {
        String sql = """
            SELECT pr.tipo_producto, COUNT(ts.id) as ventas,
                   SUM(ts.precio_unitario * ts.cantidad) as ingresos
            FROM transacciones_stock ts
            JOIN productos pr ON ts.id_producto = pr.id
            WHERE ts.tipo_movimiento = 'SALIDA'
            GROUP BY pr.tipo_producto
            """;
        return jdbcTemplate.queryForList(sql);
    }

    private Object getKpis() {
        String sql = """
            SELECT
                (SELECT COUNT(*) FROM productos WHERE activo = true) as total_productos,
                (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo AND activo = true) as productos_bajo_minimo,
                (SELECT COUNT(*) FROM clientes WHERE activo = true) as total_clientes,
                (SELECT COALESCE(SUM(precio_unitario * cantidad), 0)
                 FROM transacciones_stock
                 WHERE tipo_movimiento = 'SALIDA'
                 AND fecha >= NOW() - INTERVAL '30 days') as ingresos_30_dias
            """;
        return jdbcTemplate.queryForMap(sql);
    }
}