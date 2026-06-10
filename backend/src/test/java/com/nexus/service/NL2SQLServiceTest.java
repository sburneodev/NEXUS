package com.nexus.service;

import com.nexus.ai.GeminiService;
import com.nexus.ai.NL2SQLService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NL2SQLServiceTest {

    @Mock private GeminiService geminiService;
    @Mock private JdbcTemplate  jdbcTemplate;

    @InjectMocks private NL2SQLService nl2sqlService;

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

    @Test
    void sql_null_devuelve_error_sin_ejecutar_jdbc() {
        when(geminiService.llamar(anyString())).thenReturn(
            "{\"sql\": null, \"descripcion\": \"No es posible responder\"}"
        );

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("pregunta imposible");

        assertNotNull(result.get("error"));
        verifyNoInteractions(jdbcTemplate);
    }

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

    @ParameterizedTest(name = "SQL peligroso bloqueado: {1}")
    @CsvSource({
        "'{\"sql\": \"UPDATE productos SET precio_venta = 0\", \"descripcion\": \"Destructivo\"}', pon todos los precios a cero",
        "'{\"sql\": \"SELECT 1; DROP TABLE productos\", \"descripcion\": \"Destructivo\"}',            borra los productos",
        "'{\"sql\": \"SELECT * FROM clientes WHERE DELETE FROM clientes\", \"descripcion\": \"Intento\"}', elimina clientes"
    })
    void sql_peligroso_bloqueado_lanza_excepcion(String respuestaGemini, String pregunta) {
        when(geminiService.llamar(anyString())).thenReturn(respuestaGemini);

        assertThrows(RuntimeException.class,
            () -> nl2sqlService.ejecutarConsulta(pregunta));

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void json_malformado_devuelve_error_sin_propagar_excepcion() {
        when(geminiService.llamar(anyString())).thenReturn("esto no es JSON {{{");

        Map<String, Object> result = nl2sqlService.ejecutarConsulta("pregunta cualquiera");

        assertNotNull(result.get("error"),
            "Debe devolver mapa con 'error' ante JSON inválido");
        verifyNoInteractions(jdbcTemplate);
    }
}