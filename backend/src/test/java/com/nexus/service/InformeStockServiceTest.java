package com.nexus.service;

import com.nexus.ai.GeminiService;
import com.nexus.ai.InformeStockService;
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
 * QA-01 — Tests unitarios de InformeStockService (AI-06).
 *
 * Cubre:
 *  1. Informe válido con productos bajo mínimo
<<<<<<< HEAD
 *  2. Sin productos bajo mínimo → llama a Gemini con lista vacía
 *  3. productos_afectados refleja el conteo real de la BD
 *  4. Sin productos → productos_afectados es 0
 *  5. Markdown wrapper → parseado correctamente
 *  6. JSON malformado → devuelve error con productos_afectados
=======
 *  2. Sin productos bajo mínimo — devuelve informe con lista vacía
 *  3. productos_afectados refleja el conteo real de la BD
 *  4. Markdown wrapper — limpiado y parseado correctamente
 *  5. JSON malformado — devuelve error con productos_afectados
 *  6. Gemini lanza excepción — se propaga correctamente
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
 */
@ExtendWith(MockitoExtension.class)
class InformeStockServiceTest {

    @Mock private GeminiService geminiService;
    @Mock private JdbcTemplate  jdbcTemplate;

    @InjectMocks private InformeStockService informeStockService;

    private static final String JSON_INFORME = """
        {
<<<<<<< HEAD
          "alertas_criticas": ["Super Nintendo: 0 uds (mínimo 2)", "Game Boy: 1 ud (mínimo 3)"],
=======
          "alertas_criticas": ["Super Nintendo: 0 unidades (mínimo 2)", "Game Boy: 1 unidad (mínimo 3)"],
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
          "plan_pedidos": [
            {
              "proveedor": "RetroDistrib S.L.",
              "productos": ["Super Nintendo", "Game Boy"],
              "cantidad_estimada": 10,
              "urgencia": "ALTA"
            }
          ],
<<<<<<< HEAD
          "prevision_impacto": "Sin reposición se perderían ~1.200 EUR en ventas esta semana",
          "resumen_ejecutivo": "2 productos críticos. Pedido urgente recomendado a RetroDistrib."
        }
        """;

    private List<Map<String, Object>> dosProductos() {
=======
          "prevision_impacto": "Sin reposición se perderían aproximadamente 1.200 EUR en ventas esta semana",
          "resumen_ejecutivo": "2 productos en situación crítica. Pedido urgente recomendado a RetroDistrib."
        }
        """;

    private List<Map<String, Object>> productosBajoMinimo() {
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        return List.of(
            Map.of("sku", "SNES-001", "nombre", "Super Nintendo",
                   "stock_actual", 0, "stock_minimo", 2, "proveedor", "RetroDistrib S.L."),
            Map.of("sku", "GB-001", "nombre", "Game Boy",
                   "stock_actual", 1, "stock_minimo", 3, "proveedor", "RetroDistrib S.L.")
        );
    }

    // ── TEST 1 — Informe válido ───────────────────────────────────────

    @Test
    void generarInforme_conProductosBajoMinimo_devuelveInformeCompleto() {
<<<<<<< HEAD
        when(jdbcTemplate.queryForList(anyString())).thenReturn(dosProductos());
=======
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        assertNotNull(result);
        assertFalse(result.containsKey("error"));
        assertNotNull(result.get("alertas_criticas"));
        assertNotNull(result.get("plan_pedidos"));
        assertNotNull(result.get("resumen_ejecutivo"));
    }

<<<<<<< HEAD
    // ── TEST 2 — Sin productos ────────────────────────────────────────
=======
    // ── TEST 2 — Sin productos bajo mínimo ───────────────────────────
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

    @Test
    void generarInforme_sinProductosBajoMinimo_llamaAGeminiConListaVacia() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        verify(geminiService).llamar(anyString());
        assertNotNull(result);
    }

<<<<<<< HEAD
    // ── TEST 3 — productos_afectados correcto ─────────────────────────

    @Test
    void generarInforme_dosProductos_productosAfectadosEs2() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(dosProductos());
=======
    // ── TEST 3 — productos_afectados refleja conteo real ─────────────

    @Test
    void generarInforme_dosProductos_productosAfectadosEs2() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        assertEquals(2, result.get("productos_afectados"));
    }

<<<<<<< HEAD
    // ── TEST 4 — Sin productos → afectados es 0 ───────────────────────

=======
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
    @Test
    void generarInforme_sinProductos_productosAfectadosEs0() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        assertEquals(0, result.get("productos_afectados"));
    }

<<<<<<< HEAD
    // ── TEST 5 — Markdown wrapper ─────────────────────────────────────

    @Test
    void generarInforme_respuestaConMarkdown_seLimpiaYParsea() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(dosProductos());
=======
    // ── TEST 4 — Markdown wrapper ─────────────────────────────────────

    @Test
    void generarInforme_respuestaConMarkdown_seLimpiaYParsea() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        when(geminiService.llamar(anyString())).thenReturn("```json\n" + JSON_INFORME + "\n```");

        Map<String, Object> result = informeStockService.generarInforme();

        assertFalse(result.containsKey("error"), "No debe haber error con markdown");
        assertNotNull(result.get("alertas_criticas"));
    }

<<<<<<< HEAD
    // ── TEST 6 — JSON malformado ──────────────────────────────────────

    @Test
    void generarInforme_jsonMalformado_devuelveErrorConProductosAfectados() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(dosProductos());
=======
    // ── TEST 5 — JSON malformado ──────────────────────────────────────

    @Test
    void generarInforme_jsonMalformado_devuelveErrorConProductosAfectados() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        when(geminiService.llamar(anyString())).thenReturn("no es json {{{");

        Map<String, Object> result = informeStockService.generarInforme();

        assertTrue(result.containsKey("error"));
        assertEquals(2, result.get("productos_afectados"),
<<<<<<< HEAD
            "productos_afectados debe estar aunque el JSON falle");
=======
            "productos_afectados debe estar presente aunque el JSON falle");
    }

    // ── TEST 6 — Gemini lanza excepción ──────────────────────────────

    @Test
    void generarInforme_geminiLanzaExcepcion_sePropaga() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
        when(geminiService.llamar(anyString()))
            .thenThrow(new RuntimeException("Error llamando a Gemini: HTTP 429"));

        assertThrows(RuntimeException.class,
            () -> informeStockService.generarInforme());
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
    }
}