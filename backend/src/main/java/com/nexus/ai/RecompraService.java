package com.nexus.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;



@Service
public class RecompraService {
	private static final Logger log = LoggerFactory.getLogger(RecompraService.class);

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RecompraService(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    public Map<String, Object> analizarRecompra(String descripcionLibre) {
    	String prompt = """
    		    Eres el asistente de compras de LevelUp Arcade, tienda de videojuegos retro.
    		    Analiza la descripción y devuelve ÚNICAMENTE un JSON válido sin markdown ni backticks:
    		    {
    		      "precioSugerido": number,
    		      "decision": "ACEPTAR|NEGOCIAR|RECHAZAR",
    		      "recomendacion": "string explicando el precio sugerido",
    		      "razonamiento": "string explicando la decisión en español",
    		      "factoresValor": ["factor1", "factor2"],
    		      "riesgos": ["riesgo1", "riesgo2"]
    		    }
    		    
    		    Descripción: "%s"
    		    
    		    Precios en EUR para mercado europeo. Sé conservador para maximizar margen.
    		    decision debe ser exactamente ACEPTAR, NEGOCIAR o RECHAZAR en mayúsculas.
    		    """.formatted(descripcionLibre);

        String respuesta = geminiService.llamar(prompt);
        log.info("[RECOMPRA] Respuesta raw: {}", respuesta);
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