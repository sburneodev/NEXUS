package com.nexus.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO de entrada para POST /auth/register (SEC-06).
 *
 * @Valid en el controlador activa estas anotaciones automáticamente.
 * Si alguna falla → Spring devuelve 400 Bad Request antes de llamar al servicio.
 */
@Data
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

    // Opcional: si no se envía queda como cadena vacía en la BD (DEFAULT '')
    @Size(max = 150, message = "El nombre completo no puede superar 150 caracteres")
    private String nombreCompleto;
}