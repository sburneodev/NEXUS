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
    body, html    { background: white !important; }
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
    ENTRADA: '#3B82F6',
    SALIDA:  '#F87171',
    AJUSTE:  '#FBBF24',
};

const TIPO_COLOR_VAR: Record<TipoMovimiento, string> = {
    ENTRADA: 'var(--accent-primary)',
    SALIDA:  'var(--accent-danger)',
    AJUSTE:  'var(--accent-gold)',
};

// ── Paleta corporativa NEXUS (inline: renderizado fuera del contexto CSS de la app)
// Alineada con NEXUS ERP v3 Design System — azul profundo para documentos impresos ──

const C = {
    navy:    '#0C2A54',   /* azul profundo NEXUS */
    navyMid: '#1A4080',   /* azul medio */
    accent:  '#1D4ED8',   /* azul acento NEXUS */
    line:    '#CBD5E1',   /* slate-300 */
    bgBlock: '#F1F5F9',   /* slate-100 */
    text:    '#111827',   /* near-black */
    muted:   '#4B5563',   /* gray-600 */
    faint:   '#E2E8F0',   /* slate-200 */
    white:   '#ffffff',
    font:    "'Inter','Helvetica Neue',Arial,sans-serif",
    mono:    "'JetBrains Mono','Courier New',Courier,monospace",
} as const;

// ── Documento imprimible ───────────────────────────────────────────────────────
// Renderizado en <body> via portal. Oculto en pantalla, visible al imprimir.

