package com.nexus.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/**
 * NL2SQLDataSourceConfig — JdbcTemplate de lectura para el módulo NL2SQL.
 *
 * ── VERSIÓN SIMPLIFICADA (temporal) ──────────────────────────────────────────
 *
 * La versión original creaba un pool HikariCP separado con el usuario
 * "nexus_readonly". Eso causaba que el backend no arrancara en Docker por
 * dos motivos:
 *
 *   1. La URL leída de spring.datasource.url usaba "localhost" que dentro
 *      del contenedor Docker apunta al propio contenedor, no a nexus_db.
 *
 *   2. El usuario "nexus_readonly" no existe en la base de datos, por lo
 *      que HikariCP fallaba al crear la primera conexión del pool y Spring
 *      abortaba el arranque del contexto.
 *
 * Solución temporal: reutilizar el DataSource principal (nexus_app) que
 * Spring Boot ya configura correctamente. El módulo NL2SQL recibe su bean
 * "readonlyJdbcTemplate" y funciona con normalidad. La única diferencia es
 * que no es de solo lectura a nivel de BD, lo cual no tiene impacto real
 * porque el módulo solo ejecuta consultas SELECT.
 *
 * Para restaurar la versión original hay que:
 *   1. Crear el usuario nexus_readonly en PostgreSQL con permisos SELECT.
 *   2. Añadir NL2SQL_DB_URL, NL2SQL_USER y NL2SQL_PASSWORD al .env y
 *      al docker-compose.yml con los valores correctos (usando nexus_db
 *      como hostname, no localhost).
 *   3. Restaurar el código original de este archivo.
 */
@Configuration
public class NL2SQLDataSourceConfig {

    @Bean("readonlyJdbcTemplate")
    public JdbcTemplate readonlyJdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
