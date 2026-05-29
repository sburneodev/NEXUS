package com.nexus.service;

import com.nexus.ai.GeminiService;
import com.nexus.ai.NL2SQLService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * QA-01 — Tests unitarios de NL2SQLService.
 *
 * Cubre:
 *  1. Consulta SELECT válida → se ejecuta y devuelve filas
 *  2. SQL null desde Gemini → devuelve error descriptivo sin ejecutar JDBC
 *  3. Respuesta con markdown (```json) → se limpia y parsea correctamente
 *  4. SQL no-SELECT (UPDATE) → bloqueado por validación SELECT-only
 *  5. SQL con keyword peligrosa (DROP) → bloqueado
 *  6. JSON malformado de Gemini → devuelve error sin lanzar excepción al caller
 */
@ExtendWith(MockitoExtension.class)
class NL2SQLServiceTest {

    @Mock private GeminiService geminiService;
    @Mock private JdbcTemplate  jdbcTemplate;

    @InjectMocks private NL2SQLService nl2sqlService;

    // ── TEST 1 — Consulta válida ──────────────────────────────────────

    @Test
    void consulta_select_valida_ejecuta_y_devuelve_filas() {
        String respuestaGemini = """
            {"sql": "SELECT id, nombre FROM productos LIMIT 10",
             "descripcion": "Lista los primeros 10 productos"}
            """;
        when(geminiService.llamar(anyString())).thenReturn(respuestaGemini);

        Map<String, Object> filaEjemplo = Map.of("id", 1, "nombre", "Super Nintendo");
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(filaEjemplo));

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("dame los productos");

        assertNotNull(result.get("sql"));
        assertEquals(1, result.get("total_filas"));
        assertFalse(((List<?>) result.get("filas")).isEmpty());
        verify(jdbcTemplate).queryForList(anyString());
    }

    @Test
    void consulta_sin_resultados_devuelve_lista_vacia() {
        String respuestaGemini = """
            {"sql": "SELECT * FROM productos WHERE nombre = 'NoExiste'",
             "descripcion": "Busca producto inexistente"}
            """;
        when(geminiService.llamar(anyString())).thenReturn(respuestaGemini);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("busca NoExiste");

        assertEquals(0, result.get("total_filas"));
        assertTrue(((List<?>) result.get("filas")).isEmpty());
        assertTrue(((List<?>) result.get("columnas")).isEmpty());
    }

    // ── TEST 2 — SQL null ─────────────────────────────────────────────

    @Test
    void sql_null_devuelve_error_sin_ejecutar_jdbc() {
        String respuestaGemini = """
            {"sql": null, "descripcion": "No es posible responder esta pregunta"}
            """;
        when(geminiService.llamar(anyString())).thenReturn(respuestaGemini);

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("¿cuánto mide la luna?");

        assertNotNull(result.get("error"));
        verifyNoInteractions(jdbcTemplate);
    }

    // ── TEST 3 — Markdown wrapper ─────────────────────────────────────

    @Test
    void respuesta_con_markdown_se_limpia_y_ejecuta() {
        // Gemini a veces envuelve el JSON en ```json ... ```
        String respuestaConMarkdown = """
            ```json
            {"sql": "SELECT COUNT(*) FROM clientes", "descripcion": "Cuenta clientes"}
            ```
            """;
        when(geminiService.llamar(anyString())).thenReturn(respuestaConMarkdown);
        when(jdbcTemplate.queryForList(anyString()))
                .thenReturn(List.of(Map.of("count", 5L)));

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("cuántos clientes hay");

        assertNull(result.get("error"), "No debe haber error: " + result.get("error"));
        assertEquals(1, result.get("total_filas"));
        verify(jdbcTemplate).queryForList(anyString());
    }

    // ── TEST 4 — SQL no-SELECT bloqueado ──────────────────────────────

    @Test
    void sql_update_bloqueado_por_validacion_select_only() {
        String respuestaGemini = """
            {"sql": "UPDATE productos SET precio_venta = 0", "descripcion": "Borra precios"}
            """;
        when(geminiService.llamar(anyString())).thenReturn(respuestaGemini);

        assertThrows(RuntimeException.class,
                () -> nl2sqlService.ejecutarConsulta("pon todos los precios a cero"));

        verifyNoInteractions(jdbcTemplate);
    }

    // ── TEST 5 — Keyword peligrosa DROP ──────────────────────────────

    @Test
    void sql_con_drop_bloqueado_por_keyword_check() {
        // Intentar colar DROP dentro de un SELECT (comentario SQL)
        String respuestaGemini = """
            {"sql": "SELECT 1; DROP TABLE productos", "descripcion": "Destructivo"}
            """;
        when(geminiService.llamar(anyString())).thenReturn(respuestaGemini);

        assertThrows(RuntimeException.class,
                () -> nl2sqlService.ejecutarConsulta("borra los productos"));

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void sql_con_delete_bloqueado_por_keyword_check() {
        String respuestaGemini = """
            {"sql": "SELECT * FROM productos WHERE DELETE FROM clientes", "descripcion": "Intento"}
            """;
        when(geminiService.llamar(anyString())).thenReturn(respuestaGemini);

        assertThrows(RuntimeException.class,
                () -> nl2sqlService.ejecutarConsulta("elimina clientes"));

        verifyNoInteractions(jdbcTemplate);
    }

    // ── TEST 6 — JSON malformado ──────────────────────────────────────

    @Test
    void json_malformado_devuelve_error_sin_propagar_excepcion() {
        when(geminiService.llamar(anyString())).thenReturn("esto no es JSON {{{");

        // El servicio captura el error y devuelve un mapa con "error"
        // en lugar de propagar la excepción al caller (comportamiento defensivo)
        Map<String, Object> result = nl2sqlService.ejecutarConsulta("pregunta cualquiera");

        assertNotNull(result.get("error"),
                "Debería devolver un mapa con clave 'error' ante JSON inválido");
        verifyNoInteractions(jdbcTemplate);
    }
}