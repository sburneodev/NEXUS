package com.nexus.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO de salida genérico para los endpoints de autenticación.
 *
 * - Registro (SEC-06): solo devuelve 'message'. token y usuario son null.
 * - Login   (SEC-05, Sebastián): devuelve message + token + usuario.
 *
 * Los campos null no se serializan a JSON si se configura
 * spring.jackson.default-property-inclusion=non_null en application.yml.
 */
@Data
@AllArgsConstructor
public class AuthResponse {

    private String message;

    // Solo presente en el login. Null en el registro.
    private String token;

    // Resumen del usuario. Solo presente en el login.
    private UsuarioResumen usuario;

    // --- Factory methods para no tener que recordar el orden de argumentos ---

    /** Registro exitoso: solo necesita un mensaje. */
    public static AuthResponse ofMessage(String message) {
        return new AuthResponse(message, null, null);
    }

    /** Login exitoso: mensaje + JWT + datos básicos del usuario. */
    public static AuthResponse ofLogin(String message, String token, UsuarioResumen usuario) {
        return new AuthResponse(message, token, usuario);
    }

    // DTO anidado con los datos del usuario que el frontend necesita
    @Data
    @AllArgsConstructor
    public static class UsuarioResumen {
        private Long   id;
        private String username;
        private String email;
        private String nombreCompleto;
    }
}