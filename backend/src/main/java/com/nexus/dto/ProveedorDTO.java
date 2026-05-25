package com.nexus.dto;

public class ProveedorDTO {
    private Long id;
    private String razonSocial;
    private String cif;
    private String email;
    private String telefono;
    private String direccion;
    private Integer tiempoEntregaD;
    private Boolean activo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public Integer getTiempoEntregaD() { return tiempoEntregaD; }
    public void setTiempoEntregaD(Integer tiempoEntregaD) { this.tiempoEntregaD = tiempoEntregaD; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}