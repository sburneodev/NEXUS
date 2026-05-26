package com.nexus.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class NL2SQLService {

    private static final Logger log = LoggerFactory.getLogger(NL2SQLService.class);

    private final GeminiService geminiService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public NL2SQLService(GeminiService geminiService, JdbcTemplate jdbcTemplate) {
        this.geminiService = geminiService;
        this.jdbcTemplate  = jdbcTemplate;
    }

    private static final String SCHEMA = """
        Tablas disponibles (PostgreSQL):
        - usuarios(id, email, username, nombre_completo, is_active, is_verified, creado_en)
        - roles(id, nombre, descripcion)
        - usuarios_roles(id_usuario, id_rol)
        - productos(id, sku, nombre, descripcion, precio_coste, precio_venta, stock_actual,
                    stock_minimo, tipo_producto, estado_conservacion, activo, id_proveedor, id_ubicacion)
        - proveedores(id, razon_social, email, tiempo_entrega_d, activo)
        - clientes(id, nombre, email, telefono, puntos_fidelidad, activo, creado_en)
        - transacciones_stock(id, id_producto, id_usuario, id_cliente, id_proveedor,
                              tipo_movimiento, cantidad, stock_antes, stock_despues,
                              precio_unitario, referencia, fecha)
        - ordenes_compra(id, id_proveedor, id_usuario, estado, fecha_creacion, fecha_recepcion)
        - detalles_orden_compra(id, id_orden, id_producto, cantidad, precio_unitario)
        - ubicaciones_almacen(id, pasillo, estanteria, nivel)
        - audit_log(id, tabla, operacion, id_registro, datos_antes, datos_despues, creado_en)
        """;

    public Map<String, Object> ejecutarConsulta(String preguntaEnEspanol) {
        String prompt = """
            Eres un experto en SQL para PostgreSQL. Convierte la pregunta en español
            a una consulta SQL válida.
            
            ESQUEMA DE LA BASE DE DATOS:
            %s
            
            REGLAS CRÍTICAS:
            1. Genera ÚNICAMENTE una consulta SELECT — NUNCA INSERT, UPDATE, DELETE, DROP, ALTER.
            2. Devuelve SOLO un JSON con esta estructura exacta, sin markdown:
               {"sql": "SELECT ...", "descripcion": "qué hace la consulta"}
            3. Usa JOINs cuando necesites datos de varias tablas.
            4. Limita siempre con LIMIT 100 máximo.
            5. Si la pregunta no es consultable, devuelve:
               {"sql": null, "descripcion": "No es posible responder esta pregunta"}
            
            Pregunta: "%s"
            """.formatted(SCHEMA, preguntaEnEspanol);

        String respuesta = geminiService.llamar(prompt);
        return procesarYEjecutar(respuesta, preguntaEnEspanol);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> procesarYEjecutar(String respuesta, String pregunta) {
        try {
            String limpio = respuesta
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();

            Map<String, Object> parsed = objectMapper.readValue(limpio, Map.class);
            String sql = (String) parsed.get("sql");

            if (sql == null || sql.isBlank()) {
                return Map.of(
                    "error", "No se pudo generar SQL para esta pregunta",
                    "descripcion", parsed.getOrDefault("descripcion", "")
                );
            }

            // Validación de seguridad — solo SELECT permitido
            String sqlUpper = sql.trim().toUpperCase();
            if (!sqlUpper.startsWith("SELECT")) {
                log.warn("[NL2SQL] Intento de SQL no-SELECT bloqueado: {}", sql);
                throw new RuntimeException("Solo se permiten consultas SELECT");
            }

            // Palabras clave peligrosas bloqueadas
            for (String keyword : List.of("INSERT", "UPDATE", "DELETE", "DROP",
                                           "ALTER", "TRUNCATE", "CREATE", "GRANT")) {
                if (sqlUpper.contains(keyword)) {
                    log.warn("[NL2SQL] Keyword peligrosa detectada: {}", keyword);
                    throw new RuntimeException("Consulta no permitida: contiene " + keyword);
                }
            }

            log.info("[NL2SQL] Ejecutando: {}", sql);
            List<Map<String, Object>> resultados = jdbcTemplate.queryForList(sql);

            return Map.of(
                "sql", sql,
                "descripcion", parsed.getOrDefault("descripcion", ""),
                "columnas", resultados.isEmpty() ? List.of() :
                            resultados.get(0).keySet().stream().toList(),
                "filas", resultados,
                "total_filas", resultados.size()
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("[NL2SQL] Error: {}", e.getMessage());
            return Map.of("error", "Error procesando la consulta: " + e.getMessage());
        }
    }
}