package com.nexus.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class TasadorService {

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TasadorService(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    public Map<String, Object> tasarArticulo(Map<String, Object> atributos) {
        String prompt = """
            Eres un experto tasador de videojuegos retro con 20 años de experiencia.
            Analiza el siguiente artículo y devuelve ÚNICAMENTE un JSON válido sin markdown,
            sin explicaciones, solo el JSON con esta estructura exacta:
            {
              "precio_minimo": number,
              "precio_recomendado": number,
              "precio_maximo": number,
              "confianza": "ALTA|MEDIA|BAJA",
              "justificacion": "string breve en español",
              "factores_clave": ["factor1", "factor2"]
            }
            
            Artículo a tasar:
            %s
            
            Considera: plataforma, región, año, estado de conservación (MINT/CIB/LOOSE/LOOSE_D),
            si está precintado, si tiene caja y manual. Precios en EUR para el mercado europeo.
            """.formatted(atributos.toString());

        String respuesta = geminiService.llamar(prompt);
        return parsearJSON(respuesta);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsearJSON(String respuesta) {
        try {
            String limpio = respuesta
                .replace("```json", "")
                .replace("```", "")
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