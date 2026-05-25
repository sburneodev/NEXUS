package com.nexus.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Deshabilitar CSRF (Fundamental para APIs REST)
            .csrf(csrf -> csrf.disable())
            
            // 2. Configurar los permisos de las rutas
            .authorizeHttpRequests(auth -> auth
                // Rutas que cualquiera puede ver sin estar logueado
                .requestMatchers("/api/public/**", "/api/auth/login").permitAll() 
                // Cualquier otra ruta exige estar autenticado
                .anyRequest().authenticated() 
            );
        

        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

}