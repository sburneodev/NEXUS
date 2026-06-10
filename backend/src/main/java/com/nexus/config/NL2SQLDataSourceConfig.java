package com.nexus.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;

import javax.sql.DataSource;

@Configuration
public class NL2SQLDataSourceConfig {

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.username}")
    private String dbUsername;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    @Value("${nl2sql.datasource.username:nexus_readonly}")
    private String readonlyUser;

    @Value("${nl2sql.datasource.password:nexus_readonly_2026}")
    private String readonlyPassword;

    @Bean("primaryDataSource")
    @Primary
    public DataSource primaryDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(dbUrl);
        config.setUsername(dbUsername);
        config.setPassword(dbPassword);
        config.setPoolName("HikariPool-Primary");
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        return new HikariDataSource(config);
    }

    @Bean("primaryJdbcTemplate")
    @Primary
    public JdbcTemplate jdbcTemplate(
            @Qualifier("primaryDataSource") DataSource primaryDataSource) {
        return new JdbcTemplate(primaryDataSource);
    }

    @Bean("nl2sqlDataSource")
    public DataSource nl2sqlDataSource() {
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
            @Qualifier("nl2sqlDataSource") DataSource nl2sqlDataSource) {
        return new JdbcTemplate(nl2sqlDataSource);
    }
}