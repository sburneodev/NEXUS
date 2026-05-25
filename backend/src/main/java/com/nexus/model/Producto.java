package com.nexus.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.util.Map;

@Entity
@Table(name = "productos")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String nombre;

    private String descripcion;

    @Column(name = "precio_coste", nullable = false)
    private BigDecimal precioCoste;

    @Column(name = "precio_venta", nullable = false)
    private BigDecimal precioVenta;

    @Column(name = "stock_actual", nullable = false)
    private Integer stockActual = 0;

    @Column(name = "stock_minimo", nullable = false)
    private Integer stockMinimo = 0;

    @Column(name = "stock_maximo", nullable = false)
    private Integer stockMaximo = 9999;

    @Column(name = "tipo_producto", nullable = false)
    private String tipoProducto = "ESTANDAR";

    @Column(name = "estado_conservacion")
    private String estadoConservacion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "atributos_especificos", columnDefinition = "jsonb")
    private Map<String, Object> atributosEspecificos;

    @Column(nullable = false)
    private Boolean activo = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proveedor")
    private Proveedor proveedor;

    // Getters y Setters
    public Long getId() { return id; }
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
    public void setEstadoConservacion(String estadoConservacion) { this.estadoConservacion = estadoConservacion; }
    public Map<String, Object> getAtributosEspecificos() { return atributosEspecificos; }
    public void setAtributosEspecificos(Map<String, Object> atributosEspecificos) { this.atributosEspecificos = atributosEspecificos; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public Proveedor getProveedor() { return proveedor; }
    public void setProveedor(Proveedor proveedor) { this.proveedor = proveedor; }
}