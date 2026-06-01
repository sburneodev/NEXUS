package com.nexus.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.Map;

/**
 * NL2SQLService — AI-07
 *
 * Seguridad en dos capas:
 *   1. Validación léxica: SELECT-only, bloqueo de keywords destructivas.
 *   2. Usuario de BD de solo lectura (nexus_readonly): aunque Gemini
 *      generara SQL destructivo y pasara la validación, el usuario de BD
 *      no tiene permisos de escritura. Defensa en profundidad.
 *
 * El DataSource secundario de solo lectura se crea programáticamente
 * para no interferir con el DataSource principal de Spring Boot.
 */
@Service
public class NL2SQLService {

    private static final Logger log = LoggerFactory.getLogger(NL2SQLService.class);

<<<<<<< HEAD
    private final GeminiService geminiService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String KEY_DESCRIPCION = "descripcion";
    
    public NL2SQLService(GeminiService geminiService, JdbcTemplate jdbcTemplate) {
=======
    private final GeminiService  geminiService;
    private final ObjectMapper   objectMapper = new ObjectMapper();

    // JdbcTemplate de solo lectura — usa nexus_readonly
    private JdbcTemplate       readOnlyJdbc;
    private HikariDataSource   readOnlyDs;

    // Construimos la URL de solo lectura a partir de la URL principal
    // reemplazando las credenciales. La URL JDBC es la misma, solo
    // cambian usuario y contraseña.
    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${nl2sql.readonly.username:nexus_readonly}")
    private String readonlyUser;

    @Value("${nl2sql.readonly.password:nexus_readonly_2026}")
    private String readonlyPassword;

    public NL2SQLService(GeminiService geminiService) {
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
        this.geminiService = geminiService;
    }

    @PostConstruct
    void initReadOnlyDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(dbUrl);
        config.setUsername(readonlyUser);
        config.setPassword(readonlyPassword);
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(1);
        config.setPoolName("HikariPool-NL2SQL-ReadOnly");
        config.setReadOnly(true);   // Marca la conexión como read-only a nivel JDBC
        readOnlyDs   = new HikariDataSource(config);
        readOnlyJdbc = new JdbcTemplate(readOnlyDs);
        log.info("[NL2SQL] DataSource de solo lectura inicializado (usuario: {})", readonlyUser);
    }

    @PreDestroy
    void closeReadOnlyDataSource() {
        if (readOnlyDs != null && !readOnlyDs.isClosed()) {
            readOnlyDs.close();
            log.info("[NL2SQL] DataSource de solo lectura cerrado");
        }
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
        return procesarYEjecutar(respuesta);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> procesarYEjecutar(String respuesta) {
        try {
            String limpio = respuesta
                .replace("```json", "")
                .replace("```", "")
                .trim();

            Map<String, Object> parsed = objectMapper.readValue(limpio, Map.class);
            String sql = (String) parsed.get("sql");

            if (sql == null || sql.isBlank()) {
                return Map.of(
<<<<<<< HEAD
                    "error", "No se pudo generar SQL para esta pregunta",
                    KEY_DESCRIPCION, parsed.getOrDefault(KEY_DESCRIPCION, "")
=======
                    "error",       "No se pudo generar SQL para esta pregunta",
                    "descripcion", parsed.getOrDefault("descripcion", "")
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
                );
            }

            // ── Capa 1: Validación léxica ─────────────────────────────────
            String sqlUpper = sql.trim().toUpperCase();

            if (!sqlUpper.startsWith("SELECT")) {
                log.warn("[NL2SQL] SQL no-SELECT bloqueado: {}", sql);
                throw new RuntimeException("Solo se permiten consultas SELECT");
            }

            for (String keyword : List.of("INSERT", "UPDATE", "DELETE", "DROP",
                                          "ALTER", "TRUNCATE", "CREATE", "GRANT")) {
                if (sqlUpper.contains(keyword)) {
                    log.warn("[NL2SQL] Keyword peligrosa bloqueada: {}", keyword);
                    throw new RuntimeException("Consulta no permitida: contiene " + keyword);
                }
            }

            // ── Capa 2: Ejecución con usuario de solo lectura ─────────────
            // Aunque la validación léxica pasara, nexus_readonly no tiene
            // permisos de escritura en la BD. Defensa en profundidad.
            log.info("[NL2SQL] Ejecutando con usuario readonly: {}", sql);
            List<Map<String, Object>> resultados = readOnlyJdbc.queryForList(sql);

            return Map.of(
<<<<<<< HEAD
                "sql", sql,
                KEY_DESCRIPCION, parsed.getOrDefault(KEY_DESCRIPCION, ""),
                "columnas", resultados.isEmpty() ? List.of() :
                            resultados.get(0).keySet().stream().toList(),
                "filas", resultados,
=======
                "sql",         sql,
                "descripcion", parsed.getOrDefault("descripcion", ""),
                "columnas",    resultados.isEmpty()
                                   ? List.of()
                                   : resultados.get(0).keySet().stream().toList(),
                "filas",       resultados,
>>>>>>> b0e3f97b29deff65b9a906a3bee3bb9c178cff8e
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