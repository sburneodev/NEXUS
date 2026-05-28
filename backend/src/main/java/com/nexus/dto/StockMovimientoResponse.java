package com.nexus.dto;

/**
 * StockMovimientoResponse — respuesta del endpoint POST /api/stock/movimiento
 *
 * Extiende la respuesta clásica (resultado + stockNuevo) con los datos
 * del albarán generado automáticamente tras cada ENTRADA o SALIDA exitosa.
 *
 * El código de albarán sigue el formato:
 *   ALB-YYYYMMDD-XXXXXX   (6 hex chars en mayúsculas)
 *   Ejemplo: ALB-20260527-A3F7B2
 */
public class StockMovimientoResponse {

    /** Mensaje del SP: "OK: 42 → 41" */
    private final String  resultado;

    /** Stock actual del producto tras el movimiento */
    private final Integer stockNuevo;

    /**
     * Código único del albarán generado.
     * Formato: ALB-YYYYMMDD-XXXXXX
     */
    private final String  albaranCodigo;

    /**
     * Timestamp ISO-8601 del movimiento (zona Europe/Madrid).
     * Ejemplo: 2026-05-27T15:42:30+02:00
     */
    private final String  albaranFecha;

    public StockMovimientoResponse(String resultado,
                                   Integer stockNuevo,
                                   String  albaranCodigo,
                                   String  albaranFecha) {
        this.resultado     = resultado;
        this.stockNuevo    = stockNuevo;
        this.albaranCodigo = albaranCodigo;
        this.albaranFecha  = albaranFecha;
    }

    public String  getResultado()     { return resultado;     }
    public Integer getStockNuevo()    { return stockNuevo;    }
    public String  getAlbaranCodigo() { return albaranCodigo; }
    public String  getAlbaranFecha()  { return albaranFecha;  }
}
