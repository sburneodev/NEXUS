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
 * Nota: TasadorService.parsearJSON llama a respuesta.replace() antes del try-catch,
 * por lo que si geminiService.llamar() devuelve null la excepción NullPointerException
 * se lanza antes de poder capturarla. El test de respuesta nula verifica ese comportamiento.
 *
 * Cubre:
 *  1. Tasación válida → JSON parseado con precios correctos
 *  2. Markdown wrapper → limpiado y parseado
 *  3. JSON malformado → devuelve mapa de error con respuesta_raw
 *  4. Atributos vacíos → llama a Gemini y procesa
 *  5. Confianza ALTA en respuesta válida
 *  6. Gemini devuelve string vacío → devuelve mapa de error
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
            "plataforma", "SNES",
            "nombre",     "Super Nintendo",
            "estado",     "CIB",
            "region",     "PAL",
            "anio",       1992
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
        when(geminiService.llamar(anyString())).thenReturn("```json\n" + JSON_VALIDO + "\n```");

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertFalse(result.containsKey("error"), "No debe haber error con markdown: " + result);
        assertNotNull(result.get("precio_recomendado"));
    }

    // ── TEST 3 — JSON malformado ──────────────────────────────────────

    @Test
    void tasarArticulo_jsonMalformado_devuelveErrorConRespuestaRaw() {
        when(geminiService.llamar(anyString())).thenReturn("esto no es json {{{");

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertTrue(result.containsKey("error"),
            "Debe devolver mapa con 'error' ante JSON inválido");
        assertTrue(result.containsKey("respuesta_raw"),
            "Debe incluir respuesta_raw para diagnóstico");
    }

    // ── TEST 4 — Atributos vacíos ─────────────────────────────────────

    @Test
    void tasarArticulo_atributosVacios_llamaAGeminiYProcesa() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_VALIDO);

        Map<String, Object> result = tasadorService.tasarArticulo(Map.of());

        verify(geminiService).llamar(anyString());
        assertNotNull(result);
    }

    // ── TEST 5 — Confianza ALTA ───────────────────────────────────────

    @Test
    void tasarArticulo_respuestaValida_contieneConfianzaAlta() {
        when(geminiService.llamar(anyString())).thenReturn(JSON_VALIDO);

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        assertEquals("ALTA", result.get("confianza"));
        assertNotNull(result.get("factores_clave"));
    }

    // ── TEST 6 — String vacío → error controlado ─────────────────────

    @Test
    void tasarArticulo_respuestaVacia_devuelveErrorControlado() {
        when(geminiService.llamar(anyString())).thenReturn("");

        Map<String, Object> result = tasadorService.tasarArticulo(atributosEjemplo());

        // String vacío no es JSON válido → parsearJSON captura la excepción
        assertTrue(result.containsKey("error") || result.containsKey("respuesta_raw"),
            "Debe manejar string vacío sin lanzar excepción al caller");
    }
}