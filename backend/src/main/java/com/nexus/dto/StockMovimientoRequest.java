package com.nexus.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

/**
 * DTO de entrada para registrar un movimiento de stock.
 * Se envía en el body del POST /api/stock/movimiento
 *
 * El SP acepta tres tipos de movimiento:
 *   ENTRADA  → reposición de proveedor (id_proveedor obligatorio)
 *   SALIDA   → venta a cliente        (id_cliente obligatorio)
 *   AJUSTE   → corrección manual      (cantidad puede ser negativa)
 */
public class StockMovimientoRequest {

    @NotNull(message = "El id del producto es obligatorio")
    private Long idProducto;

    // El id del usuario se extrae del JWT en el servicio, no lo envía el frontend

    private Long idCliente;    // Solo para SALIDA
    private Long idProveedor;  // Solo para ENTRADA

    @NotBlank(message = "El tipo de movimiento es obligatorio")
    @Pattern(regexp = "ENTRADA|SALIDA|AJUSTE",
             message = "El tipo debe ser ENTRADA, SALIDA o AJUSTE")
    private String tipoMovimiento;

    @NotNull(message = "La cantidad es obligatoria")
    @Min(value = 1, message = "La cantidad debe ser mayor que 0")
    private Integer cantidad;

    private BigDecimal precioUnitario;

    private String referencia;  // Nº de albarán, factura, etc.
    private String notas;

    // Constructor vacío para Jackson
    public StockMovimientoRequest() {}

    // Getters y Setters
    public Long getIdProducto()                        { return idProducto; }
    public void setIdProducto(Long idProducto)         { this.idProducto = idProducto; }

    public Long getIdCliente()                         { return idCliente; }
    public void setIdCliente(Long idCliente)           { this.idCliente = idCliente; }

    public Long getIdProveedor()                       { return idProveedor; }
    public void setIdProveedor(Long idProveedor)       { this.idProveedor = idProveedor; }

    public String getTipoMovimiento()                  { return tipoMovimiento; }
    public void setTipoMovimiento(String tipo)         { this.tipoMovimiento = tipo; }

    public Integer getCantidad()                       { return cantidad; }
    public void setCantidad(Integer cantidad)          { this.cantidad = cantidad; }

    public BigDecimal getPrecioUnitario()              { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precio)   { this.precioUnitario = precio; }

    public String getReferencia()                      { return referencia; }
    public void setReferencia(String referencia)       { this.referencia = referencia; }

    public String getNotas()                           { return notas; }
    public void setNotas(String notas)                 { this.notas = notas; }
}
