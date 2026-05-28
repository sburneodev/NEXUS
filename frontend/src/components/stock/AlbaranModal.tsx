/**
 * components/stock/AlbaranModal.tsx
 *
 * Modal de confirmación + vista de impresión del albarán de stock.
 *
 * ── Flujo UX ──────────────────────────────────────────────────────────────────
 * 1. StockPage registra una ENTRADA o SALIDA y recibe `albaranCodigo` del backend.
 * 2. Abre este modal pasando los datos del movimiento.
 * 3. El modal muestra confirmación + resumen del movimiento.
 * 4. El usuario puede:
 *    a) Cerrar (sin imprimir).
 *    b) "Ver / Imprimir Albarán" → llama a window.print().
 *
 * ── CSS de impresión ──────────────────────────────────────────────────────────
 * Se inyecta una <style> en <head> via React portal mientras el modal está abierto.
 *   @media screen → oculta #albaran-root (sólo se ve el modal de la app)
 *   @media print  → oculta #root (la app) y muestra #albaran-root (el documento)
 *
 * ── Código de barras ─────────────────────────────────────────────────────────
 * Code 39 en SVG puro (Code39Barcode.tsx) — sin librerías externas.
 */

import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { Code39Barcode }     from './Code39Barcode';
import type { Producto, TipoMovimiento } from '../../types/models';

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface AlbaranInfo {
    /** Código único generado por el backend: ALB-YYYYMMDD-XXXXXX */
    codigo:         string;
    /** ISO-8601 timestamp del backend (incluye zona horaria) */
    fecha:          string;
    tipoMovimiento: TipoMovimiento;
    producto:       Producto;
    cantidad:       number;
    precioUnitario: number | null;
    referencia:     string;
    notas:          string;
    stockNuevo:     number;
}

interface Props {
    isOpen:  boolean;
    onClose: () => void;
    data:    AlbaranInfo | null;
}

// ── CSS de impresión ──────────────────────────────────────────────────────────

