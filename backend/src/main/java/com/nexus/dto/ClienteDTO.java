package com.nexus.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public class ClienteDTO {

    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no puede superar 150 caracteres")
    private String nombre;

    @Email(message = "Formato de email no válido")
    @Size(max = 150, message = "El email no puede superar 150 caracteres")
    private String email;

    @Size(max = 30, message = "El teléfono no puede superar 30 caracteres")
    private String telefono;

    @Min(value = 0, message = "Los puntos de fidelidad no pueden ser negativos")
    private Integer puntosFidelidad;

    private Boolean activo;
    private OffsetDateTime creadoEn;
    private OffsetDateTime actualizadoEn;

    // Constructor vacío para Jackson
    public ClienteDTO() {}

    // Getters y Setters
    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public String getNombre()                    { return nombre; }
    public void setNombre(String nombre)         { this.nombre = nombre; }

    public String getEmail()                     { return email; }
    public void setEmail(String email)           { this.email = email; }

    public String getTelefono()                  { return telefono; }
    public void setTelefono(String telefono)     { this.telefono = telefono; }

    public Integer getPuntosFidelidad()                        { return puntosFidelidad; }
    public void setPuntosFidelidad(Integer puntosFidelidad)    { this.puntosFidelidad = puntosFidelidad; }

    public Boolean getActivo()                   { return activo; }
    public void setActivo(Boolean activo)        { this.activo = activo; }

    public OffsetDateTime getCreadoEn()                        { return creadoEn; }
    public void setCreadoEn(OffsetDateTime creadoEn)           { this.creadoEn = creadoEn; }

    public OffsetDateTime getActualizadoEn()                   { return actualizadoEn; }
    public void setActualizadoEn(OffsetDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}