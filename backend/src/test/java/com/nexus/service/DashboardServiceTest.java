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
<<<<<<< HEAD
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
=======
 * Cubre:
 *  1. getAnalytics devuelve las 4 secciones esperadas
 *  2. ventas30Dias con datos reales
 *  3. ventas30Dias vacío — devuelve lista vacía sin error
 *  4. topProveedores — devuelve lista de proveedores
 *  5. kpis — contiene los campos esperados
 *  6. Las queries se invocan (queryForList + queryForMap)
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks private DashboardService dashboardService;

<<<<<<< HEAD
=======
    private static final List<Map<String, Object>> VENTAS = List.of(
        Map.of("dia", "2026-05-28", "total", 450.0),
        Map.of("dia", "2026-05-29", "total", 320.0)
    );

    private static final List<Map<String, Object>> PROVEEDORES = List.of(
        Map.of("razon_social", "RetroDistrib S.L.", "num_entradas", 5, "total_comprado", 800.0)
    );

    private static final List<Map<String, Object>> TIPOS = List.of(
        Map.of("tipo_producto", "RETRO",    "ventas", 10, "ingresos", 900.0),
        Map.of("tipo_producto", "ESTANDAR", "ventas", 25, "ingresos", 1200.0)
    );

>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
    private static final Map<String, Object> KPIS = Map.of(
        "total_productos",       20,
        "productos_bajo_minimo", 2,
        "total_clientes",        15,
        "ingresos_30_dias",      2100.0
    );

<<<<<<< HEAD
    private void mockTodasLasQueries() {
        when(jdbcTemplate.queryForList(anyString()))
            .thenReturn(List.of(Map.of("dia", "2026-05-28", "total", 450.0)))
            .thenReturn(List.of(Map.of("razon_social", "RetroDistrib", "total_comprado", 800.0)))
            .thenReturn(List.of(Map.of("tipo_producto", "RETRO", "ventas", 10)));
        when(jdbcTemplate.queryForMap(anyString())).thenReturn(KPIS);
    }

    // ── TEST 1 — 4 secciones presentes ───────────────────────────────
=======
    /**
     * DashboardService ejecuta 3 queryForList en paralelo (ventas, proveedores, tipos)
     * y 1 queryForMap (kpis). Mockito devuelve las respuestas en orden de llamada.
     */
    private void mockTodasLasQueries() {
        when(jdbcTemplate.queryForList(anyString()))
            .thenReturn(VENTAS)
            .thenReturn(PROVEEDORES)
            .thenReturn(TIPOS);

        when(jdbcTemplate.queryForMap(anyString()))
            .thenReturn(KPIS);
    }

    // ── TEST 1 — getAnalytics devuelve 4 secciones ───────────────────
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

    @Test
    void getAnalytics_devuelveLasCuatroSecciones() {
        mockTodasLasQueries();

        Map<String, Object> result = dashboardService.getAnalytics();

        assertNotNull(result);
<<<<<<< HEAD
        assertTrue(result.containsKey("ventas30Dias"));
        assertTrue(result.containsKey("topProveedores"));
        assertTrue(result.containsKey("ventasPorTipo"));
        assertTrue(result.containsKey("kpis"));
    }

    // ── TEST 2 — Alguna sección tiene datos ──────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_conDatos_algunaSectionTieneElementos() {
=======
        assertTrue(result.containsKey("ventas30Dias"),   "Debe contener ventas30Dias");
        assertTrue(result.containsKey("topProveedores"), "Debe contener topProveedores");
        assertTrue(result.containsKey("ventasPorTipo"),  "Debe contener ventasPorTipo");
        assertTrue(result.containsKey("kpis"),           "Debe contener kpis");
    }

    // ── TEST 2 — ventas30Dias con datos ──────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_conDatos_algUnaSecccionNoEsVacia() {
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        mockTodasLasQueries();

        Map<String, Object> result = dashboardService.getAnalytics();

<<<<<<< HEAD
=======
        // Al menos una de las secciones de lista tiene datos
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        boolean hayDatos =
            !((List<?>) result.get("ventas30Dias")).isEmpty()   ||
            !((List<?>) result.get("topProveedores")).isEmpty() ||
            !((List<?>) result.get("ventasPorTipo")).isEmpty();

<<<<<<< HEAD
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
=======
        assertTrue(hayDatos, "Al menos una sección debe tener datos");
    }

    // ── TEST 3 — sin ventas — listas vacías ──────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_sinDatos_seccionesDeListaSonListas() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(jdbcTemplate.queryForMap(anyString())).thenReturn(Map.of(
            "total_productos",       0,
            "productos_bajo_minimo", 0,
            "total_clientes",        0,
            "ingresos_30_dias",      0.0
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        ));

        Map<String, Object> result = dashboardService.getAnalytics();

        assertInstanceOf(List.class, result.get("ventas30Dias"));
        assertInstanceOf(List.class, result.get("topProveedores"));
        assertInstanceOf(List.class, result.get("ventasPorTipo"));
    }

<<<<<<< HEAD
    // ── TEST 4 — kpis contiene campos esperados ───────────────────────
=======
    // ── TEST 4 — kpis contienen campos esperados ─────────────────────
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_kpis_contienenCamposEsperados() {
        mockTodasLasQueries();

<<<<<<< HEAD
        Map<String, Object> kpis = (Map<String, Object>)
            dashboardService.getAnalytics().get("kpis");
=======
        Map<String, Object> result = dashboardService.getAnalytics();
        Map<String, Object> kpis   = (Map<String, Object>) result.get("kpis");
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

        assertTrue(kpis.containsKey("total_productos"));
        assertTrue(kpis.containsKey("productos_bajo_minimo"));
        assertTrue(kpis.containsKey("total_clientes"));
        assertTrue(kpis.containsKey("ingresos_30_dias"));
    }

<<<<<<< HEAD
    // ── TEST 5 — kpis con valores correctos ──────────────────────────
=======
    // ── TEST 5 — kpis con valores reales ─────────────────────────────
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

    @Test
    @SuppressWarnings("unchecked")
    void getAnalytics_kpis_valoresNumericos() {
        mockTodasLasQueries();

<<<<<<< HEAD
        Map<String, Object> kpis = (Map<String, Object>)
            dashboardService.getAnalytics().get("kpis");
=======
        Map<String, Object> result = dashboardService.getAnalytics();
        Map<String, Object> kpis   = (Map<String, Object>) result.get("kpis");
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

        assertEquals(20,     kpis.get("total_productos"));
        assertEquals(2,      kpis.get("productos_bajo_minimo"));
        assertEquals(15,     kpis.get("total_clientes"));
        assertEquals(2100.0, kpis.get("ingresos_30_dias"));
    }

<<<<<<< HEAD
    // ── TEST 6 — Queries invocadas ────────────────────────────────────
=======
    // ── TEST 6 — queries se invocan ───────────────────────────────────
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

    @Test
    void getAnalytics_invocaQueryForListYQueryForMap() {
        mockTodasLasQueries();

        dashboardService.getAnalytics();

        verify(jdbcTemplate, atLeast(3)).queryForList(anyString());
        verify(jdbcTemplate, atLeast(1)).queryForMap(anyString());
    }
}