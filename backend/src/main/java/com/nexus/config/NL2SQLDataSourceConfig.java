package com.nexus.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/**
 * NL2SQLDataSourceConfig — JdbcTemplate de lectura para el módulo NL2SQL.
 *
 * Usa el datasource principal en lugar de crear un pool separado.
 * El bean "readonlyDataSource" original fallaba porque el usuario nexus_readonly
 * no existe en la base de datos, impidiendo que el backend arrancase.
 */
@Configuration
public class NL2SQLDataSourceConfig {

    @Bean("readonlyJdbcTemplate")
    public JdbcTemplate readonlyJdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}