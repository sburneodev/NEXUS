package com.nexus.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "clientes")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(unique = true, length = 150)
    private String email;

    @Column(length = 30)
    private String telefono;

    @Column(name = "puntos_fidelidad", nullable = false)
    private Integer puntosFidelidad = 0;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn;

    @PrePersist
    protected void onCreate() {
        this.creadoEn      = OffsetDateTime.now();
        this.actualizadoEn = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.actualizadoEn = OffsetDateTime.now();
    }

    // Constructor vacío obligatorio para JPA
    public Cliente() {}

    // Getters y Setters
    public Long getId()                          { return id; }

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

    public OffsetDateTime getCreadoEn()          { return creadoEn; }
    public OffsetDateTime getActualizadoEn()     { return actualizadoEn; }
}
