/**
 * components/stock/MovimientoDrawer.tsx — Drawer reutilizable de movimiento de stock
 *
 * · Gestiona su propio estado de formulario, clientes/proveedores y albarán
 * · Exporta helpers de estado/color usados por tablas de stock
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal }    from 'react-dom';
import api                 from '../../services/api';
import type { Producto, TipoMovimiento } from '../../types/models';
import { AlbaranModal }    from './AlbaranModal';
import type { AlbaranInfo } from './AlbaranModal';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type StockEstado = 'OK' | 'BAJO' | 'CRITICO';

export const ESTADO_COLOR: Record<StockEstado, string> = {
    OK:      'var(--accent-primary)',
    BAJO:    'var(--accent-gold)',
    CRITICO: 'var(--accent-danger)',
};

export const TIPO_COLOR: Record<TipoMovimiento, string> = {
    ENTRADA: 'var(--accent-primary)',
    SALIDA:  'var(--accent-danger)',
    AJUSTE:  'var(--accent-gold)',
};

export function getEstado(p: Producto): StockEstado {
    if (p.tipoProducto === 'RETRO')         return 'OK';
    if (p.stockActual <= p.stockMinimo)     return 'CRITICO';
    if (p.stockActual <= p.stockMinimo * 2) return 'BAJO';
    return 'OK';
}

export function getStockColor(p: Producto): string {
    if (p.tipoProducto === 'RETRO') {
        // Retro vendido (stock 0) → rojo; disponible → dorado
        return p.stockActual === 0 ? 'var(--accent-danger)' : 'var(--accent-gold)';
    }
    return ESTADO_COLOR[getEstado(p)];
}

export function getEstadoBadge(p: Producto): { text: string; color: string } {
    if (p.tipoProducto === 'RETRO') {
        // Usamos stockActual como fuente de verdad: retro con stock 0 = VENDIDO,
        // independientemente del flag activo (que puede no actualizarse en tiempo real).
        return p.stockActual === 0
            ? { text: 'VENDIDO', color: 'var(--accent-danger)'  }
            : { text: '● OK',    color: 'var(--accent-primary)' };
    }
    const e = getEstado(p);
    return {
        text:  e === 'OK' ? '● OK' : e === 'BAJO' ? '⚠ BAJO' : '⛔ CRÍTICO',
        color: ESTADO_COLOR[e],
    };
}

// ── Props del componente ──────────────────────────────────────────────────────

export interface MovimientoDrawerProps {
    open:          boolean;
    producto:      Producto | null;
    initialTipo?:  TipoMovimiento;
    onClose:       () => void;
    onSaved:       (productoId: number, stockNuevo: number) => void;
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface EntidadOpcion { id: number; nombre: string; }

interface MovimientoForm {
    tipoMovimiento: TipoMovimiento;
    cantidad:       string;
    precioUnitario: string;
    referencia:     string;
    notas:          string;
}

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

// ── SelectorPredictivo (privado) ──────────────────────────────────────────────

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

// ── ResultPanel (privado) ─────────────────────────────────────────────────────

function ResultPanel({
    result,
    onVerAlbaran,
}: {
    result:        OpResult;
    onVerAlbaran?: () => void;
}): JSX.Element {
    const isOk  = result.ok;
    const color = isOk ? 'var(--accent-primary)' : 'var(--accent-danger)';
    const bg    = isOk ? 'rgba(59,130,246,0.08)' : 'rgba(248,113,113,0.08)';

    return (
        <div style={{ borderRadius: '8px', border: `1px solid ${color}`, background: bg, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: `1px solid ${color}30`, background: `${color}12` }}>
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
            {/* Botón opcional para ver/imprimir el albarán — solo si hay uno */}
            {isOk && onVerAlbaran && (
                <div style={{ padding: '8px 14px', borderTop: `1px solid ${color}20` }}>
                    <button
                        type="button"
                        onClick={onVerAlbaran}
                        style={{
                            width:         '100%',
                            fontFamily:    'var(--font-display)',
                            fontSize:      '10px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            padding:       '7px 12px',
                            borderRadius:  '5px',
                            border:        '1px solid rgba(59,130,246,0.35)',
                            background:    'transparent',
                            color:         'var(--accent-cyan)',
                            cursor:        'pointer',
                            transition:    'background 140ms ease, border-color 140ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.55)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.35)'; }}
                    >
                        ↗ Ver / Imprimir Albarán
                    </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MovimientoDrawer — componente exportado
// ═══════════════════════════════════════════════════════════════════════════════

export function MovimientoDrawer({
    open, producto, initialTipo = 'ENTRADA', onClose, onSaved,
}: MovimientoDrawerProps): JSX.Element {

    const makeEmptyForm = useCallback((tipo: TipoMovimiento): MovimientoForm => ({
        tipoMovimiento: tipo,
        cantidad: '', precioUnitario: '', referencia: '', notas: '',
    }), []);

    // ── Estado interno ────────────────────────────────────────────────────────
    const [form,              setForm]              = useState<MovimientoForm>(() => makeEmptyForm(initialTipo));
    const [isSaving,          setIsSaving]          = useState(false);
    const [result,            setResult]            = useState<OpResult | null>(null);
    const [clientes,          setClientes]          = useState<EntidadOpcion[]>([]);
    const [proveedores,       setProveedores]       = useState<EntidadOpcion[]>([]);
    const [selectedCliente,   setSelectedCliente]   = useState<EntidadOpcion | null>(null);
    const [selectedProveedor, setSelectedProveedor] = useState<EntidadOpcion | null>(null);
    const [albaranOpen,       setAlbaranOpen]       = useState(false);
    const [albaranInfo,       setAlbaranInfo]       = useState<AlbaranInfo | null>(null);
    // Flag explícito: evita race condition entre setAlbaranInfo y setResult en React 18.
    // Se fija a true en el mismo batch que setAlbaranInfo, garantizando que el botón
    // aparece siempre que hay albarán disponible, sin depender del orden de renders.
    const [hasAlbaran,        setHasAlbaran]        = useState(false);
    // Ref al contenedor scrollable y al panel de resultado — para scroll automático
    const scrollBodyRef = useRef<HTMLDivElement>(null);
    const resultRef     = useRef<HTMLDivElement>(null);

    // ── Cargar clientes y proveedores una vez al montar ───────────────────────
    useEffect(() => {
        let cancelled = false;
        api.get<{ content: { id: number; nombre: string }[] }>('/clientes?size=200&sort=nombre')
            .then(r => { if (!cancelled) setClientes((r.data.content ?? []).map(c => ({ id: c.id, nombre: c.nombre }))); })
            .catch(() => {});
        api.get<{ id: number; razonSocial: string }[]>('/proveedores')
            .then(r => { if (!cancelled) setProveedores((r.data ?? []).map(p => ({ id: p.id, nombre: p.razonSocial }))); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    // ── Resetear form cada vez que el drawer se abre ──────────────────────────
    useEffect(() => {
        if (open) {
            // Si es RETRO con stock ≥ 1 y se abre con ENTRADA, cambiamos a SALIDA
            // automáticamente — no tiene sentido hacer entrada de una pieza en stock
            const esRetroConStock = producto?.tipoProducto === 'RETRO'
                && (producto?.stockActual ?? 0) >= 1;
            const tipoEfectivo: TipoMovimiento = esRetroConStock && initialTipo === 'ENTRADA'
                ? 'SALIDA'
                : initialTipo;
            const formInicial = makeEmptyForm(tipoEfectivo);
            // Retro: la cantidad siempre es 1, se auto-rellena y se oculta el campo
            if (producto?.tipoProducto === 'RETRO') formInicial.cantidad = '1';
            setForm(formInicial);
            setResult(null);
            setSelectedCliente(null);
            setSelectedProveedor(null);
            setAlbaranInfo(null);
            setHasAlbaran(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // ── Cerrar con Escape ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    // ── Scroll automático al resultado ────────────────────────────────────────
    // Cuando aparece el panel de resultado (éxito o error), se hace scroll
    // para que sea visible aunque el formulario sea largo.
    useEffect(() => {
        if (!result) return;
        const id = setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
        return () => clearTimeout(id);
    }, [result]);

    // ── Helpers de form ───────────────────────────────────────────────────────
    function setField<K extends keyof MovimientoForm>(k: K, v: MovimientoForm[K]) {
        setForm(prev => ({ ...prev, [k]: v }));
        setResult(null);
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!producto) return;

        const cantidadNum = parseInt(form.cantidad, 10);
        if (!cantidadNum || cantidadNum < 1) {
            setResult({ ok: false, mensaje: 'La cantidad debe ser un número entero positivo.' });
            return;
        }

        setIsSaving(true);
        setResult(null);

        const body: Record<string, unknown> = {
            idProducto:     producto.id,
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

            // Notificar al padre para que actualice su lista
            onSaved(producto.id, data.stockNuevo);

            if (form.tipoMovimiento !== 'AJUSTE' && data.albaranCodigo) {
                setAlbaranInfo({
                    codigo: data.albaranCodigo,
                    fecha:  data.albaranFecha ?? new Date().toISOString(),
                    tipoMovimiento: form.tipoMovimiento,
                    producto,
                    cantidad:       cantidadNum,
                    precioUnitario: !isNaN(precio) && precio > 0 ? precio : null,
                    referencia:     form.referencia.trim(),
                    notas:          form.notas.trim(),
                    stockNuevo:     data.stockNuevo,
                });
                // Flag explícito en el mismo batch — inmune a race conditions React 18
                setHasAlbaran(true);
            }

            setResult({ ok: true, mensaje: data.resultado, stockNuevo: data.stockNuevo });
            setSelectedCliente(null);
            setSelectedProveedor(null);
            setForm(makeEmptyForm(form.tipoMovimiento));

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
    }, [producto, form, selectedCliente, selectedProveedor, onSaved, makeEmptyForm]);

    // ── Derivados ─────────────────────────────────────────────────────────────
    const esRetro           = producto?.tipoProducto === 'RETRO';
    const cantidadNum       = parseInt(form.cantidad, 10);
    const stockInsuficiente = form.tipoMovimiento === 'SALIDA'
        && !isNaN(cantidadNum) && cantidadNum > 0
        && producto !== null
        && cantidadNum > producto.stockActual;
    // Retro: unidad única — no se puede añadir stock si ya tiene ≥1 unidad
    const retroConflicto    = producto?.tipoProducto === 'RETRO'
        && form.tipoMovimiento === 'ENTRADA'
        && (producto?.stockActual ?? 0) >= 1;
    // Función para saber si un tipo está bloqueado para este producto
    const tipoEsBloqueado = (t: TipoMovimiento): boolean =>
        t === 'ENTRADA'
        && producto?.tipoProducto === 'RETRO'
        && (producto?.stockActual ?? 0) >= 1;
    const canSubmit = !isSaving && !stockInsuficiente && !retroConflicto;

    const tipoLabel: Record<TipoMovimiento, string> = {
        ENTRADA: '↓ Entrada',
        SALIDA:  '↑ Salida',
        AJUSTE:  '⚙ Ajuste',
    };

    // ── Render ────────────────────────────────────────────────────────────────
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
                    background:   'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, transparent 100%)',
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
                <div ref={scrollBodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Selector de tipo */}
                    <div>
                        <label style={labelStyle}>Tipo de movimiento</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {(['ENTRADA', 'SALIDA', 'AJUSTE'] as TipoMovimiento[]).map(t => {
                                const active   = form.tipoMovimiento === t;
                                const bloqueado = tipoEsBloqueado(t);
                                return (
                                    <button key={t}
                                        disabled={bloqueado}
                                        onClick={() => {
                                            if (bloqueado) return;
                                            setField('tipoMovimiento', t);
                                            setSelectedCliente(null);
                                            setSelectedProveedor(null);
                                        }}
                                        title={bloqueado ? 'No disponible — pieza retro ya en stock' : undefined}
                                        style={{
                                            flex:          1,
                                            fontFamily:    'var(--font-display)',
                                            fontSize:      '10px',
                                            fontWeight:    700,
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            padding:       '6px 4px',
                                            background: active
                                                ? `color-mix(in srgb, ${TIPO_COLOR[t]} 14%, transparent)`
                                                : 'transparent',
                                            color:    bloqueado ? 'var(--text-muted)'
                                                    : active    ? TIPO_COLOR[t]
                                                    : 'var(--text-muted)',
                                            border:        `1px solid ${active ? TIPO_COLOR[t] : 'var(--border-subtle)'}`,
                                            borderRadius:  '5px',
                                            cursor:        bloqueado ? 'not-allowed' : 'pointer',
                                            transition:    'all 140ms ease',
                                            opacity:       bloqueado ? 0.3 : active ? 1 : 0.7,
                                        }}
                                        onMouseEnter={e => {
                                            if (!active && !bloqueado) {
                                                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                                                (e.currentTarget as HTMLButtonElement).style.color = TIPO_COLOR[t];
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = TIPO_COLOR[t];
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!active && !bloqueado) {
                                                (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
                                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                                            }
                                        }}
                                    >
                                        {tipoLabel[t]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Campos del formulario (ocultos si retro bloqueado) ── */}
                    {retroConflicto ? (
                        /* Pieza retro con stock ≥ 1: no se puede hacer ENTRADA */
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: '12px', padding: '24px 16px', textAlign: 'center',
                            background:   'rgba(251,191,36,0.06)',
                            border:       '1px solid rgba(251,191,36,0.30)',
                            borderRadius: '8px',
                        }}>
                            <span style={{ fontSize: '32px', lineHeight: 1 }}>⚠</span>
                            <div>
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-gold)', margin: '0 0 6px' }}>
                                    Pieza retro — unidad única
                                </p>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                    Este artículo ya tiene{' '}
                                    <strong style={{ color: 'var(--text-primary)' }}>1 unidad</strong>{' '}
                                    en stock.<br />Solo puede existir una unidad de cada pieza retro.<br />
                                    Para registrar la venta usa{' '}
                                    <strong style={{ color: 'var(--accent-danger)' }}>↑ Salida</strong>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                    {/* Cantidad — oculta para RETRO (siempre 1, se auto-rellena) */}
                    {!esRetro && <div>
                        <label style={labelStyle}>Cantidad *</label>
                        <input
                            type="number" min={1}
                            placeholder="Introduce la cantidad…"
                            value={form.cantidad}
                            onChange={e => setField('cantidad', e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: stockInsuficiente ? 'var(--accent-danger)' : 'var(--border-default)',
                                boxShadow:   stockInsuficiente ? '0 0 0 3px rgba(248,113,113,0.15)' : 'none',
                            }}
                            onFocus={stockInsuficiente ? undefined : onFI}
                            onBlur={onBI}
                        />
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
                    </div>}

                    {/* Precio unitario */}
                    {form.tipoMovimiento !== 'AJUSTE' && (
                        <div>
                            <label style={labelStyle}>
                                Precio unitario (€){' '}
                                <span style={{ fontWeight: 400, opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>— opcional</span>
                            </label>
                            <input type="number" min={0} step="0.01" placeholder="0.00"
                                value={form.precioUnitario}
                                onChange={e => setField('precioUnitario', e.target.value)}
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
                                opciones={clientes} selected={selectedCliente} onSelect={setSelectedCliente}
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
                                opciones={proveedores} selected={selectedProveedor} onSelect={setSelectedProveedor}
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
                            onChange={e => setField('referencia', e.target.value)}
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
                            onChange={e => setField('notas', e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical', minHeight: '72px', lineHeight: 1.6 }}
                            onFocus={onFI} onBlur={onBI}
                        />
                    </div>
                        </>
                    )}
                    {/* ────────────────────────────────────────────────── */}

                    {/* Resultado */}
                    {result && (
                        <div ref={resultRef}>
                            <ResultPanel
                                result={result}
                                onVerAlbaran={hasAlbaran ? () => setAlbaranOpen(true) : undefined}
                            />
                        </div>
                    )}
                </div>

                {/* ── Footer con botón principal ── */}
                <div style={{
                    padding:     '16px 20px',
                    borderTop:   '1px solid var(--border-subtle)',
                    flexShrink:  0,
                    background:  'var(--bg-elevated)',
                }}>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        style={{
                            width:         '100%',
                            fontFamily:    'var(--font-display)',
                            fontSize:      '11px',
                            fontWeight:    700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            padding:       '10px',
                            borderRadius:  '6px',
                            border:        canSubmit
                                ? `1px solid ${
                                    form.tipoMovimiento === 'ENTRADA' ? 'var(--accent-primary)'
                                    : form.tipoMovimiento === 'SALIDA' ? '#dc2626'
                                    : 'var(--accent-gold)'}`
                                : '1px solid var(--border-subtle)',
                            cursor:        canSubmit ? 'pointer' : 'not-allowed',
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
                            boxShadow:     'none',
                            transition:    'all 160ms ease',
                            opacity:       isSaving ? 0.6 : 1,
                        }}
                    >
                        {isSaving
                            ? '· Procesando…'
                            : stockInsuficiente
                                ? '⛔ Stock insuficiente'
                                : retroConflicto
                                    ? '⚠ Unidad única — stock ya a 1'
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

            {/* ── Modal albarán (gestionado internamente) ── */}
            <AlbaranModal isOpen={albaranOpen} onClose={() => setAlbaranOpen(false)} data={albaranInfo} />
        </>,
        document.body,
    );
}
