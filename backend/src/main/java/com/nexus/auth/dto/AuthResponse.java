package com.nexus.auth.dto;

/**
 * DTO de salida genérico para los endpoints de autenticación.
 *
 * - Registro (SEC-06): solo devuelve 'message'. token y usuario son null.
 * - Login   (SEC-05, Sebastián): devuelve message + token + usuario.
 *
 * Los campos null no se serializan a JSON gracias a:
 * spring.jackson.default-property-inclusion=non_null en application.yml.
 */
public class AuthResponse {

    private String message;
    private String token;
    private UsuarioResumen usuario;

    // Constructor manual — sustituye a @AllArgsConstructor de Lombok
    public AuthResponse(String message, String token, UsuarioResumen usuario) {
        this.message  = message;
        this.token    = token;
        this.usuario  = usuario;
    }

    // Factory methods para no tener que recordar el orden de argumentos

    /** Registro exitoso: solo necesita un mensaje. */
    public static AuthResponse ofMessage(String message) {
        return new AuthResponse(message, null, null);
    }

    /** Login exitoso: mensaje + JWT + datos básicos del usuario. */
    public static AuthResponse ofLogin(String message, String token, UsuarioResumen usuario) {
        return new AuthResponse(message, token, usuario);
    }

    // Getters — sustituyen a @Data de Lombok
    public String         getMessage() { return message; }
    public String         getToken()   { return token; }
    public UsuarioResumen getUsuario() { return usuario; }

    // Setters
    public void setMessage(String message)           { this.message  = message; }
    public void setToken(String token)               { this.token    = token; }
    public void setUsuario(UsuarioResumen usuario)   { this.usuario  = usuario; }


    // ── DTO anidado con los datos del usuario que el frontend necesita ──
    public static class UsuarioResumen {

        private Long   id;
        private String username;
        private String email;
        private String nombreCompleto;

        // Constructor manual — sustituye a @AllArgsConstructor de Lombok
        public UsuarioResumen(Long id, String username, String email, String nombreCompleto) {
            this.id             = id;
            this.username       = username;
            this.email          = email;
            this.nombreCompleto = nombreCompleto;
        }

        // Getters — sustituyen a @Data de Lombok
        public Long   getId()             { return id; }
        public String getUsername()       { return username; }
        public String getEmail()          { return email; }
        public String getNombreCompleto() { return nombreCompleto; }

        // Setters
        public void setId(Long id)                           { this.id             = id; }
        public void setUsername(String username)             { this.username       = username; }
        public void setEmail(String email)                   { this.email          = email; }
        public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }
    }
}