const PRINT_CSS = `
@media screen {
    #albaran-root { display: none !important; }
}
@media print {
    #root         { display: none !important; }
    #albaran-root { display: block !important; }
    @page {
        size: A4 portrait;
        margin: 15mm 20mm;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtFecha(iso: string): string {
    try {
        return new Date(iso).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch {
        return iso;
    }
}

function fmtEur(n: number): string {
    return `€${n.toFixed(2)}`;
}

const TIPO_LABEL: Record<TipoMovimiento, string> = {
    ENTRADA: 'Entrada de Mercancía',
    SALIDA:  'Salida / Venta',
    AJUSTE:  'Ajuste de Inventario',
};

const TIPO_COLOR_HEX: Record<TipoMovimiento, string> = {
    ENTRADA: '#00cc6a',
    SALIDA:  '#ff4466',
    AJUSTE:  '#ffc845',
};

const TIPO_COLOR_VAR: Record<TipoMovimiento, string> = {
    ENTRADA: 'var(--accent-primary)',
    SALIDA:  'var(--accent-danger)',
    AJUSTE:  'var(--accent-gold)',
};

// ── Documento imprimible ───────────────────────────────────────────────────────
// Renderizado en <body> via portal. Oculto en pantalla, visible al imprimir.

function AlbaranDocument({ d }: { d: AlbaranInfo }): JSX.Element {
    const tipoColor = TIPO_COLOR_HEX[d.tipoMovimiento];
    const total     = d.precioUnitario != null
        ? fmtEur(d.precioUnitario * d.cantidad)
        : '—';

    const sectionLabel: CSSProperties = {
        fontSize:      '8px',
        fontWeight:    700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         '#888888',
        marginBottom:  '3px',
        display:       'block',
        fontFamily:    "'Helvetica Neue', Arial, sans-serif",
    };

    const monoVal: CSSProperties = {
        fontFamily: "'Courier New', Courier, monospace",
        fontSize:   '12px',
        color:      '#111111',
        fontWeight: 600,
    };

    return (
        <div id="albaran-root" style={{
            background: '#ffffff',
            color:      '#111111',
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize:   '12px',
            lineHeight: 1.5,
        }}>

            {/* ── Cabecera ── */}
            <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'flex-start',
                borderBottom:   '2px solid #111111',
                paddingBottom:  '14px',
                marginBottom:   '18px',
            }}>
                {/* Izquierda: marca */}
                <div>
                    <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '0.14em', color: '#000000' }}>
                        NEXUS
                    </div>
                    <div style={{ fontSize: '10px', color: '#666666', marginTop: '2px', letterSpacing: '0.06em' }}>
                        Level Up Gaming · La Bóveda Retro
                    </div>
                </div>

                {/* Derecha: tipo de documento + código */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444444', marginBottom: '5px' }}>
                        Albarán de Movimiento
                    </div>
                    <div style={{ ...monoVal, fontSize: '15px', letterSpacing: '0.06em' }}>
                        {d.codigo}
                    </div>
                </div>
            </div>

            {/* ── Meta del movimiento ── */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 '10px 24px',
                marginBottom:        '22px',
                padding:             '12px 14px',
                background:          '#f7f7f7',
                borderRadius:        '5px',
                border:              '1px solid #e8e8e8',
            }}>
                <div>
                    <span style={sectionLabel}>Fecha y Hora</span>
                    <span style={monoVal}>{fmtFecha(d.fecha)}</span>
                </div>
                <div>
                    <span style={sectionLabel}>Tipo de Operación</span>
                    <span style={{ fontWeight: 700, color: tipoColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '12px' }}>
                        {TIPO_LABEL[d.tipoMovimiento]}
                    </span>
                </div>
                {d.referencia && (
                    <div>
                        <span style={sectionLabel}>Referencia</span>
                        <span style={monoVal}>{d.referencia}</span>
                    </div>
                )}
                <div>
                    <span style={sectionLabel}>Stock Resultante</span>
                    <span style={{ ...monoVal, fontWeight: 700 }}>{d.stockNuevo} uds.</span>
                </div>
            </div>

            {/* ── Línea de producto ── */}
            <table style={{
                width:           '100%',
                borderCollapse:  'collapse',
                marginBottom:    '18px',
                fontSize:        '11px',
            }}>
                <thead>
                    <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #cccccc' }}>
                        {['SKU', 'Descripción del Producto', 'Tipo', 'Uds.', 'P. Unit.', 'Total'].map(h => (
                            <th key={h} style={{
                                padding:       '7px 10px',
                                textAlign:     'left',
                                fontSize:      '9px',
                                fontWeight:    700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color:         '#555555',
                            }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #eeeeee' }}>
                        <td style={{ padding: '9px 10px', fontFamily: "'Courier New', monospace", fontWeight: 600 }}>
                            {d.producto.sku}
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                            <div style={{ fontWeight: 600, color: '#000000' }}>{d.producto.nombre}</div>
                            {d.producto.descripcion && (
                                <div style={{ fontSize: '10px', color: '#777777', marginTop: '2px' }}>
                                    {d.producto.descripcion.length > 90
                                        ? `${d.producto.descripcion.slice(0, 90)}…`
                                        : d.producto.descripcion}
                                </div>
                            )}
                        </td>
                        <td style={{ padding: '9px 10px', color: '#555555' }}>
                            {d.producto.tipoProducto}
                        </td>
                        <td style={{ padding: '9px 10px', fontFamily: "'Courier New', monospace", fontWeight: 700, textAlign: 'center' }}>
                            {d.cantidad}
                        </td>
                        <td style={{ padding: '9px 10px', fontFamily: "'Courier New', monospace" }}>
                            {d.precioUnitario != null ? fmtEur(d.precioUnitario) : '—'}
                        </td>
                        <td style={{ padding: '9px 10px', fontFamily: "'Courier New', monospace", fontWeight: 700 }}>
                            {total}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* ── Notas (condicional) ── */}
            {d.notas && (
                <div style={{
                    background:   '#f9f9f9',
                    border:       '1px solid #dddddd',
                    borderRadius: '4px',
                    padding:      '10px 14px',
                    marginBottom: '20px',
                }}>
                    <span style={sectionLabel}>Notas del Movimiento</span>
                    <p style={{ margin: 0, fontSize: '11px', color: '#333333', lineHeight: 1.6 }}>{d.notas}</p>
                </div>
            )}

            {/* ── Código de barras ── */}
            <div style={{
                borderTop:      '1px solid #dddddd',
                paddingTop:     '18px',
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            '8px',
                marginBottom:   '18px',
            }}>
                <Code39Barcode value={d.codigo} height={56} narrowWidth={2} showText={false} />
                <div style={{
                    fontFamily:    "'Courier New', Courier, monospace",
                    fontSize:      '11px',
                    letterSpacing: '0.14em',
                    color:         '#222222',
                }}>
                    {d.codigo}
                </div>
                <div style={{ fontSize: '8px', color: '#aaaaaa', letterSpacing: '0.06em' }}>
                    Código Code 39 · Generado automáticamente por NEXUS ERP
                </div>
            </div>

            {/* ── Pie de página ── */}
            <div style={{
                borderTop:      '1px solid #eeeeee',
                paddingTop:     '10px',
                display:        'flex',
                justifyContent: 'space-between',
                fontSize:       '8px',
                color:          '#aaaaaa',
                letterSpacing:  '0.04em',
            }}>
                <span>NEXUS ERP · Documento generado automáticamente</span>
                <span>Este documento no tiene valor fiscal ni comercial</span>
            </div>
        </div>
    );
}

// ── AlbaranModal — overlay de la app ──────────────────────────────────────────

export function AlbaranModal({ isOpen, onClose, data }: Props): JSX.Element | null {
    if (!isOpen || !data) return null;

    const accentVar = TIPO_COLOR_VAR[data.tipoMovimiento];
    const accentHex = TIPO_COLOR_HEX[data.tipoMovimiento];

    return (
        <>
            {/* CSS de impresión inyectado en <head> */}
            {createPortal(<style>{PRINT_CSS}</style>, document.head)}

            {/* Documento imprimible renderizado en <body> (oculto en pantalla) */}
            {createPortal(<AlbaranDocument d={data} />, document.body)}

            {/* ── Overlay del modal ── */}
            <div
                onClick={e => { if (e.target === e.currentTarget) onClose(); }}
                style={{
                    position:       'fixed',
                    inset:          0,
                    zIndex:         1000,
                    background:     'rgba(5,5,10,0.88)',
                    backdropFilter: 'blur(6px)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    padding:        '24px',
                }}
            >
                <div style={{
                    background:   'var(--bg-surface)',
                    border:       '1px solid var(--border-default)',
                    borderRadius: '16px',
                    padding:      '32px 28px 28px',
                    maxWidth:     '460px',
                    width:        '100%',
                    boxShadow:    '0 32px 80px rgba(0,0,0,0.85)',
                    position:     'relative',
                    overflow:     'hidden',
                }}>

                    {/* Franja de color según tipo */}
                    <div style={{
                        position:     'absolute',
                        top:          0,
                        left:         0,
                        right:        0,
                        height:       '3px',
                        background:   `linear-gradient(90deg, ${accentHex}, transparent 80%)`,
                        borderRadius: '16px 16px 0 0',
                    }} />

                    {/* ── Icono + título ── */}
                    <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                        <div style={{
                            width:        '52px',
                            height:       '52px',
                            borderRadius: '50%',
                            background:   `${accentHex}18`,
                            border:       `2px solid ${accentHex}`,
                            display:      'flex',
                            alignItems:   'center',
                            justifyContent: 'center',
                            margin:       '0 auto 14px',
                            fontSize:     '24px',
                        }}>
                            ✓
                        </div>
                        <h2 style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '16px',
                            fontWeight:    700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color:         accentVar,
                            margin:        0,
                        }}>
                            Movimiento registrado con éxito
                        </h2>
                        <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   '11px',
                            color:      'var(--text-muted)',
                            margin:     '6px 0 0',
                            letterSpacing: '0.04em',
                        }}>
                            Transacción ACID completada · Albarán generado
                        </p>
                    </div>

                    {/* ── Resumen ── */}
                    <div style={{
                        background:    'var(--bg-elevated)',
                        border:        '1px solid var(--border-subtle)',
                        borderRadius:  '10px',
                        padding:       '14px 16px',
                        marginBottom:  '22px',
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           '10px',
                    }}>
                        {(
                            [
                                { label: 'Tipo',     value: TIPO_LABEL[data.tipoMovimiento], color: accentVar         },
                                { label: 'Producto', value: `${data.producto.sku} · ${data.producto.nombre}`,
                                                                                              color: 'var(--text-primary)' },
                                { label: 'Cantidad', value: `${data.cantidad} ud${data.cantidad !== 1 ? 's.' : '.'}`,
                                                                                              color: 'var(--text-primary)' },
                                { label: 'Albarán',  value: data.codigo,                    color: 'var(--accent-cyan)'  },
                            ] as const
                        ).map(row => (
                            <div key={row.label} style={{
                                display:        'flex',
                                justifyContent: 'space-between',
                                alignItems:     'baseline',
                                gap:            '12px',
                            }}>
                                <span style={{
                                    fontFamily:    'var(--font-display)',
                                    fontSize:      '10px',
                                    fontWeight:    700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color:         'var(--text-muted)',
                                    flexShrink:    0,
                                }}>
                                    {row.label}
                                </span>
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '12px',
                                    color:         row.color,
                                    textAlign:     'right',
                                    overflow:      'hidden',
                                    textOverflow:  'ellipsis',
                                    whiteSpace:    'nowrap',
                                }}>
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* ── Botones ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            onClick={() => window.print()}
                            className="btn btn-primary"
                            style={{
                                width:         '100%',
                                fontSize:      '12px',
                                letterSpacing: '0.12em',
                                padding:       '12px 20px',
                                gap:           '8px',
                            }}
                        >
                            🖨 VER / IMPRIMIR ALBARÁN
                        </button>
                        <button
                            onClick={onClose}
                            className="btn btn-ghost"
                            style={{
                                width:         '100%',
                                fontSize:      '11px',
                                letterSpacing: '0.10em',
                            }}
                        >
                            CERRAR
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
}
