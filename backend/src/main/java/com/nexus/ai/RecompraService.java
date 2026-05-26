package com.nexus.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class RecompraService {

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RecompraService(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    public Map<String, Object> analizarRecompra(String descripcionLibre) {
        String prompt = """
            Eres el asistente de compras de una tienda de videojuegos retro llamada LevelUp Arcade.
            Un cliente quiere vender un artículo y lo describe en texto libre.
            Analiza la descripción y devuelve ÚNICAMENTE un JSON válido sin markdown:
            {
              "nombre_detectado": "string",
              "plataforma": "string",
              "estado_conservacion": "MINT|CIB|LOOSE|LOOSE_D",
              "tiene_caja": boolean,
              "tiene_manual": boolean,
              "precio_compra_sugerido": number,
              "precio_venta_sugerido": number,
              "margen_estimado": number,
              "recomendacion": "COMPRAR|NEGOCIAR|RECHAZAR",
              "notas": "string breve en español"
            }
            
            Descripción del cliente:
            "%s"
            
            Precios en EUR para mercado europeo. Sé conservador en precio de compra para maximizar margen.
            """.formatted(descripcionLibre);

        String respuesta = geminiService.llamar(prompt);
        return parsearJSON(respuesta);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsearJSON(String respuesta) {
        try {
            String limpio = respuesta
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();
            return objectMapper.readValue(limpio, Map.class);
        } catch (Exception e) {
            return Map.of(
                "error", "No se pudo parsear la respuesta",
                "respuesta_raw", respuesta
            );
        }
    }
}