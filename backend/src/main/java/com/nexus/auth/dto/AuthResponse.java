package com.nexus.auth.dto;

/**
 * DTO de salida genérico para los endpoints de autenticación.
 *
 * - Registro (SEC-06): solo devuelve 'message'. token y usuario son null.
 * - Login   (SEC-05, Sebastián): devuelve message + token + usuario.
 *
 * Ya NO usamos Lombok (@Data, @AllArgsConstructor eliminados).
 */
public class AuthResponse {

    private String message;

    // Solo presente en el login. Null en el registro.
    private String token;

    // Resumen del usuario. Solo presente en el login.
    private UsuarioResumen usuario;

    // --- CONSTRUCTOR MANUAL ---
    public AuthResponse(String message, String token, UsuarioResumen usuario) {
        this.message = message;
        this.token = token;
        this.usuario = usuario;
    }

    // --- GETTERS Y SETTERS MANUALES ---

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UsuarioResumen getUsuario() {
        return usuario;
    }

    public void setUsuario(UsuarioResumen usuario) {
        this.usuario = usuario;
    }

    // --- Factory methods para no tener que recordar el orden de argumentos ---

    /** Registro exitoso: solo necesita un mensaje. */
    public static AuthResponse ofMessage(String message) {
        return new AuthResponse(message, null, null);
    }

    /** Login exitoso: mensaje + JWT + datos básicos del usuario. */
    public static AuthResponse ofLogin(String message, String token, UsuarioResumen usuario) {
        return new AuthResponse(message, token, usuario);
    }

    // =====================================================================
    // DTO anidado con los datos del usuario que el frontend necesita
    // =====================================================================
    public static class UsuarioResumen {
        private Long   id;
        private String username;
        private String email;
        private String nombreCompleto;

        // CONSTRUCTOR MANUAL
        public UsuarioResumen(Long id, String username, String email, String nombreCompleto) {
            this.id = id;
            this.username = username;
            this.email = email;
            this.nombreCompleto = nombreCompleto;
        }

        // GETTERS Y SETTERS MANUALES

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getNombreCompleto() {
            return nombreCompleto;
        }

        public void setNombreCompleto(String nombreCompleto) {
            this.nombreCompleto = nombreCompleto;
        }
    }
}