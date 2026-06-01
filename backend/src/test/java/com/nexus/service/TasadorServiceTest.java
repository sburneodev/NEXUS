package com.nexus.service;

import com.nexus.ai.GeminiService;
import com.nexus.ai.TasadorService;
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
 * QA-01 — Tests unitarios de TasadorService (AI-04).
 *
 * Cubre:
 *  1. Tasación válida — JSON correcto parseado y devuelto
 *  2. JSON con wrapper markdown — limpiado y parseado correctamente
 *  3. Respuesta nula de Gemini — devuelve mapa de error sin lanzar excepción
 *  4. JSON malformado — devuelve mapa de error con respuesta_raw
 *  5. Atributos vacíos — llama a Gemini y procesa la respuesta
 *  6. Confianza ALTA presente en respuesta válida
 */
@ExtendWith(MockitoExtension.class)
class TasadorServiceTest {

    @Mock private GeminiService geminiService;

    @InjectMocks private TasadorService tasadorService;

    private static final String JSON_VALIDO = """
        {
          "precio_minimo": 45.0,
          "precio_recomendado": 65.0,
          "precio_maximo": 85.0,
          "confianza": "ALTA",
          "justificacion": "Super Nintendo en estado CIB tiene alta demanda",
          "factores_clave": ["estado CIB", "consola iconica", "mercado europeo"]
        }
        """;

    private Map<String, Object> atributosEjemplo() {
        return Map.of(
            "plataforma",   "SNES",
            "nombre",       "Super Nintendo",
            "estado",       "CIB",
            "region",       "PAL",
            "anio",         1992
        );
    }

    // ── TEST 1 — Tasación válida ──────────────────────────────────────

    @Test
    void tasarArticulo_respuestaValida_devuelveMapaConPrecios() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_VALIDO);

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertNotNull(result);
        assertFalse(result.containsKey("error"));
        assertEquals(45.0, result.get("precio_minimo"));
        assertEquals(65.0, result.get("precio_recomendado"));
        assertEquals(85.0, result.get("precio_maximo"));
    }

    // ── TEST 2 — Markdown wrapper ─────────────────────────────────────

    @Test
    void tasarArticulo_respuestaConMarkdown_seLimpiaYParsea() {
        String conMarkdown = "```json\n" + JSON_VALIDO + "\n```";
        when(geminiService.llamar(anyString())).thenReturn(conMarkdown);

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertFalse(result.containsKey("error"), "No debe haber error con markdown: " + result);
        assertNotNull(result.get("precio_recomendado"));
    }

    // ── TEST 3 — Respuesta nula ───────────────────────────────────────

    @Test
    void tasarArticulo_respuestaNula_devuelveMapaDeError() {
        when(geminiService.llamar(anyString())).thenReturn(null);

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertTrue(result.containsKey("error") || result.containsKey("respuesta_raw"),
            "Debe manejar respuesta nula sin lanzar excepción");
    }

    // ── TEST 4 — JSON malformado ──────────────────────────────────────

    @Test
    void tasarArticulo_jsonMalformado_devuelveErrorConRespuestaRaw() {
        when(geminiService.llamar(anyString())).thenReturn("esto no es json {{{");

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertTrue(result.containsKey("error"),
            "Debe devolver mapa con 'error' ante JSON inválido");
        assertTrue(result.containsKey("respuesta_raw"),
            "Debe incluir la respuesta raw para diagnóstico");
    }

    // ── TEST 5 — Atributos vacíos ─────────────────────────────────────

    @Test
    void tasarArticulo_atributosVacios_llamaAGeminiYProcesa() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_VALIDO);

        Map<String, Object> result = tasadorService.tasarArticulo(Map.of());

        verify(geminiService).llamar(anyString());
        assertNotNull(result);
    }

    // ── TEST 6 — Confianza en respuesta ───────────────────────────────

    @Test
    void tasarArticulo_respuestaValida_contieneConfianzaAlta() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_VALIDO);

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertEquals("ALTA", result.get("confianza"));
        assertNotNull(result.get("factores_clave"));
    }
}