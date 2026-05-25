package com.nexus.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Formato de email no válido")
    private String email;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, max = 100, message = "La contraseña debe tener entre 8 y 100 caracteres")
    private String password;

    // Constructor vacío obligatorio para que Jackson deserialice el JSON
    public RegisterRequest() {}

    public String getEmail()    { return email; }
    public String getPassword() { return password; }

    public void setEmail(String email)       { this.email    = email; }
    public void setPassword(String password) { this.password = password; }
}