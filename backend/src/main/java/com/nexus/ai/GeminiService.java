package com.nexus.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${ai.gemini.api-key}")
    private String apiKey;

    @Value("${ai.gemini.url}")
    private String apiUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Llamada base a la API de Gemini.
     * Construye el JSON del request, lo envía y extrae el texto de la respuesta.
     */
    public String llamar(String prompt) {
        try {
            String urlConKey = apiUrl + "?key=" + apiKey;

            String body = """
                {
                  "contents": [{
                    "parts": [{"text": %s}]
                  }],
                  "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1024
                  }
                }
                """.formatted(objectMapper.writeValueAsString(prompt));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(urlConKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[GEMINI] Error HTTP {}: {}", response.statusCode(), response.body());
                throw new ResponseStatusException(
                	    org.springframework.http.HttpStatus.BAD_GATEWAY,
                	    "Error llamando a Gemini: HTTP " + response.statusCode()
                	);
            }

            JsonNode root = objectMapper.readTree(response.body());
            return root.path("candidates")
                       .path(0)
                       .path("content")
                       .path("parts")
                       .path(0)
                       .path("text")
                       .asText();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error en GeminiService: hilo interrumpido", e);
        } catch (Exception e) {
            log.error("[GEMINI] Excepción: {}", e.getMessage());
            throw new RuntimeException("Error en GeminiService: " + e.getMessage(), e);
        }
    }
}