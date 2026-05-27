package com.nexus.dto;

import java.math.BigDecimal;
import java.util.Map;

public class ProductoDTO {

    private Long id;
    private String sku;
    private String nombre;
    private String descripcion;
    private BigDecimal precioCoste;
    private BigDecimal precioVenta;
    private Integer stockActual;
    private Integer stockMinimo;
    private Integer stockMaximo;
    private String tipoProducto;
    private String estadoConservacion;
    private Map<String, Object> atributosEspecificos;
    private Boolean activo;
    private Long   idProveedor;      // FK — se usa en POST/PUT para asignar proveedor
    private String proveedorNombre;  // Campo de solo lectura — join con tabla proveedores
    private Long   idCategoria;      // FK — categoría del producto
    private String categoriaNombre;  // Campo de solo lectura — join con tabla categorias
    private Long   idUbicacion;      // FK — ubicación física en almacén

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getPrecioCoste() { return precioCoste; }
    public void setPrecioCoste(BigDecimal precioCoste) { this.precioCoste = precioCoste; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public Integer getStockActual() { return stockActual; }
    public void setStockActual(Integer stockActual) { this.stockActual = stockActual; }
    public Integer getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(Integer stockMinimo) { this.stockMinimo = stockMinimo; }
    public Integer getStockMaximo() { return stockMaximo; }
    public void setStockMaximo(Integer stockMaximo) { this.stockMaximo = stockMaximo; }
    public String getTipoProducto() { return tipoProducto; }
    public void setTipoProducto(String tipoProducto) { this.tipoProducto = tipoProducto; }
    public String getEstadoConservacion() { return estadoConservacion; }
    public void setEstadoConservacion(String e) { this.estadoConservacion = e; }
    public Map<String, Object> getAtributosEspecificos() { return atributosEspecificos; }
    public void setAtributosEspecificos(Map<String, Object> a) { this.atributosEspecificos = a; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public Long getIdProveedor() { return idProveedor; }
    public void setIdProveedor(Long idProveedor) { this.idProveedor = idProveedor; }
    public String getProveedorNombre() { return proveedorNombre; }
    public void setProveedorNombre(String proveedorNombre) { this.proveedorNombre = proveedorNombre; }
    public Long getIdCategoria() { return idCategoria; }
    public void setIdCategoria(Long idCategoria) { this.idCategoria = idCategoria; }
    public String getCategoriaNombre() { return categoriaNombre; }
    public void setCategoriaNombre(String categoriaNombre) { this.categoriaNombre = categoriaNombre; }
    public Long getIdUbicacion() { return idUbicacion; }
    public void setIdUbicacion(Long idUbicacion) { this.idUbicacion = idUbicacion; }
}