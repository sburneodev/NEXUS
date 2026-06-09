package com.nexus.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class NL2SQLDataSourceConfig {

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${nl2sql.datasource.username:nexus_readonly}")
    private String readonlyUser;

    @Value("${nl2sql.datasource.password:nexus_readonly_2026}")
    private String readonlyPassword;

    @Bean("readonlyDataSource")
    public DataSource readonlyDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(dbUrl);
        config.setUsername(readonlyUser);
        config.setPassword(readonlyPassword);
        config.setPoolName("HikariReadOnly-NL2SQL");
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(1);
        config.setReadOnly(true);
        return new HikariDataSource(config);
    }

    @Bean("readonlyJdbcTemplate")
    public JdbcTemplate readonlyJdbcTemplate(
            @Qualifier("readonlyDataSource") DataSource readonlyDataSource) {
        return new JdbcTemplate(readonlyDataSource);
    }
}