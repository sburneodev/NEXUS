/**
 * pages/StockPage.tsx — Control de Stock v4 · Acción Contextual
 *
 * · Tabla a ancho completo (panel fijo eliminado)
 * · Columna "Acciones" con botones Entrada / Salida / Ajuste
 * · Drawer deslizante desde la derecha con precarga contextual
 * · Validación: Salida > stockActual → botón bloqueado + aviso
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal }           from 'react-dom';
import api                        from '../services/api';
import { productoService }        from '../services/productoService';
import { calculateAutoLimit }     from '../hooks/useTableFilters';
import type { Producto, TipoMovimiento } from '../types/models';
import { AlbaranModal }           from '../components/stock/AlbaranModal';
import type { AlbaranInfo }       from '../components/stock/AlbaranModal';

// ── Tipos locales ──────────────────────────────────────────────────────────────

interface EntidadOpcion { id: number; nombre: string; }
type StockEstado = 'OK' | 'BAJO' | 'CRITICO';

// ── Helpers de estado ──────────────────────────────────────────────────────────

function getEstado(p: Producto): StockEstado {
    if (p.tipoProducto === 'RETRO')         return 'OK';
    if (p.stockActual <= p.stockMinimo)     return 'CRITICO';
    if (p.stockActual <= p.stockMinimo * 2) return 'BAJO';
    return 'OK';
}

const ESTADO_COLOR: Record<StockEstado, string> = {
    OK:      'var(--accent-primary)',
    BAJO:    'var(--accent-gold)',
    CRITICO: 'var(--accent-danger)',
};

function getStockColor(p: Producto) {
    return p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : ESTADO_COLOR[getEstado(p)];
}

function getEstadoBadge(p: Producto): { text: string; color: string } {
    if (p.tipoProducto === 'RETRO') {
        return p.activo
            ? { text: '● OK',    color: 'var(--accent-primary)' }
            : { text: 'VENDIDO', color: 'var(--accent-danger)'  };
    }
    const e = getEstado(p);
    return {
        text:  e === 'OK' ? '● OK' : e === 'BAJO' ? '⚠ BAJO' : '⛔ CRÍTICO',
        color: ESTADO_COLOR[e],
    };
}

const TIPO_COLOR: Record<TipoMovimiento, string> = {
    ENTRADA: 'var(--accent-primary)',
    SALIDA:  'var(--accent-danger)',
    AJUSTE:  'var(--accent-gold)',
};

// ── Form ───────────────────────────────────────────────────────────────────────

interface MovimientoForm {
    tipoMovimiento: TipoMovimiento;
    cantidad:       string;
    precioUnitario: string;
    referencia:     string;
    notas:          string;
}

const EMPTY_FORM: MovimientoForm = {
    tipoMovimiento: 'ENTRADA',
    cantidad: '', precioUnitario: '', referencia: '', notas: '',
};

interface OpResult { ok: boolean; mensaje: string; stockNuevo?: number; }

// ── Estilos base ───────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.10em', textTransform: 'uppercase',
    color: 'var(--text-secondary)', display: 'block', marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', fontFamily: 'var(--font-mono)', fontSize: '14px',
    color: 'var(--text-primary)', background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)', borderRadius: '6px',
    padding: '9px 12px',
    /* outline: none bloquea el anillo violeta global (:focus-visible !important) */
    outline: 'none', outlineOffset: '0',
    caretColor: 'var(--accent-cyan)',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    boxSizing: 'border-box',
};

const onFI = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(56,189,248,0.12)';
};
const onBI = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-default)';
    e.currentTarget.style.boxShadow   = 'none';
};

// ═══════════════════════════════════════════════════════════════════════════════
// Selector predictivo genérico
// ═══════════════════════════════════════════════════════════════════════════════

interface SelectorProps {
    opciones:     EntidadOpcion[];
    selected:     EntidadOpcion | null;
    onSelect:     (v: EntidadOpcion | null) => void;
    placeholder?: string;
    accentColor?: string;
}

