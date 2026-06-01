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
 * DashboardService ejecuta 3 queryForList en paralelo con CompletableFuture
 * y 1 queryForMap. Mockito devuelve las respuestas en orden de llamada
 * usando encadenamiento de thenReturn.
 *
 * Cubre:
 *  1. getAnalytics devuelve las 4 secciones esperadas
 *  2. Al menos una sección de lista tiene datos
 *  3. Sin datos → secciones de lista son listas vacías
 *  4. kpis contiene los 4 campos esperados
 *  5. kpis con valores numéricos correctos
 *  6. Se invocan queryForList y queryForMap
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks private DashboardService dashboardService;

    private static final Map<String, Object> KPIS = Map.of(
        "total_productos",       20,
        "productos_bajo_minimo", 2,
        "total_clientes",        15,
        "ingresos_30_dias",      2100.0
    );

    private void mockTodasLasQueries() {
        when(jdbcTemplate.queryForList(anyString()))
            .thenReturn(List.of(Map.of("dia", "2026-05-28", "total", 450.0)))
            .thenReturn(List.of(Map.of("razon_social", "RetroDistrib", "total_comprado", 800.0)))
            .thenReturn(List.of(Map.of("tipo_producto", "RETRO", "ventas", 10)));
        when(jdbcTemplate.queryForMap(anyString())).thenReturn(KPIS);
    }

    // ── TEST 1 — 4 secciones presentes ───────────────────────────────

    @Test
    void getAnalytics_devuelveLasCuatroSecciones() {
        mockTodasLasQueries();

        Map<String, Object> result = dashboardService.getAnalytics();

        assertNotNull(result);
        assertTrue(result.containsKey("ventas30Dias"));
        assertTrue(result.containsKey("topProveedores"));
        assertTrue(result.containsKey("ventasPorTipo"));
        assertTrue(result.containsKey("kpis"));
    }

    // ── TEST 2 — Alguna sección tiene datos ──────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_conDatos_algunaSectionTieneElementos() {
        mockTodasLasQueries();

        Map<String, Object> result = dashboardService.getAnalytics();

        boolean hayDatos =
            !((List<?>) result.get("ventas30Dias")).isEmpty()   ||
            !((List<?>) result.get("topProveedores")).isEmpty() ||
            !((List<?>) result.get("ventasPorTipo")).isEmpty();

        assertTrue(hayDatos);
    }

    // ── TEST 3 — Sin datos → listas vacías ───────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_sinDatos_seccionesListaSonListas() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(jdbcTemplate.queryForMap(anyString())).thenReturn(Map.of(
            "total_productos", 0, "productos_bajo_minimo", 0,
            "total_clientes",  0, "ingresos_30_dias",      0.0
        ));

        Map<String, Object> result = dashboardService.getAnalytics();

        assertInstanceOf(List.class, result.get("ventas30Dias"));
        assertInstanceOf(List.class, result.get("topProveedores"));
        assertInstanceOf(List.class, result.get("ventasPorTipo"));
    }

    // ── TEST 4 — kpis contiene campos esperados ───────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_kpis_contienenCamposEsperados() {
        mockTodasLasQueries();

        Map<String, Object> kpis = (Map<String, Object>)
            dashboardService.getAnalytics().get("kpis");

        assertTrue(kpis.containsKey("total_productos"));
        assertTrue(kpis.containsKey("productos_bajo_minimo"));
        assertTrue(kpis.containsKey("total_clientes"));
        assertTrue(kpis.containsKey("ingresos_30_dias"));
    }

    // ── TEST 5 — kpis con valores correctos ──────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_kpis_valoresNumericos() {
        mockTodasLasQueries();

        Map<String, Object> kpis = (Map<String, Object>)
            dashboardService.getAnalytics().get("kpis");

        assertEquals(20,     kpis.get("total_productos"));
        assertEquals(2,      kpis.get("productos_bajo_minimo"));
        assertEquals(15,     kpis.get("total_clientes"));
        assertEquals(2100.0, kpis.get("ingresos_30_dias"));
    }

    // ── TEST 6 — Queries invocadas ────────────────────────────────────

    @Test
    void getAnalytics_invocaQueryForListYQueryForMap() {
        mockTodasLasQueries();

        dashboardService.getAnalytics();

        verify(jdbcTemplate, atLeast(3)).queryForList(anyString());
        verify(jdbcTemplate, atLeast(1)).queryForMap(anyString());
    }
}