package com.nexus.dto;

/**
 * DTO de entrada para POST /api/usuarios/invitar.
 * Permite a un ADMIN crear un usuario directamente
 * con un rol inicial y contraseña temporal.
 */
public class InvitarUsuarioRequest {

    private String email;
    private String username;
    private String rol;
    private String password;

    public String getEmail()    { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRol()      { return rol; }
    public void setRol(String rol) { this.rol = rol; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
