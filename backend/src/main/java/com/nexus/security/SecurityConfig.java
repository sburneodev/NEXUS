package com.nexus.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * ══════════════════════════════════════════════════════════════════════
 * CONVENCIÓN DE ROLES EN NEXUS ERP — LEER ANTES DE MODIFICAR
 * ══════════════════════════════════════════════════════════════════════
 *
 * REGLA ÚNICA: Los nombres de rol en TODO el código Java son SIN prefijo:
 *   ADMIN · CAJERO · GESTOR_INVENTARIO · MARKETING_ANALYST · CONTABLE
 *
 * La base de datos almacena "ROLE_ADMIN", "ROLE_CAJERO", etc.
 * El prefijo ROLE_ se elimina en DOS puntos defensivos:
 *   1. AuthService.login()            → JWT claim "roles" y LoginResponse
 *   2. CustomUserDetailsService       → Spring Security GrantedAuthority
 *
 * Por ello, SIEMPRE usa hasAuthority / hasAnyAuthority (NO hasRole):
 *   ✅ .hasAuthority("ADMIN")
 *   ✅ @PreAuthorize("hasAnyAuthority('ADMIN','CAJERO')")
 *   ❌ .hasRole("ADMIN")   ← hasRole añade ROLE_ automáticamente → falla
 * ══════════════════════════════════════════════════════════════════════
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Rutas públicas — sin token requerido
                .requestMatchers("/auth/login", "/auth/verify-email", "/auth/register").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // /error necesita ser público: Spring Boot reenvía aquí cualquier excepción
                // interna. Sin esto, los errores 401/403/5xx aparecen siempre como 403
                // porque Security bloquea el dispatch a /error para usuarios no autenticados.
                .requestMatchers("/error").permitAll()
                // Rutas exclusivas de administración — primera capa de defensa
                // (segunda capa: @PreAuthorize a nivel de clase/método en cada Controller)
                .requestMatchers("/admin/**", "/usuarios/**", "/audit/**").hasAuthority("ADMIN")
                // Todo lo demás: usuario autenticado (rol se valida en cada @PreAuthorize)
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS — permite peticiones desde el frontend en desarrollo (5173)
     * y desde producción. Sin esto el navegador bloquea las peticiones
     * del frontend al backend por ser orígenes distintos.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Orígenes permitidos: frontend en local y en producción
        config.setAllowedOrigins(List.of(
        	    "http://localhost:5173",
        	    "http://localhost:3000",
        	    "http://localhost:80",
        	    "http://localhost",
        	    "https://sibr.app"        // ← añadir
        	));

        // Métodos HTTP permitidos
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Headers permitidos en la petición
        config.setAllowedHeaders(List.of("*"));

        // Permite enviar cookies y el header Authorization
        config.setAllowCredentials(true);

        // Cuánto tiempo cachea el navegador la respuesta del preflight (segundos)
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}