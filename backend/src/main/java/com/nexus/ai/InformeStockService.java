package com.nexus.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class InformeStockService {

    private final GeminiService geminiService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InformeStockService(GeminiService geminiService, JdbcTemplate jdbcTemplate) {
        this.geminiService = geminiService;
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> generarInforme() {
        List<Map<String, Object>> productosBajoMinimo = getProductosBajoMinimo();

        String prompt = """
            Eres el asistente logístico de LevelUp Arcade, una tienda de videojuegos.
            Analiza los siguientes productos que están por debajo del stock mínimo
            y genera un informe ejecutivo en español.
            Devuelve ÚNICAMENTE un JSON válido sin markdown:
            {
              "alertas_criticas": ["string", ...],
              "plan_pedidos": [
                {
                  "proveedor": "string",
                  "productos": ["string", ...],
                  "cantidad_estimada": number,
                  "urgencia": "ALTA|MEDIA|BAJA"
                }
              ],
              "prevision_impacto": "string descripcion del impacto en ingresos",
              "resumen_ejecutivo": "string 2-3 frases"
            }
            
            Productos bajo mínimo:
            %s
            """.formatted(productosBajoMinimo.toString());

        String respuesta = geminiService.llamar(prompt);
        return parsearJSON(respuesta, productosBajoMinimo);
    }

    private List<Map<String, Object>> getProductosBajoMinimo() {
        String sql = """
            SELECT p.sku, p.nombre, p.stock_actual, p.stock_minimo,
                   p.tipo_producto, prov.razon_social as proveedor,
                   prov.tiempo_entrega_d
            FROM productos p
            LEFT JOIN proveedores prov ON p.id_proveedor = prov.id
            WHERE p.stock_actual <= p.stock_minimo
            AND p.activo = true
            ORDER BY p.stock_actual ASC
            """;
        return jdbcTemplate.queryForList(sql);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsearJSON(String respuesta,
                                             List<Map<String, Object>> productos) {
        try {
            String limpio = respuesta
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();
            Map<String, Object> result = objectMapper.readValue(limpio, Map.class);
            result.put("productos_afectados", productos.size());
            return result;
        } catch (Exception e) {
            return Map.of(
                "error", "No se pudo parsear la respuesta",
                "productos_afectados", productos.size(),
                "respuesta_raw", respuesta
            );
        }
    }
}