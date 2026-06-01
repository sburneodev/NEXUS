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
 *  2. Sin productos bajo mínimo — devuelve informe con lista vacía
 *  3. productos_afectados refleja el conteo real de la BD
 *  4. Markdown wrapper — limpiado y parseado correctamente
 *  5. JSON malformado — devuelve error con productos_afectados
 *  6. Gemini lanza excepción — se propaga correctamente
 */
@ExtendWith(MockitoExtension.class)
class InformeStockServiceTest {

    @Mock private GeminiService geminiService;
    @Mock private JdbcTemplate  jdbcTemplate;

    @InjectMocks private InformeStockService informeStockService;

    private static final String JSON_INFORME = """
        {
          "alertas_criticas": ["Super Nintendo: 0 unidades (mínimo 2)", "Game Boy: 1 unidad (mínimo 3)"],
          "plan_pedidos": [
            {
              "proveedor": "RetroDistrib S.L.",
              "productos": ["Super Nintendo", "Game Boy"],
              "cantidad_estimada": 10,
              "urgencia": "ALTA"
            }
          ],
          "prevision_impacto": "Sin reposición se perderían aproximadamente 1.200 EUR en ventas esta semana",
          "resumen_ejecutivo": "2 productos en situación crítica. Pedido urgente recomendado a RetroDistrib."
        }
        """;

    private List<Map<String, Object>> productosBajoMinimo() {
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
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        assertNotNull(result);
        assertFalse(result.containsKey("error"));
        assertNotNull(result.get("alertas_criticas"));
        assertNotNull(result.get("plan_pedidos"));
        assertNotNull(result.get("resumen_ejecutivo"));
    }

    // ── TEST 2 — Sin productos bajo mínimo ───────────────────────────

    @Test
    void generarInforme_sinProductosBajoMinimo_llamaAGeminiConListaVacia() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        verify(geminiService).llamar(anyString());
        assertNotNull(result);
    }

    // ── TEST 3 — productos_afectados refleja conteo real ─────────────

    @Test
    void generarInforme_dosProductos_productosAfectadosEs2() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        assertEquals(2, result.get("productos_afectados"));
    }

    @Test
    void generarInforme_sinProductos_productosAfectadosEs0() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(geminiService.llamar(anyString())).thenReturn(JSON_INFORME);

        Map<String, Object> result = informeStockService.generarInforme();

        assertEquals(0, result.get("productos_afectados"));
    }

    // ── TEST 4 — Markdown wrapper ─────────────────────────────────────

    @Test
    void generarInforme_respuestaConMarkdown_seLimpiaYParsea() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
        when(geminiService.llamar(anyString())).thenReturn("```json\n" + JSON_INFORME + "\n```");

        Map<String, Object> result = informeStockService.generarInforme();

        assertFalse(result.containsKey("error"), "No debe haber error con markdown");
        assertNotNull(result.get("alertas_criticas"));
    }

    // ── TEST 5 — JSON malformado ──────────────────────────────────────

    @Test
    void generarInforme_jsonMalformado_devuelveErrorConProductosAfectados() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(productosBajoMinimo());
        when(geminiService.llamar(anyString())).thenReturn("no es json {{{");

        Map<String, Object> result = informeStockService.generarInforme();

        assertTrue(result.containsKey("error"));
        assertEquals(2, result.get("productos_afectados"),
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
    }
}