function SelectorPredictivo({
    opciones, selected, onSelect,
    placeholder = 'Buscar por ID o nombre…',
    accentColor = 'var(--accent-cyan)',
}: SelectorProps): JSX.Element {
    const [query, setQuery] = useState('');
    const [open,  setOpen]  = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => { if (!selected) setQuery(''); }, [selected]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return opciones;
        return opciones.filter(o =>
            String(o.id).includes(q) || o.nombre.toLowerCase().includes(q)
        );
    }, [opciones, query]);

    const displayValue   = selected ? `#${selected.id} — ${selected.nombre}` : query;
    const hasInvalidText = query.trim().length > 0 && !selected;

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <input
                type="text"
                placeholder={placeholder}
                value={displayValue}
                autoComplete="off"
                onChange={e => { onSelect(null); setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                style={{
                    ...inputStyle,
                    borderColor: hasInvalidText ? 'var(--accent-danger)' : open ? accentColor : 'var(--border-default)',
                    boxShadow: hasInvalidText
                        ? '0 0 0 3px rgba(248,113,113,0.14)'
                        : open ? `0 0 0 3px color-mix(in srgb, ${accentColor} 15%, transparent)` : 'none',
                }}
            />
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.40)',
                    maxHeight: '196px', overflowY: 'auto',
                }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-danger)', lineHeight: 1.6 }}>
                            Sin coincidencias. Comprueba el ID o nombre.
                        </div>
                    ) : filtered.map(o => (
                        <div key={o.id}
                            onMouseDown={e => { e.preventDefault(); onSelect(o); setQuery(''); setOpen(false); }}
                            style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', transition: 'background 100ms ease' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: accentColor, minWidth: '28px', letterSpacing: '0.04em' }}>#{o.id}</span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nombre}</span>
                        </div>
                    ))}
                </div>
            )}
            {hasInvalidText && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', margin: '4px 0 0', letterSpacing: '0.02em' }}>
                    Selecciona una opción válida de la lista.
                </p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Panel de resultado
// ═══════════════════════════════════════════════════════════════════════════════

function ResultPanel({ result }: { result: OpResult }): JSX.Element {
    const isOk  = result.ok;
    const color = isOk ? 'var(--accent-primary)' : 'var(--accent-danger)';
    const bg    = isOk ? 'rgba(59,130,246,0.08)' : 'rgba(248,113,113,0.08)';

    return (
        <div style={{ borderRadius: '8px', border: `1px solid ${color}`, background: bg, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: result.stockNuevo !== undefined ? `1px solid ${color}30` : 'none', background: `${color}12` }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color, lineHeight: 1 }}>
                    {isOk ? '✓' : '✕'}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color }}>
                    {isOk ? 'Operación completada' : 'Operación rechazada'}
                </span>
            </div>
            <div style={{ padding: '10px 14px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {result.mensaje}
                </p>
            </div>
            {isOk && result.stockNuevo !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: `1px solid ${color}25`, background: `${color}08` }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        Stock actualizado
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color, lineHeight: 1 }}>
                        {result.stockNuevo}
                    </span>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Drawer de movimiento (portal)
// ═══════════════════════════════════════════════════════════════════════════════

interface DrawerProps {
    open:               boolean;
    producto:           Producto | null;
    form:               MovimientoForm;
    isSaving:           boolean;
    result:             OpResult | null;
    clientes:           EntidadOpcion[];
    proveedores:        EntidadOpcion[];
    selectedCliente:    EntidadOpcion | null;
    selectedProveedor:  EntidadOpcion | null;
    onClose:            () => void;
    onSetField:         <K extends keyof MovimientoForm>(k: K, v: MovimientoForm[K]) => void;
    onSetCliente:       (v: EntidadOpcion | null) => void;
    onSetProveedor:     (v: EntidadOpcion | null) => void;
    onSubmit:           () => void;
}

