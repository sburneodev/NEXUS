package com.nexus.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para POST /auth/register (SEC-06).
 *
 * @Valid en el controlador activa estas anotaciones automáticamente.
 * Si alguna falla → Spring devuelve 400 Bad Request antes de llamar al servicio.
 */
public class RegisterRequest {

    @NotBlank(message = "El username es obligatorio")
    @Size(min = 3, max = 60, message = "El username debe tener entre 3 y 60 caracteres")
    private String username;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Formato de email no válido")
    @Size(max = 150, message = "El email no puede superar 150 caracteres")
    private String email;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, max = 100, message = "La contraseña debe tener entre 8 y 100 caracteres")
    private String password;

    @Size(max = 150, message = "El nombre completo no puede superar 150 caracteres")
    private String nombreCompleto;

    // Constructor vacío OBLIGATORIO para que Jackson deserialice el JSON del body.
    // @Data de Lombok lo generaba automáticamente, ahora hay que escribirlo a mano.
    public RegisterRequest() {}

    // Getters — sustituyen a @Data de Lombok
    public String getUsername()       { return username; }
    public String getEmail()          { return email; }
    public String getPassword()       { return password; }
    public String getNombreCompleto() { return nombreCompleto; }

    // Setters
    public void setUsername(String username)             { this.username       = username; }
    public void setEmail(String email)                   { this.email          = email; }
    public void setPassword(String password)             { this.password       = password; }
    public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }
}