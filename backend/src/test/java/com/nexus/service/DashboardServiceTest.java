package com.nexus.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * QA-01 — Tests unitarios de DashboardService (AI-01/02).
 *
 * Cubre:
 *  1. getAnalytics devuelve las 4 secciones esperadas
 *  2. ventas30Dias con datos reales
 *  3. ventas30Dias vacío — devuelve lista vacía sin error
 *  4. topProveedores — devuelve lista de proveedores
 *  5. kpis — contiene los campos esperados
 *  6. Las 4 queries se ejecutan en paralelo (todas se invocan)
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks private DashboardService dashboardService;

    private void mockTodasLasQueries() {
        // ventas30Dias
        when(jdbcTemplate.queryForList(contains("SALIDA") & contains("30 days")))
            .thenReturn(List.of(
                Map.of("dia", "2026-05-28", "total", 450.0),
                Map.of("dia", "2026-05-29", "total", 320.0)
            ));

        // topProveedores
        when(jdbcTemplate.queryForList(contains("ENTRADA")))
            .thenReturn(List.of(
                Map.of("razon_social", "RetroDistrib S.L.", "num_entradas", 5, "total_comprado", 800.0)
            ));

        // ventasPorTipo
        when(jdbcTemplate.queryForList(contains("tipo_producto")))
            .thenReturn(List.of(
                Map.of("tipo_producto", "RETRO",    "ventas", 10, "ingresos", 900.0),
                Map.of("tipo_producto", "ESTANDAR", "ventas", 25, "ingresos", 1200.0)
            ));

        // kpis
        when(jdbcTemplate.queryForMap(anyString()))
            .thenReturn(Map.of(
                "total_productos",       20,
                "productos_bajo_minimo", 2,
                "total_clientes",        15,
                "ingresos_30_dias",      2100.0
            ));
    }

    // ── TEST 1 — getAnalytics devuelve 4 secciones ───────────────────

    @Test
    void getAnalytics_devuelveLasCuatroSecciones() {
        mockTodasLasQueries();

        Map<String, Object> result = dashboardService.getAnalytics();

        assertNotNull(result);
        assertTrue(result.containsKey("ventas30Dias"),   "Debe contener ventas30Dias");
        assertTrue(result.containsKey("topProveedores"), "Debe contener topProveedores");
        assertTrue(result.containsKey("ventasPorTipo"),  "Debe contener ventasPorTipo");
        assertTrue(result.containsKey("kpis"),           "Debe contener kpis");
    }

    // ── TEST 2 — ventas30Dias con datos ──────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_ventas30DiasConDatos_devuelveListaConEntradas() {
        mockTodasLasQueries();

        Map<String, Object> result = dashboardService.getAnalytics();
        List<Map<String, Object>> ventas = (List<Map<String, Object>>) result.get("ventas30Dias");

        assertFalse(ventas.isEmpty());
        assertTrue(ventas.get(0).containsKey("total"));
    }

    // ── TEST 3 — ventas30Dias vacío ───────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_sinVentas_devuelveListaVacia() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(jdbcTemplate.queryForMap(anyString())).thenReturn(Map.of(
            "total_productos", 0, "productos_bajo_minimo", 0,
            "total_clientes",  0, "ingresos_30_dias",      0.0
        ));

        Map<String, Object> result = dashboardService.getAnalytics();
        List<?> ventas = (List<?>) result.get("ventas30Dias");

        assertNotNull(ventas);
        assertTrue(ventas.isEmpty());
    }

    // ── TEST 4 — topProveedores ───────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_topProveedores_devuelveProveedores() {
        mockTodasLasQueries();

        Map<String, Object> result    = dashboardService.getAnalytics();
        List<Map<String, Object>> provs = (List<Map<String, Object>>) result.get("topProveedores");

        assertFalse(provs.isEmpty());
        assertTrue(provs.get(0).containsKey("razon_social"));
    }

    // ── TEST 5 — KPIs contienen campos esperados ─────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_kpis_contienenCamposEsperados() {
        mockTodasLasQueries();

        Map<String, Object> result = dashboardService.getAnalytics();
        Map<String, Object> kpis   = (Map<String, Object>) result.get("kpis");

        assertTrue(kpis.containsKey("total_productos"));
        assertTrue(kpis.containsKey("productos_bajo_minimo"));
        assertTrue(kpis.containsKey("total_clientes"));
        assertTrue(kpis.containsKey("ingresos_30_dias"));
    }

    // ── TEST 6 — Las queries se invocan ──────────────────────────────

    @Test
    void getAnalytics_invocaQueryForListYQueryForMap() {
        mockTodasLasQueries();

        dashboardService.getAnalytics();

        // Al menos 3 queryForList (ventas, proveedores, tipos) + 1 queryForMap (kpis)
        verify(jdbcTemplate, atLeast(3)).queryForList(anyString());
        verify(jdbcTemplate, atLeast(1)).queryForMap(anyString());
    }
}