function MovimientoDrawer({
    open, producto, form, isSaving, result,
    clientes, proveedores, selectedCliente, selectedProveedor,
    onClose, onSetField, onSetCliente, onSetProveedor, onSubmit,
}: DrawerProps): JSX.Element {
    const cantidadNum       = parseInt(form.cantidad, 10);
    const stockInsuficiente = form.tipoMovimiento === 'SALIDA'
        && !isNaN(cantidadNum) && cantidadNum > 0
        && producto !== null
        && cantidadNum > producto.stockActual;

    const canSubmit = !isSaving && !stockInsuficiente;

    const tipoLabel: Record<TipoMovimiento, string> = {
        ENTRADA: '↓ Entrada',
        SALIDA:  '↑ Salida',
        AJUSTE:  '⚙ Ajuste',
    };

    // Cerrar con Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    return createPortal(
        <>
            {/* ── Backdrop ── */}
            <div
                onClick={onClose}
                style={{
                    position:   'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.50)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                    opacity:    open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity 260ms ease',
                }}
            />

            {/* ── Panel deslizante ── */}
            <div
                className="drawer-panel"
                style={{
                    position:    'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
                    width:       'min(480px, 100vw)',
                    background:  'var(--bg-elevated)',
                    borderLeft:  '1px solid var(--border-default)',
                    boxShadow:   '-8px 0 40px rgba(0,0,0,0.50)',
                    display:     'flex',
                    flexDirection: 'column',
                    transform:   open ? 'translateX(0)' : 'translateX(100%)',
                    transition:  'transform 280ms cubic-bezier(0.23,1,0.32,1)',
                }}
            >
                {/* ── Header del drawer ── */}
                <div style={{
                    padding:      '0 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink:   0,
                    background:   'linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 100%)',
                }}>
                    {/* Barra superior con título y cierre */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '18px', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                fontFamily:    'var(--font-mono)', fontSize: '18px',
                                color:         producto ? TIPO_COLOR[form.tipoMovimiento] : 'var(--text-muted)',
                            }}>
                                {form.tipoMovimiento === 'ENTRADA' ? '↓'
                                    : form.tipoMovimiento === 'SALIDA' ? '↑' : '⚙'}
                            </span>
                            <span style={{
                                fontFamily:    'var(--font-display)', fontSize: '13px', fontWeight: 700,
                                letterSpacing: '0.14em', textTransform: 'uppercase',
                                color:         'var(--text-primary)',
                            }}>
                                Registrar {form.tipoMovimiento}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border:     '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color:      'var(--text-muted)',
                                cursor:     'pointer',
                                padding:    '4px 10px',
                                fontSize:   '14px',
                                lineHeight:  1,
                                transition: 'all 140ms ease',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                            }}
                        >✕</button>
                    </div>

                    {/* Contexto del producto */}
                    {producto && (() => {
                        const badge = getEstadoBadge(producto);
                        return (
                            <div style={{ paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                                {/* Fila: SKU + Nombre */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <span style={{
                                        fontFamily:    'var(--font-mono)', fontSize: '12px', fontWeight: 700,
                                        color:         'var(--accent-cyan)',
                                        background:    'rgba(56,189,248,0.08)',
                                        border:        '1px solid rgba(56,189,248,0.20)',
                                        borderRadius:  '4px', padding: '3px 9px',
                                        letterSpacing: '0.04em', flexShrink: 0,
                                    }}>
                                        {producto.sku}
                                    </span>
                                    <span style={{
                                        fontFamily:    'var(--font-body)', fontSize: '14px', fontWeight: 600,
                                        color:         'var(--text-primary)',
                                        overflow:      'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {producto.nombre}
                                    </span>
                                </div>

                                {/* Franja de métricas: stock actual · mínimo · estado */}
                                <div style={{
                                    display:       'flex',
                                    alignItems:    'center',
                                    gap:           '0',
                                    background:    'var(--bg-surface)',
                                    border:        '1px solid var(--border-subtle)',
                                    borderRadius:  '6px',
                                    overflow:      'hidden',
                                }}>
                                    {[
                                        { label: 'Stock actual', value: String(producto.stockActual), color: getStockColor(producto) },
                                        { label: 'Mínimo',       value: String(producto.stockMinimo), color: 'var(--text-secondary)' },
                                        { label: 'Estado',       value: badge.text,                   color: badge.color             },
                                    ].map((item, i) => (
                                        <div key={i} style={{
                                            flex:          1,
                                            padding:       '8px 12px',
                                            borderRight:   i < 2 ? '1px solid var(--border-subtle)' : 'none',
                                            textAlign:     'center',
                                        }}>
                                            <div style={{
                                                fontFamily:    'var(--font-display)', fontSize: '9px', fontWeight: 700,
                                                letterSpacing: '0.10em', textTransform: 'uppercase',
                                                color:         'var(--text-muted)', marginBottom: '3px',
                                            }}>
                                                {item.label}
                                            </div>
                                            <div style={{
                                                fontFamily:  'var(--font-mono)',
                                                fontSize:    i === 0 ? '18px' : '12px',
                                                fontWeight:  700,
                                                color:       item.color,
                                                lineHeight:  1,
                                                letterSpacing: '0.02em',
                                            }}>
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        );
                    })()}
                </div>

                {/* ── Cuerpo scrollable ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Selector de tipo */}
                    <div>
                        <label style={labelStyle}>Tipo de movimiento</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {(['ENTRADA', 'SALIDA', 'AJUSTE'] as TipoMovimiento[]).map(t => {
                                const active = form.tipoMovimiento === t;
                                return (
                                    <button key={t}
                                        onClick={() => { onSetField('tipoMovimiento', t); onSetCliente(null); onSetProveedor(null); }}
                                        style={{
                                            flex:          1,
                                            fontFamily:    'var(--font-display)',
                                            fontSize:      '10px',
                                            fontWeight:    700,
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            padding:       '6px 4px',
                                            /* Activo: tinte suave + borde coloreado (sin fondo sólido) */
                                            background: active
                                                ? `color-mix(in srgb, ${TIPO_COLOR[t]} 14%, transparent)`
                                                : 'transparent',
                                            color:         active ? TIPO_COLOR[t] : 'var(--text-muted)',
                                            border:        `1px solid ${active ? TIPO_COLOR[t] : 'var(--border-default)'}`,
                                            borderRadius:  '5px',
                                            cursor:        'pointer',
                                            transition:    'all 140ms ease',
                                            opacity:       active ? 1 : 0.7,
                                        }}
                                        onMouseEnter={e => {
                                            if (!active) {
                                                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                                                (e.currentTarget as HTMLButtonElement).style.color = TIPO_COLOR[t];
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = TIPO_COLOR[t];
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!active) {
                                                (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
                                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                                            }
                                        }}
                                    >
                                        {tipoLabel[t]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cantidad */}
                    <div>
                        <label style={labelStyle}>Cantidad *</label>
                        <input
                            type="number" min={1}
                            placeholder="Introduce la cantidad…"
                            value={form.cantidad}
                            onChange={e => onSetField('cantidad', e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: stockInsuficiente ? 'var(--accent-danger)' : 'var(--border-default)',
                                boxShadow:   stockInsuficiente ? '0 0 0 3px rgba(248,113,113,0.15)' : 'none',
                            }}
                            onFocus={stockInsuficiente ? undefined : onFI}
                            onBlur={onBI}
                        />
                        {/* Validación: stock insuficiente */}
                        {stockInsuficiente && (
                            <div style={{
                                display:      'flex', alignItems: 'center', gap: '7px',
                                marginTop:    '7px', padding: '8px 12px',
                                background:   'rgba(248,113,113,0.08)',
                                border:       '1px solid rgba(248,113,113,0.30)',
                                borderRadius: '6px',
                                fontFamily:   'var(--font-mono)', fontSize: '12px',
                                color:        'var(--accent-danger)', lineHeight: 1.5,
                            }}>
                                <span style={{ fontSize: '14px', flexShrink: 0 }}>⛔</span>
                                <span>
                                    <strong>Stock insuficiente</strong> — Disponible:{' '}
                                    <strong style={{ color: 'var(--text-primary)' }}>{producto?.stockActual}</strong>{' '}
                                    · Pedido: <strong style={{ color: 'var(--text-primary)' }}>{cantidadNum}</strong>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Precio unitario */}
                    {form.tipoMovimiento !== 'AJUSTE' && (
                        <div>
                            <label style={labelStyle}>
                                Precio unitario (€){' '}
                                <span style={{ fontWeight: 400, opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>— opcional</span>
                            </label>
                            <input type="number" min={0} step="0.01" placeholder="0.00"
                                value={form.precioUnitario}
                                onChange={e => onSetField('precioUnitario', e.target.value)}
                                style={inputStyle} onFocus={onFI} onBlur={onBI}
                            />
                        </div>
                    )}

                    {/* Selector cliente — SALIDA */}
                    {form.tipoMovimiento === 'SALIDA' && (
                        <div>
                            <label style={labelStyle}>
                                Cliente{' '}
                                <span style={{ fontWeight: 400, opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>— opcional</span>
                            </label>
                            <SelectorPredictivo
                                opciones={clientes} selected={selectedCliente} onSelect={onSetCliente}
                                placeholder="Buscar cliente por ID o nombre…"
                                accentColor="var(--accent-cyan)"
                            />
                        </div>
                    )}

                    {/* Selector proveedor — ENTRADA */}
                    {form.tipoMovimiento === 'ENTRADA' && (
                        <div>
                            <label style={labelStyle}>
                                Proveedor{' '}
                                <span style={{ fontWeight: 400, opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>— opcional</span>
                            </label>
                            <SelectorPredictivo
                                opciones={proveedores} selected={selectedProveedor} onSelect={onSetProveedor}
                                placeholder="Buscar proveedor por ID o razón social…"
                                accentColor="var(--accent-primary)"
                            />
                        </div>
                    )}

                    {/* Referencia */}
                    <div>
                        <label style={labelStyle}>
                            Referencia{' '}
                            <span style={{ fontWeight: 400, opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>— albarán, factura…</span>
                        </label>
                        <input type="text" placeholder="ej. ALB-2026-0042"
                            value={form.referencia}
                            onChange={e => onSetField('referencia', e.target.value)}
                            style={inputStyle} onFocus={onFI} onBlur={onBI}
                        />
                    </div>

                    {/* Notas */}
                    <div>
                        <label style={labelStyle}>
                            Notas{' '}
                            <span style={{ fontWeight: 400, opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>— opcional</span>
                        </label>
                        <textarea
                            placeholder="Información adicional del movimiento…"
                            rows={3}
                            value={form.notas}
                            onChange={e => onSetField('notas', e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical', minHeight: '72px', lineHeight: 1.6 }}
                            onFocus={onFI} onBlur={onBI}
                        />
                    </div>

                    {/* Resultado previo */}
                    {result && <ResultPanel result={result} />}
                </div>

                {/* ── Footer con botón principal ── */}
                <div style={{
                    padding:     '16px 20px',
                    borderTop:   '1px solid var(--border-subtle)',
                    flexShrink:  0,
                    background:  'var(--bg-elevated)',
                }}>
                    <button
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        style={{
                            width:         '100%',
                            fontFamily:    'var(--font-display)',
                            fontSize:      '11px',
                            fontWeight:    700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            padding:       '10px',          /* reducido de 13px */
                            borderRadius:  '6px',
                            border:        canSubmit
                                ? `1px solid ${
                                    form.tipoMovimiento === 'ENTRADA' ? 'var(--accent-primary)'
                                    : form.tipoMovimiento === 'SALIDA' ? '#dc2626'
                                    : 'var(--accent-gold)'}`
                                : '1px solid var(--border-subtle)',
                            cursor:        canSubmit ? 'pointer' : 'not-allowed',
                            /* fondo sólido suave — sin gradiente llamativo */
                            background:    canSubmit
                                ? form.tipoMovimiento === 'ENTRADA'
                                    ? 'rgba(59,130,246,0.18)'
                                    : form.tipoMovimiento === 'SALIDA'
                                        ? 'rgba(220,38,38,0.18)'
                                        : 'rgba(251,191,36,0.14)'
                                : 'var(--bg-surface)',
                            color: canSubmit
                                ? form.tipoMovimiento === 'ENTRADA' ? 'var(--accent-primary)'
                                : form.tipoMovimiento === 'SALIDA'  ? '#f87171'
                                : 'var(--accent-gold)'
                                : 'var(--text-muted)',
                            boxShadow:     'none',          /* sin glow externo */
                            transition:    'all 160ms ease',
                            opacity:       isSaving ? 0.6 : 1,
                        }}
                    >
                        {isSaving
                            ? '· Procesando…'
                            : stockInsuficiente
                                ? '⛔ Stock insuficiente'
                                : `✓ Confirmar ${form.tipoMovimiento}`}
                    </button>
                    <div style={{
                        marginTop:  '8px', textAlign: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        color:      'var(--text-muted)', letterSpacing: '0.04em',
                    }}>
                        Esc para cerrar
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════════════

export function StockPage(): JSX.Element {
    const [productos,         setProductos]        = useState<Producto[]>([]);
    const [clientes,          setClientes]          = useState<EntidadOpcion[]>([]);
    const [proveedores,       setProveedores]       = useState<EntidadOpcion[]>([]);
    const [loadState,         setLoadState]         = useState<'loading'|'ok'|'error'>('loading');
    const [activeFilter,      setActiveFilter]      = useState<'TODOS'|'ESTANDAR'|'RETRO'|'OK'|'BAJO'|'CRITICO'>('TODOS');
    const [searchTerm,        setSearchTerm]        = useState('');
    const [currentPage,       setCurrentPage]       = useState(0);
    const [rowsPerPage,       setRowsPerPage]       = useState<number>(() => calculateAutoLimit());

    // Drawer
    const [drawerOpen,        setDrawerOpen]        = useState(false);
    const [drawerProducto,    setDrawerProducto]    = useState<Producto | null>(null);
    const [form,              setForm]              = useState<MovimientoForm>(EMPTY_FORM);
    const [isSaving,          setIsSaving]          = useState(false);
    const [result,            setResult]            = useState<OpResult | null>(null);
    const [selectedCliente,   setSelectedCliente]   = useState<EntidadOpcion | null>(null);
    const [selectedProveedor, setSelectedProveedor] = useState<EntidadOpcion | null>(null);

    // Albarán
    const [albaranOpen, setAlbaranOpen] = useState(false);
    const [albaranInfo, setAlbaranInfo] = useState<AlbaranInfo | null>(null);

    // ── Carga inicial ──────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function cargarDatos() {
            setLoadState('loading');
            try {
                const primera = await productoService.listar(0, 100);
                if (cancelled) return;

                let todos = [...primera.content];
                if (primera.totalElements > 100) {
                    const paginas = Math.ceil(primera.totalElements / 100);
                    const resto   = await Promise.all(
                        Array.from({ length: paginas - 1 }, (_, i) => productoService.listar(i + 1, 100))
                    );
                    if (cancelled) return;
                    resto.forEach(p => { todos = [...todos, ...p.content]; });
                }

                const clientesResp    = await api.get<{ content: { id: number; nombre: string }[] }>('/clientes?size=200&sort=nombre');
                const proveedoresResp = await api.get<{ id: number; razonSocial: string }[]>('/proveedores');
                if (cancelled) return;

                setProductos(todos);
                setClientes((clientesResp.data.content ?? []).map(c => ({ id: c.id, nombre: c.nombre })));
                setProveedores((proveedoresResp.data ?? []).map(p => ({ id: p.id, nombre: p.razonSocial })));
                setLoadState('ok');
            } catch {
                if (!cancelled) setLoadState('error');
            }
        }

        cargarDatos();
        return () => { cancelled = true; };
    }, []);

    // ── Filtrado ───────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return productos.filter(p => {
            const matchType =
                activeFilter === 'TODOS'    ? true :
                activeFilter === 'ESTANDAR' ? p.tipoProducto === 'ESTANDAR' :
                activeFilter === 'RETRO'    ? p.tipoProducto === 'RETRO' :
                getEstado(p) === activeFilter;
            const matchSearch = !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
            return matchType && matchSearch;
        });
    }, [productos, activeFilter, searchTerm]);

    // ── Paginación client-side ─────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const safePage   = Math.min(currentPage, totalPages - 1);
    const paginated  = useMemo(
        () => filtered.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage),
        [filtered, safePage, rowsPerPage],
    );

    // ── Abrir drawer con contexto preestablecido ───────────────────────────────
    const openDrawer = useCallback((p: Producto, tipo: TipoMovimiento) => {
        setDrawerProducto(p);
        setForm({ ...EMPTY_FORM, tipoMovimiento: tipo });
        setResult(null);
        setSelectedCliente(null);
        setSelectedProveedor(null);
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        // Delay reset so animation can finish
        setTimeout(() => { setDrawerProducto(null); setResult(null); }, 320);
    }, []);

    // ── Set field ─────────────────────────────────────────────────────────────
    function setField<K extends keyof MovimientoForm>(k: K, v: MovimientoForm[K]) {
        setForm(prev => ({ ...prev, [k]: v }));
        setResult(null);
    }

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!drawerProducto) return;

        const cantidadNum = parseInt(form.cantidad, 10);
        if (!cantidadNum || cantidadNum < 1) {
            setResult({ ok: false, mensaje: 'La cantidad debe ser un número entero positivo.' });
            return;
        }

        setIsSaving(true);
        setResult(null);

        const body: Record<string, unknown> = {
            idProducto:     drawerProducto.id,
            tipoMovimiento: form.tipoMovimiento,
            cantidad:       cantidadNum,
        };

        const precio = parseFloat(form.precioUnitario);
        if (!isNaN(precio) && precio > 0)  body.precioUnitario = precio;
        if (form.referencia.trim())         body.referencia     = form.referencia.trim();
        if (form.notas.trim())              body.notas          = form.notas.trim();
        if (form.tipoMovimiento === 'SALIDA'  && selectedCliente)   body.idCliente   = selectedCliente.id;
        if (form.tipoMovimiento === 'ENTRADA' && selectedProveedor) body.idProveedor = selectedProveedor.id;

        try {
            interface MovResponse { resultado: string; stockNuevo: number; albaranCodigo?: string; albaranFecha?: string; }
            const { data } = await api.post<MovResponse>('/stock/movimiento', body);

            // Actualizar stock en lista local
            setProductos(prev =>
                prev.map(p => p.id === drawerProducto.id ? { ...p, stockActual: data.stockNuevo } : p)
            );
            setDrawerProducto(prev =>
                prev?.id === drawerProducto.id ? { ...prev, stockActual: data.stockNuevo } : prev
            );

            if (form.tipoMovimiento !== 'AJUSTE' && data.albaranCodigo) {
                setAlbaranInfo({
                    codigo: data.albaranCodigo,
                    fecha:  data.albaranFecha ?? new Date().toISOString(),
                    tipoMovimiento: form.tipoMovimiento,
                    producto:       drawerProducto,
                    cantidad:       cantidadNum,
                    precioUnitario: !isNaN(precio) && precio > 0 ? precio : null,
                    referencia:     form.referencia.trim(),
                    notas:          form.notas.trim(),
                    stockNuevo:     data.stockNuevo,
                });
                setAlbaranOpen(true);
            }

            setResult({ ok: true, mensaje: data.resultado, stockNuevo: data.stockNuevo });
            setSelectedCliente(null);
            setSelectedProveedor(null);
            setForm(EMPTY_FORM);

        } catch (err: unknown) {
            let msg = 'Error de red o servidor no disponible.';
            if (err && typeof err === 'object' && 'response' in err) {
                const ae = err as { response?: { status?: number; data?: { message?: string } } };
                const st = ae.response?.status;
                const sm = ae.response?.data?.message ?? '';
                if      (st === 409) msg = sm || 'Stock insuficiente o artículo no disponible.';
                else if (st === 422) msg = sm || 'ID no existente o inactivo.';
                else if (st === 403) msg = 'Sin permiso. Roles: CAJERO · GESTOR_INVENTARIO · ADMIN';
                else if (st === 401) msg = 'Sesión expirada. Redirigiendo al login…';
                else                 msg = sm || `Error ${st ?? 'desconocido'}.`;
            }
            setResult({ ok: false, mensaje: msg });
        } finally {
            setIsSaving(false);
        }
    }, [drawerProducto, form, selectedCliente, selectedProveedor]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* ── Cabecera ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,2vw,22px)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        Control de Stock
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
                        Haz clic en Entrada, Salida o Ajuste para operar sobre un producto
                    </p>
                </div>
            </div>

            {/* ── Buscador + chips en una sola fila ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                {/* Buscador — crece para ocupar el espacio disponible */}
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>⌕</span>
                    <input
                        type="text"
                        placeholder="Nombre o SKU…"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                        style={{ ...inputStyle, paddingLeft: '30px', fontSize: '13px' }}
                        onFocus={onFI} onBlur={onBI}
                    />
                </div>

                {/* Separador visual */}
                <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)', flexShrink: 0 }} />

                {/* Chips de tipo */}
                {(['TODOS','ESTANDAR','RETRO'] as const).map(t => {
                    const active = activeFilter === t;
                    const color  = t === 'RETRO' ? 'var(--accent-gold)' : 'var(--accent-primary)';
                    return (
                        <button key={t}
                            onClick={() => { setActiveFilter(t); setCurrentPage(0); }}
                            style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', background: active ? color : 'transparent', color: active ? 'var(--text-inverse)' : 'var(--text-muted)', border: `1px solid ${active ? color : 'var(--border-default)'}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease', whiteSpace: 'nowrap' }}
                        >{t}</button>
                    );
                })}

                {/* Separador */}
                <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)', flexShrink: 0 }} />

                {/* Chips de estado */}
                {(['OK','BAJO','CRITICO'] as const).map(e => {
                    const active = activeFilter === e;
                    const color  = ESTADO_COLOR[e];
                    return (
                        <button key={e}
                            onClick={() => { setActiveFilter(active ? 'TODOS' : e); setCurrentPage(0); }}
                            style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', background: active ? color : 'transparent', color: active ? 'var(--text-inverse)' : color, border: `1px solid ${active ? color : 'var(--border-default)'}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease', whiteSpace: 'nowrap' }}
                        >{e}</button>
                    );
                })}

            </div>

            {/* ── Contador + Paginación (misma posición que el resto de la app) ── */}
            {loadState === 'ok' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>

                    {/* Contador */}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        {filtered.length === 0
                            ? 'Sin productos'
                            : <>Mostrando{' '}
                                <strong style={{ color: 'var(--text-secondary)' }}>
                                    {safePage * rowsPerPage + 1}–{Math.min((safePage + 1) * rowsPerPage, filtered.length)}
                                </strong>
                                {' '}de{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong>
                                {' '}producto{filtered.length !== 1 ? 's' : ''}
                            </>
                        }
                    </span>

                    {/* Botones de página */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <button disabled={safePage === 0} onClick={() => setCurrentPage(p => Math.max(0, p - 1))} style={pagBtn(safePage === 0)}>◀</button>

                            {Array.from({ length: totalPages }, (_, i) => i).map(i => {
                                const show = totalPages <= 6 || i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1;
                                if (!show) {
                                    if (i === 1 || i === totalPages - 2)
                                        return <span key={i} style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '0 2px' }}>…</span>;
                                    return null;
                                }
                                const active = i === safePage;
                                return (
                                    <button key={i} onClick={() => setCurrentPage(i)}
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: active ? 700 : 400, padding: '0 6px', height: '28px', minWidth: '28px', background: active ? 'var(--accent-primary)' : 'transparent', color: active ? 'var(--text-inverse)' : 'var(--text-secondary)', border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-default)'}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 120ms ease' }}>
                                        {i + 1}
                                    </button>
                                );
                            })}

                            <button disabled={safePage >= totalPages - 1} onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} style={pagBtn(safePage >= totalPages - 1)}>▶</button>

                            <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 2px' }} />

                            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(0); }}
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', outline: 'none', height: '28px' }}>
                                {[10, 20, 50].map(n => <option key={n} value={n}>{n} / pág.</option>)}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tabla — ancho completo ── */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                {loadState === 'loading' ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.06em' }}>
                        Cargando productos…
                    </div>
                ) : loadState === 'error' ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        Error al cargar productos. Comprueba la conexión con el backend.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                                    {['SKU', 'Producto', 'Tipo', 'Stock Act.', 'Mín.', 'Estado', 'Acciones'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 14px', textAlign: 'left',
                                            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                                            letterSpacing: '0.10em', textTransform: 'uppercase',
                                            color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                                            SIN PRODUCTOS EN ESTE FILTRO
                                        </td>
                                    </tr>
                                )}
                                {paginated.map(p => {
                                    const badge = getEstadoBadge(p);
                                    return (
                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            {/* SKU */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
                                                    {p.sku}
                                                </span>
                                            </td>
                                            {/* Nombre */}
                                            <td style={{ padding: '12px 14px', maxWidth: '260px' }}>
                                                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.nombre}
                                                </div>
                                            </td>
                                            {/* Tipo */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--text-secondary)', border: `1px solid ${p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--border-default)'}`, borderRadius: '3px', padding: '2px 7px', letterSpacing: '0.04em' }}>
                                                    {p.tipoProducto}
                                                </span>
                                            </td>
                                            {/* Stock */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: getStockColor(p), letterSpacing: '-0.01em' }}>
                                                    {p.stockActual}
                                                </span>
                                            </td>
                                            {/* Mínimo */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-muted)' }}>
                                                    {p.stockMinimo}
                                                </span>
                                            </td>
                                            {/* Estado */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: badge.color, background: `${badge.color}18`, border: `1px solid ${badge.color}`, borderRadius: '3px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                                                    {badge.text}
                                                </span>
                                            </td>
                                            {/* Acciones */}
                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                <ActionBtn
                                                    label="↓ Entrada"
                                                    color="var(--accent-primary)"
                                                    onClick={() => openDrawer(p, 'ENTRADA')}
                                                    title="Registrar entrada de stock"
                                                />
                                                <ActionBtn
                                                    label="↑ Salida"
                                                    color="var(--accent-danger)"
                                                    onClick={() => openDrawer(p, 'SALIDA')}
                                                    title="Registrar salida de stock"
                                                />
                                                <ActionBtn
                                                    label="⚙ Ajuste"
                                                    color="var(--accent-gold)"
                                                    onClick={() => openDrawer(p, 'AJUSTE')}
                                                    title="Ajustar stock manualmente"
                                                    last
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>

        {/* ── Drawer contextual ── */}
        <MovimientoDrawer
            open={drawerOpen}
            producto={drawerProducto}
            form={form}
            isSaving={isSaving}
            result={result}
            clientes={clientes}
            proveedores={proveedores}
            selectedCliente={selectedCliente}
            selectedProveedor={selectedProveedor}
            onClose={closeDrawer}
            onSetField={setField}
            onSetCliente={setSelectedCliente}
            onSetProveedor={setSelectedProveedor}
            onSubmit={handleSubmit}
        />

        {/* ── Modal albarán ── */}
        <AlbaranModal isOpen={albaranOpen} onClose={() => setAlbaranOpen(false)} data={albaranInfo} />
        </>
    );
}

// ── Botón de acción de tabla ───────────────────────────────────────────────────

function ActionBtn({ label, color, onClick, title, last = false }: {
    label:   string;
    color:   string;
    onClick: () => void;
    title?:  string;
    last?:   boolean;
}): JSX.Element {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                fontFamily:    'var(--font-display)',
                fontSize:      '11px',
                fontWeight:    700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding:       '5px 10px',
                background:    'transparent',
                color,
                border:        `1px solid ${color}`,
                borderRadius:  '4px',
                cursor:        'pointer',
                marginRight:   last ? 0 : '5px',
                opacity:       0.75,
                transition:    'opacity 120ms ease, background 120ms ease',
                whiteSpace:    'nowrap',
            }}
            onMouseEnter={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.opacity    = '1';
                btn.style.background = `${color}18`;
            }}
            onMouseLeave={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.opacity    = '0.75';
                btn.style.background = 'transparent';
            }}
        >
            {label}
        </button>
    );
}

// ── Helper paginación ─────────────────────────────────────────────────────────

function pagBtn(disabled: boolean): React.CSSProperties {
    return {
        fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.08em', padding: '5px 10px', background: 'transparent',
        color:  disabled ? 'var(--border-default)' : 'var(--text-muted)',
        border: `1px solid ${disabled ? 'var(--border-subtle)' : 'var(--border-default)'}`,
        borderRadius: '4px',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 120ms ease',
    };
}