function AlbaranDocument({ d }: { d: AlbaranInfo }): JSX.Element {
    const tipoColorHex = TIPO_COLOR_HEX[d.tipoMovimiento];
    const total        = d.precioUnitario != null
        ? fmtEur(d.precioUnitario * d.cantidad)
        : '—';

    // Etiqueta de bloque de datos
    const blockLabel: CSSProperties = {
        fontFamily:    C.font,
        fontSize:      '8.5px',
        fontWeight:    700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color:         C.navyMid,
        marginBottom:  '5px',
        paddingBottom: '4px',
        borderBottom:  `1px solid ${C.line}`,
        display:       'block',
    };

    // Fila label + valor
    const rowStyle: CSSProperties = {
        display:       'flex',
        gap:           '8px',
        marginBottom:  '6px',
        fontSize:      '10.5px',
        fontFamily:    C.font,
    };

    return (
        <div id="albaran-root" style={{
            background: C.white,
            color:      C.text,
            fontFamily: C.font,
            fontSize:   '11px',
            lineHeight: 1.55,
            padding:    '20px 24px',
            boxSizing:  'border-box',
        }}>

            {/* ── CABECERA ─────────────────────────────────────────────── */}
            <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'flex-start',
                paddingBottom:  '14px',
                borderBottom:   `3px solid ${C.navy}`,   /* navy NEXUS */
                marginBottom:   '18px',
            }}>
                {/* Izquierda: isotipo + marca */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/nexus-mark.svg" alt="" aria-hidden="true"
                         style={{ height: '44px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                    <div>
                        <div style={{
                            fontSize:      '20px',
                            fontWeight:    800,
                            letterSpacing: '0.06em',
                            color:         C.navy,
                            textTransform: 'uppercase',
                            lineHeight:    1,
                            fontFamily:    C.font,
                        }}>
                            NEXUS
                        </div>
                        <div style={{
                            fontSize:      '9px',
                            color:         C.muted,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            fontWeight:    600,
                            fontFamily:    C.font,
                            marginTop:     '2px',
                        }}>
                            ERP · LEVELUP ARCADE
                        </div>
                    </div>
                </div>

                {/* Derecha: tipo de documento + código */}
                <div style={{ textAlign: 'right', fontFamily: C.font }}>
                    <div style={{
                        fontSize:      '11px',
                        fontWeight:    700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:         C.muted,
                        marginBottom:  '4px',
                    }}>
                        Albarán de Movimiento
                    </div>
                    <div style={{
                        fontFamily:    C.mono,
                        fontSize:      '15px',
                        fontWeight:    700,
                        color:         C.navy,
                        letterSpacing: '0.06em',
                    }}>
                        {d.codigo}
                    </div>
                </div>
            </div>

            {/* ── TÍTULO DEL DOCUMENTO ─────────────────────────────────── */}
            <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginBottom:   '20px',
            }}>
                <span style={{
                    fontFamily:    C.font,
                    fontSize:      '18px',
                    fontWeight:    800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:         C.navy,
                    borderLeft:    `4px solid ${C.accent}`,
                    paddingLeft:   '10px',
                    lineHeight:    1,
                }}>
                    Albarán de Movimiento
                </span>
                <span style={{
                    fontFamily:    C.font,
                    fontSize:      '10px',
                    fontWeight:    700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding:       '4px 12px',
                    borderRadius:  '3px',
                    border:        `1.5px solid ${tipoColorHex}`,
                    color:         tipoColorHex,
                    background:    `${tipoColorHex}18`,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust:       'exact',
                }}>
                    {d.tipoMovimiento === 'ENTRADA' ? '▲' : d.tipoMovimiento === 'SALIDA' ? '▼' : '◈'} {TIPO_LABEL[d.tipoMovimiento].toUpperCase()}
                </span>
            </div>

            {/* ── BLOQUE DE DATOS ──────────────────────────────────────── */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 '14px',
                marginBottom:        '22px',
            }}>
                {/* Datos del movimiento */}
                <div style={{
                    background:   C.bgBlock,
                    border:       `1px solid ${C.line}`,
                    borderRadius: '4px',
                    padding:      '14px 16px',
                }}>
                    <span style={blockLabel}>Datos del movimiento</span>
                    <div style={rowStyle}>
                        <span style={{ minWidth: '80px', fontWeight: 600, color: C.muted, flexShrink: 0 }}>Fecha</span>
                        <span style={{ color: C.text, fontFamily: C.mono, fontSize: '10px' }}>{fmtFecha(d.fecha)}</span>
                    </div>
                    {d.referencia && (
                        <div style={rowStyle}>
                            <span style={{ minWidth: '80px', fontWeight: 600, color: C.muted, flexShrink: 0 }}>Referencia</span>
                            <span style={{ color: C.navy, fontWeight: 700 }}>{d.referencia}</span>
                        </div>
                    )}
                    <div style={rowStyle}>
                        <span style={{ minWidth: '80px', fontWeight: 600, color: C.muted, flexShrink: 0 }}>Albarán</span>
                        <span style={{ color: C.navy, fontWeight: 700, fontFamily: C.mono, fontSize: '10px' }}>{d.codigo}</span>
                    </div>
                </div>

                {/* Resultado del movimiento */}
                <div style={{
                    background:   C.bgBlock,
                    border:       `1px solid ${C.line}`,
                    borderRadius: '4px',
                    padding:      '14px 16px',
                }}>
                    <span style={blockLabel}>Resultado</span>
                    <div style={rowStyle}>
                        <span style={{ minWidth: '80px', fontWeight: 600, color: C.muted, flexShrink: 0 }}>Operación</span>
                        <span style={{ fontWeight: 700, color: tipoColorHex, letterSpacing: '0.04em',
                                       WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as CSSProperties}>
                            {TIPO_LABEL[d.tipoMovimiento].toUpperCase()}
                        </span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{ minWidth: '80px', fontWeight: 600, color: C.muted, flexShrink: 0 }}>Stock final</span>
                        <span style={{ color: C.navy, fontWeight: 700, fontSize: '11.5px' }}>{d.stockNuevo} uds.</span>
                    </div>
                    {d.notas && (
                        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
                            <span style={{ minWidth: '80px', fontWeight: 600, color: C.muted, flexShrink: 0 }}>Notas</span>
                            <span style={{ color: C.text, fontSize: '10px', fontStyle: 'italic' }}>
                                {d.notas.length > 80 ? `${d.notas.slice(0, 80)}…` : d.notas}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── TABLA DE PRODUCTO ────────────────────────────────────── */}
            <div style={{
                marginBottom: '22px',
                border:       `1px solid ${C.line}`,
                borderRadius: '4px',
                overflow:     'hidden',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                    <thead>
                        <tr style={{
                            background: C.navy,
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust:       'exact',
                        } as CSSProperties}>
                            {['SKU', 'Descripción del Producto', 'Tipo', 'Uds.', 'P. Unit.', 'Total'].map(h => (
                                <th key={h} style={{
                                    padding:       '7px 10px',
                                    textAlign:     'left',
                                    fontSize:      '9px',
                                    fontWeight:    700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color:         C.white,
                                    fontFamily:    C.font,
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '9px 10px', fontFamily: C.mono, fontWeight: 600, color: C.navyMid, fontSize: '10px', letterSpacing: '0.04em' }}>
                                {d.producto.sku}
                            </td>
                            <td style={{ padding: '9px 10px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 600, color: C.text, fontFamily: C.font }}>{d.producto.nombre}</div>
                                {d.producto.descripcion && (
                                    <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px', fontFamily: C.font, fontStyle: 'italic' }}>
                                        {d.producto.descripcion.length > 90
                                            ? `${d.producto.descripcion.slice(0, 90)}…`
                                            : d.producto.descripcion}
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '9px 10px', color: C.muted, fontFamily: C.font, fontSize: '10px' }}>
                                {d.producto.tipoProducto}
                            </td>
                            <td style={{ padding: '9px 10px', fontFamily: C.mono, fontWeight: 700, textAlign: 'center', color: C.navy, fontSize: '12px' }}>
                                {d.cantidad}
                            </td>
                            <td style={{ padding: '9px 10px', fontFamily: C.mono, color: C.text }}>
                                {d.precioUnitario != null ? fmtEur(d.precioUnitario) : '—'}
                            </td>
                            <td style={{ padding: '9px 10px', fontFamily: C.mono, fontWeight: 700, color: C.navy }}>
                                {total}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── CÓDIGO DE BARRAS ─────────────────────────────────────── */}
            <div style={{
                borderTop:     `1.5px solid ${C.line}`,
                paddingTop:    '20px',
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '8px',
                marginBottom:  '20px',
            }}>
                <Code39Barcode value={d.codigo} height={52} narrowWidth={1.8} showText={false} />
                <div style={{ fontFamily: C.mono, fontSize: '11px', letterSpacing: '0.14em', color: C.navy }}>
                    {d.codigo}
                </div>
                <div style={{ fontFamily: C.font, fontSize: '8px', color: C.muted, letterSpacing: '0.06em' }}>
                    Código Code 39 — Generado automáticamente por NEXUS ERP
                </div>
            </div>

            {/* ── PIE DE PÁGINA ────────────────────────────────────────── */}
            <div style={{
                borderTop:      `1px dashed ${C.line}`,
                paddingTop:     '8px',
                display:        'flex',
                justifyContent: 'space-between',
                fontFamily:     C.font,
                fontSize:       '8.5px',
                color:          C.muted,
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