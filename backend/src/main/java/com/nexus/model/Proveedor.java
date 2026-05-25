package com.nexus.model;

import jakarta.persistence.*;

@Entity
@Table(name = "proveedores")
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "razon_social", nullable = false)
    private String razonSocial;

    private String cif;
    private String email;
    private String telefono;
    private String direccion;

    @Column(name = "tiempo_entrega_d")
    private Short tiempoEntregaD;

    private Boolean activo = true;

    public Long getId() { return id; }
    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String razonSocial) { this.razonSocial = razonSocial; }
    public String getCif() { return cif; }
    public void setCif(String cif) { this.cif = cif; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public Short getTiempoEntregaD() { return tiempoEntregaD; }
    public void setTiempoEntregaD(Short tiempoEntregaD) { this.tiempoEntregaD = tiempoEntregaD; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}