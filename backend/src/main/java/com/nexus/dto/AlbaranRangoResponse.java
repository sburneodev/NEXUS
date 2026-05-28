package com.nexus.dto;

import java.util.List;

/**
 * AlbaranRangoResponse — respuesta de GET /api/stock/albaranes-rango
 */
public class AlbaranRangoResponse {

    private final List<AlbaranItem> albaranes;
    private final int               total;
    private final String            desde;
    private final String            hasta;
    /** null = todos, "ENTRADA" o "SALIDA" si se filtró */
    private final String            tipoFiltro;

    public AlbaranRangoResponse(List<AlbaranItem> albaranes,
                                String desde,
                                String hasta,
                                String tipoFiltro) {
        this.albaranes  = albaranes;
        this.total      = albaranes.size();
        this.desde      = desde;
        this.hasta      = hasta;
        this.tipoFiltro = tipoFiltro;
    }

    public List<AlbaranItem> getAlbaranes()  { return albaranes;  }
    public int               getTotal()      { return total;      }
    public String            getDesde()      { return desde;      }
    public String            getHasta()      { return hasta;      }
    public String            getTipoFiltro() { return tipoFiltro; }

    // ── AlbaranItem: un movimiento de stock ──────────────────────────────────

    public static class AlbaranItem {

        private final Long    idTransaccion;
        private final String  numero;
        private final String  tipo;
        private final String  fecha;
        private final String  productoSku;
        private final String  productoNombre;
        private final String  productoDescripcion;
        private final String  productoTipo;
        private final String  entidadNombre;
        private final String  entidadNif;
        private final String  entidadDireccion;
        private final String  entidadTelefono;
        private final String  entidadEmail;
        private final int     cantidad;
        private final int     stockAntes;
        private final int     stockDespues;
        private final Double  precioUnitario;
        private final String  referencia;
        private final String  notas;

        public AlbaranItem(Long idTransaccion, String tipo, String fecha,
                           String productoSku, String productoNombre,
                           String productoDescripcion, String productoTipo,
                           String entidadNombre, String entidadNif,
                           String entidadDireccion, String entidadTelefono,
                           String entidadEmail,
                           int cantidad, int stockAntes, int stockDespues,
                           Double precioUnitario, String referencia, String notas) {

            this.idTransaccion       = idTransaccion;
            this.tipo                = tipo;
            this.fecha               = fecha;
            this.productoSku         = productoSku;
            this.productoNombre      = productoNombre;
            this.productoDescripcion = productoDescripcion;
            this.productoTipo        = productoTipo;
            this.entidadNombre       = entidadNombre != null ? entidadNombre : "Sin entidad";
            this.entidadNif          = entidadNif;
            this.entidadDireccion    = entidadDireccion;
            this.entidadTelefono     = entidadTelefono;
            this.entidadEmail        = entidadEmail;
            this.cantidad            = cantidad;
            this.stockAntes          = stockAntes;
            this.stockDespues        = stockDespues;
            this.precioUnitario      = precioUnitario;
            this.referencia          = referencia;
            this.notas               = notas;

            String datePart = fecha != null && fecha.length() >= 10
                ? fecha.substring(0, 10).replace("-", "")
                : "00000000";
            this.numero = "ALB-" + datePart + "-" + String.format("%06d", idTransaccion);
        }

        public Long   getIdTransaccion()       { return idTransaccion;       }
        public String getNumero()              { return numero;              }
        public String getTipo()                { return tipo;                }
        public String getFecha()               { return fecha;               }
        public String getProductoSku()         { return productoSku;         }
        public String getProductoNombre()      { return productoNombre;      }
        public String getProductoDescripcion() { return productoDescripcion; }
        public String getProductoTipo()        { return productoTipo;        }
        public String getEntidadNombre()       { return entidadNombre;       }
        public String getEntidadNif()          { return entidadNif;          }
        public String getEntidadDireccion()    { return entidadDireccion;    }
        public String getEntidadTelefono()     { return entidadTelefono;     }
        public String getEntidadEmail()        { return entidadEmail;        }
        public int    getCantidad()            { return cantidad;            }
        public int    getStockAntes()          { return stockAntes;          }
        public int    getStockDespues()        { return stockDespues;        }
        public Double getPrecioUnitario()      { return precioUnitario;      }
        public String getReferencia()          { return referencia;          }
        public String getNotas()               { return notas;               }
    }
}