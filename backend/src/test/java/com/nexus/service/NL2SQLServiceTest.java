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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * QA-01 — Tests unitarios de NL2SQLService (AI-07).
 *
 * Usa el jdbcTemplate principal mockeado via @InjectMocks —
 * compatible con la implementación actual que no usa readonly datasource.
 *
 * Cubre:
 *  1. SELECT válida → ejecuta JDBC y devuelve filas
 *  2. Sin resultados → listas vacías sin error
 *  3. SQL null → devuelve error sin tocar JDBC
 *  4. Markdown wrapper → se limpia y ejecuta correctamente
 *  5. UPDATE bloqueado → RuntimeException
 *  6. DROP bloqueado → RuntimeException
 *  7. DELETE bloqueado → RuntimeException
 *  8. JSON malformado → devuelve mapa de error sin propagar excepción
 */
@ExtendWith(MockitoExtension.class)
class NL2SQLServiceTest {

    @Mock private GeminiService geminiService;
    @Mock private JdbcTemplate  jdbcTemplate;

    @InjectMocks private NL2SQLService nl2sqlService;

    // ── TEST 1 — SELECT válida ejecuta JDBC ──────────────────────────

    @Test
    void consulta_select_valida_ejecuta_y_devuelve_filas() {
        when(geminiService.llamar(anyString())).thenReturn(
            "{\"sql\": \"SELECT id, nombre FROM productos LIMIT 10\", \"descripcion\": \"Lista productos\"}"
        );
        when(jdbcTemplate.queryForList(anyString()))
            .thenReturn(List.of(Map.of("id", 1, "nombre", "Super Nintendo")));

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("dame los productos");

        assertNotNull(result.get("sql"));
        assertEquals(1, result.get("total_filas"));
        assertFalse(((List<?>) result.get("filas")).isEmpty());
        verify(jdbcTemplate).queryForList(anyString());
    }

    // ── TEST 2 — Sin resultados ───────────────────────────────────────

    @Test
    void consulta_sin_resultados_devuelve_lista_vacia() {
        when(geminiService.llamar(anyString())).thenReturn(
            "{\"sql\": \"SELECT * FROM productos WHERE nombre = 'NoExiste'\", \"descripcion\": \"Busca\"}"
        );
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("busca NoExiste");

        assertEquals(0, result.get("total_filas"));
        assertTrue(((List<?>) result.get("filas")).isEmpty());
        assertTrue(((List<?>) result.get("columnas")).isEmpty());
    }

    // ── TEST 3 — SQL null no toca JDBC ───────────────────────────────

    @Test
    void sql_null_devuelve_error_sin_ejecutar_jdbc() {
        when(geminiService.llamar(anyString())).thenReturn(
            "{\"sql\": null, \"descripcion\": \"No es posible responder\"}"
        );

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("pregunta imposible");

        assertNotNull(result.get("error"));
        verifyNoInteractions(jdbcTemplate);
    }

    // ── TEST 4 — Markdown wrapper ─────────────────────────────────────

    @Test
    void respuesta_con_markdown_se_limpia_y_ejecuta() {
        when(geminiService.llamar(anyString())).thenReturn(
            "```json\n{\"sql\": \"SELECT COUNT(*) FROM clientes\", \"descripcion\": \"Cuenta\"}\n```"
        );
        when(jdbcTemplate.queryForList(anyString()))
            .thenReturn(List.of(Map.of("count", 5L)));

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("cuantos clientes hay");

        assertNull(result.get("error"), "No debe haber error: " + result.get("error"));
        assertEquals(1, result.get("total_filas"));
    }

    // ── TEST 5 — UPDATE bloqueado ─────────────────────────────────────

    @Test
    void sql_update_bloqueado_lanza_excepcion() {
        when(geminiService.llamar(anyString())).thenReturn(
            "{\"sql\": \"UPDATE productos SET precio_venta = 0\", \"descripcion\": \"Destructivo\"}"
        );

        assertThrows(RuntimeException.class,
            () -> nl2sqlService.ejecutarConsulta("pon todos los precios a cero"));

        verifyNoInteractions(jdbcTemplate);
    }

    // ── TEST 6 — DROP bloqueado ───────────────────────────────────────

    @Test
    void sql_con_drop_bloqueado_lanza_excepcion() {
        when(geminiService.llamar(anyString())).thenReturn(
            "{\"sql\": \"SELECT 1; DROP TABLE productos\", \"descripcion\": \"Destructivo\"}"
        );

        assertThrows(RuntimeException.class,
            () -> nl2sqlService.ejecutarConsulta("borra los productos"));

        verifyNoInteractions(jdbcTemplate);
    }

    // ── TEST 7 — DELETE bloqueado ─────────────────────────────────────

    @Test
    void sql_con_delete_bloqueado_lanza_excepcion() {
        when(geminiService.llamar(anyString())).thenReturn(
            "{\"sql\": \"SELECT * FROM clientes WHERE DELETE FROM clientes\", \"descripcion\": \"Intento\"}"
        );

        assertThrows(RuntimeException.class,
            () -> nl2sqlService.ejecutarConsulta("elimina clientes"));

        verifyNoInteractions(jdbcTemplate);
    }

    // ── TEST 8 — JSON malformado ──────────────────────────────────────

    @Test
    void json_malformado_devuelve_error_sin_propagar_excepcion() {
        when(geminiService.llamar(anyString())).thenReturn("esto no es JSON {{{");

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("pregunta cualquiera");

        assertNotNull(result.get("error"),
            "Debe devolver mapa con 'error' ante JSON inválido");
        verifyNoInteractions(jdbcTemplate);
    }
}