package com.nexus.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * SecurityConfig — Configuración central de Spring Security.
 *
 * CAMBIOS respecto a la versión anterior del proyecto:
 *   1. /auth/register añadido a rutas públicas (SEC-06)
 *   2. /auth/verify-email añadido a rutas públicas (SEC-08, Sebastián)
 *   3. Bean PasswordEncoder (BCrypt cost=12) → lo necesita AuthService
 *   4. JwtAuthFilter insertado en la cadena antes del filtro estándar
 *   5. STATELESS: sin sesiones HTTP, solo JWT
 *   6. AuthenticationProvider y AuthenticationManager para SEC-05 (login)
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter            jwtAuthFilter;
    private final CustomUserDetailsService customUserDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // APIs REST no necesitan protección CSRF
            .csrf(AbstractHttpConfigurer::disable)

            .authorizeHttpRequests(auth -> auth
                // Rutas públicas: accesibles sin JWT
                .requestMatchers(
                        "/auth/login",         // SEC-05 — Sebastián
                        "/auth/register",      // SEC-06 — Desirée ✅
                        "/auth/verify-email",  // SEC-08 — Sebastián
                        "/actuator/health",
                        "/actuator/info"
                ).permitAll()
                // Todo lo demás exige JWT válido
                .anyRequest().authenticated()
            )

            // Sin sesiones HTTP: cada request lleva su JWT
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Registrar el proveedor de autenticación (BCrypt + UserDetails)
            .authenticationProvider(authenticationProvider())

            // Insertar JwtAuthFilter ANTES del filtro de usuario/password de Spring
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * BCrypt con 12 rondas: estándar de seguridad recomendado.
     * Sebastián lo usará también en AuthService.login() para verificar passwords.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Conecta CustomUserDetailsService con BCryptPasswordEncoder.
     * Spring Security usa esto internamente para validar credenciales.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Expone AuthenticationManager como bean.
     * Sebastián lo inyectará en AuthService para implementar el login (SEC-05).
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }
}