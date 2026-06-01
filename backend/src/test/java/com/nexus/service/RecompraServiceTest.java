package com.nexus.service;

import com.nexus.ai.GeminiService;
import com.nexus.ai.RecompraService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * QA-01 — Tests unitarios de RecompraService (AI-05).
 *
 * Cubre:
<<<<<<< HEAD
 *  1. Análisis válido → JSON parseado con todos los campos
 *  2. Recomendación COMPRAR presente
 *  3. Recomendación RECHAZAR presente
 *  4. Markdown wrapper → limpiado correctamente
 *  5. JSON malformado → devuelve error sin lanzar excepción
 *  6. Descripción vacía → llama a Gemini igualmente
=======
 *  1. Análisis válido — JSON parseado con todos los campos
 *  2. Recomendación COMPRAR presente
 *  3. Recomendación RECHAZAR presente
 *  4. Markdown wrapper — limpiado correctamente
 *  5. JSON malformado — devuelve error sin lanzar excepción
 *  6. Descripción vacía — llama a Gemini y procesa
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
 */
@ExtendWith(MockitoExtension.class)
class RecompraServiceTest {

    @Mock private GeminiService geminiService;

    @InjectMocks private RecompraService recompraService;

    private static final String JSON_COMPRAR = """
        {
          "nombre_detectado": "The Legend of Zelda: Ocarina of Time",
          "plataforma": "Nintendo 64",
          "estado_conservacion": "CIB",
          "tiene_caja": true,
          "tiene_manual": true,
          "precio_compra_sugerido": 55.0,
          "precio_venta_sugerido": 89.0,
          "margen_estimado": 34.0,
          "recomendacion": "COMPRAR",
          "notas": "Título icónico con alta demanda en mercado europeo"
        }
        """;

    private static final String JSON_RECHAZAR = """
        {
          "nombre_detectado": "Juego desconocido",
          "plataforma": "Desconocida",
          "estado_conservacion": "LOOSE_D",
          "tiene_caja": false,
          "tiene_manual": false,
          "precio_compra_sugerido": 2.0,
          "precio_venta_sugerido": 5.0,
          "margen_estimado": 3.0,
          "recomendacion": "RECHAZAR",
          "notas": "Artículo en mal estado sin valor de mercado claro"
        }
        """;

    // ── TEST 1 — Análisis válido ──────────────────────────────────────

    @Test
    void analizarRecompra_descripcionValida_devuelveMapaCompleto() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_COMPRAR);

        Map<String, Object> result = recompraService.analizarRecompra(
            "Tengo un Zelda Ocarina of Time de N64 con caja y manual, en muy buen estado"
        );

        assertNotNull(result);
        assertFalse(result.containsKey("error"));
        assertEquals("Nintendo 64", result.get("plataforma"));
        assertEquals(55.0, result.get("precio_compra_sugerido"));
        assertEquals(89.0, result.get("precio_venta_sugerido"));
    }

    // ── TEST 2 — Recomendación COMPRAR ────────────────────────────────

    @Test
    void analizarRecompra_articuloValioso_recomiendaComprar() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_COMPRAR);

<<<<<<< HEAD
        Map<String, Object> result = recompraService.analizarRecompra("Zelda Ocarina N64 CIB");
=======
        Map<String, Object> result = recompraService.analizarRecompra(
            "Zelda Ocarina N64 CIB perfecto estado"
        );
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

        assertEquals("COMPRAR", result.get("recomendacion"));
        assertTrue((Double) result.get("margen_estimado") > 0);
    }

    // ── TEST 3 — Recomendación RECHAZAR ──────────────────────────────

    @Test
    void analizarRecompra_articuloSinValor_recomiendaRechazar() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_RECHAZAR);

        Map<String, Object> result = recompraService.analizarRecompra(
            "Un juego roto sin caja ni manual que no se lee"
        );

        assertEquals("RECHAZAR", result.get("recomendacion"));
    }

    // ── TEST 4 — Markdown wrapper ─────────────────────────────────────

    @Test
    void analizarRecompra_respuestaConMarkdown_seLimpiaYParsea() {
<<<<<<< HEAD
        when(geminiService.llamar(anyString())).thenReturn("```json\n" + JSON_COMPRAR + "\n```");
=======
        String conMarkdown = "```json\n" + JSON_COMPRAR + "\n```";
        when(geminiService.llamar(anyString())).thenReturn(conMarkdown);
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

        Map<String, Object> result = recompraService.analizarRecompra("Zelda N64");

        assertFalse(result.containsKey("error"), "No debe haber error con markdown");
        assertNotNull(result.get("recomendacion"));
    }

    // ── TEST 5 — JSON malformado ──────────────────────────────────────

    @Test
    void analizarRecompra_jsonMalformado_devuelveErrorSinExcepcion() {
<<<<<<< HEAD
        when(geminiService.llamar(anyString())).thenReturn("no es json {{{");
=======
        when(geminiService.llamar(anyString())).thenReturn("no es json");
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e

        Map<String, Object> result = recompraService.analizarRecompra("descripcion cualquiera");

        assertTrue(result.containsKey("error"),
            "Debe devolver mapa con 'error' ante JSON inválido");
    }

    // ── TEST 6 — Descripción vacía ────────────────────────────────────

    @Test
    void analizarRecompra_descripcionVacia_llamaAGeminiIgual() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_COMPRAR);

        recompraService.analizarRecompra("");

        verify(geminiService).llamar(anyString());
    }
}