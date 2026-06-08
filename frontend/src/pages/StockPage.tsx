/**
 * pages/StockPage.tsx — Control de Stock ACID
 *
 * Fusión de features/stock/sebastian + main:
 * - sebastian: selector predictivo cliente/proveedor, validación 422,
 *              ResultPanel mejorado, carga de proveedores.
 * - main:      búsqueda por nombre/SKU, paginación client-side.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import api                     from '../services/api';
import { productoService }     from '../services/productoService';
import { calculateAutoLimit }  from '../hooks/useTableFilters';
import type { Producto, TipoMovimiento } from '../types/models';
import { AlbaranModal }        from '../components/stock/AlbaranModal';
import type { AlbaranInfo }    from '../components/stock/AlbaranModal';

// ── Tipos locales ─────────────────────────────────────────────────────

interface EntidadOpcion { id: number; nombre: string; }

type StockEstado = 'OK' | 'BAJO' | 'CRITICO';

// ── Helpers de estado ─────────────────────────────────────────────────

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
    return { text: e === 'OK' ? '● OK' : e === 'BAJO' ? '⚠ BAJO' : '⛔ CRÍTICO', color: ESTADO_COLOR[e] };
}

const TIPO_COLOR: Record<TipoMovimiento, string> = {
    ENTRADA: 'var(--accent-primary)',
    SALIDA:  'var(--accent-danger)',
    AJUSTE:  'var(--accent-gold)',
};

// ── Form ──────────────────────────────────────────────────────────────

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

// ── Estilos base ──────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.10em', textTransform: 'uppercase',
    color: 'var(--text-muted)', display: 'block', marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', fontFamily: 'var(--font-mono)', fontSize: '13px',
    color: 'var(--text-primary)', background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)', borderRadius: '6px',
    padding: '9px 12px', outline: 'none', caretColor: 'var(--accent-cyan)',
    transition: 'border-color 160ms ease, box-shadow 160ms ease', boxSizing: 'border-box',
};

const onFI = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(56,189,248,0.12)';
};
const onBI = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-default)';
    e.currentTarget.style.boxShadow   = 'none';
};

// ═══════════════════════════════════════════════════════════════════════
// Selector predictivo genérico
// ═══════════════════════════════════════════════════════════════════════

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
                    borderColor: hasInvalidText ? 'var(--accent-danger)'  : open ? accentColor : 'var(--border-default)',
                    boxShadow:   hasInvalidText
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
                            Coincidencias no encontradas. Comprueba de nuevo o llama a servicio técnico.
                        </div>
                    ) : (
                        filtered.map(o => (
                            <div key={o.id}
                                onMouseDown={e => { e.preventDefault(); onSelect(o); setQuery(''); setOpen(false); }}
                                style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', transition: 'background 100ms ease' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: accentColor, minWidth: '28px', letterSpacing: '0.04em' }}>#{o.id}</span>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nombre}</span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {hasInvalidText && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', margin: '4px 0 0', letterSpacing: '0.02em' }}>
                    Selecciona una opción válida de la lista para continuar.
                </p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Panel de resultado de operación
// ═══════════════════════════════════════════════════════════════════════

function ResultPanel({ result }: { result: OpResult }): JSX.Element {
    const isOk  = result.ok;
    const color = isOk ? 'var(--accent-primary)' : 'var(--accent-danger)';
    const bg    = isOk ? 'rgba(59,130,246,0.08)'  : 'rgba(248,113,113,0.08)';

    return (
        <div style={{ borderRadius: '8px', border: `1px solid ${color}`, background: bg, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: result.stockNuevo !== undefined ? `1px solid ${color}30` : 'none', background: `${color}12` }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color, lineHeight: 1, flexShrink: 0 }}>
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

// ═══════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════

export function StockPage(): JSX.Element {
    const [productos,         setProductos]         = useState<Producto[]>([]);
    const [clientes,          setClientes]           = useState<EntidadOpcion[]>([]);
    const [proveedores,       setProveedores]        = useState<EntidadOpcion[]>([]);
    const [loadState,         setLoadState]          = useState<'loading'|'ok'|'error'>('loading');
    const [selected,          setSelected]           = useState<Producto | null>(null);
    const [selectedCliente,   setSelectedCliente]    = useState<EntidadOpcion | null>(null);
    const [selectedProveedor, setSelectedProveedor]  = useState<EntidadOpcion | null>(null);
    const [form,              setForm]               = useState<MovimientoForm>(EMPTY_FORM);
    const [isSaving,          setIsSaving]           = useState(false);
    const [result,            setResult]             = useState<OpResult | null>(null);
    const [activeFilter,      setActiveFilter]       = useState<'TODOS'|'ESTANDAR'|'RETRO'|'OK'|'BAJO'|'CRITICO'>('TODOS');
    const [searchTerm,        setSearchTerm]         = useState('');
    const [currentPage,       setCurrentPage]        = useState(0);
    const [rowsPerPage,       setRowsPerPage]        = useState<number>(() => calculateAutoLimit());
    const [albaranOpen,       setAlbaranOpen]        = useState(false);
    const [albaranInfo,       setAlbaranInfo]        = useState<AlbaranInfo | null>(null);

    // ── Carga inicial ─────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function cargarDatos() {
            setLoadState('loading');
            try {
                const primera = await productoService.listar(0, 100);
                if (cancelled) return;

                let todosProductos = [...primera.content];
                if (primera.totalElements > 100) {
                    const paginas = Math.ceil(primera.totalElements / 100);
                    const resto   = await Promise.all(
                        Array.from({ length: paginas - 1 }, (_, i) => productoService.listar(i + 1, 100))
                    );
                    if (cancelled) return;
                    resto.forEach(p => { todosProductos = [...todosProductos, ...p.content]; });
                }

                const clientesResp = await api.get<{ content: { id: number; nombre: string }[] }>(
                    '/clientes?size=200&sort=nombre'
                );
                const proveedoresResp = await api.get<{ id: number; razonSocial: string }[]>('/proveedores');

                if (cancelled) return;

                setProductos(todosProductos);
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

    // ── Filtrado + búsqueda ───────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return productos.filter(p => {
            const matchType =
                activeFilter === 'TODOS'    ? true :
                activeFilter === 'ESTANDAR' ? p.tipoProducto === 'ESTANDAR' :
                activeFilter === 'RETRO'    ? p.tipoProducto === 'RETRO' :
                getEstado(p) === activeFilter;
            const matchSearch = !q
                || p.nombre.toLowerCase().includes(q)
                || p.sku.toLowerCase().includes(q);
            return matchType && matchSearch;
        });
    }, [productos, activeFilter, searchTerm]);

    // ── Paginación client-side ────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const safePage   = Math.min(currentPage, totalPages - 1);
    const paginated  = useMemo(
        () => filtered.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage),
        [filtered, safePage, rowsPerPage]
    );

    // ── Selección de producto ─────────────────────────────────────────
    const handleSelect = useCallback((p: Producto) => {
        setSelected(p);
        setResult(null);
        setSelectedCliente(null);
        setSelectedProveedor(null);
        setForm(prev => ({ ...prev, cantidad: '', precioUnitario: '', referencia: '', notas: '' }));
    }, []);

    function setField<K extends keyof MovimientoForm>(k: K, v: MovimientoForm[K]) {
        setForm(prev => ({ ...prev, [k]: v }));
        setResult(null);
    }

    // ── Submit ────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!selected) return;

        const cantidadNum = parseInt(form.cantidad, 10);
        if (!cantidadNum || cantidadNum < 1) {
            setResult({ ok: false, mensaje: 'La cantidad debe ser un número entero positivo.' });
            return;
        }

        setIsSaving(true);
        setResult(null);

        const body: Record<string, unknown> = {
            idProducto:     selected.id,
            tipoMovimiento: form.tipoMovimiento,
            cantidad:       cantidadNum,
        };

        const precio = parseFloat(form.precioUnitario);
        if (!isNaN(precio) && precio > 0) body.precioUnitario = precio;
        if (form.referencia.trim())        body.referencia     = form.referencia.trim();
        if (form.notas.trim())             body.notas          = form.notas.trim();
        if (form.tipoMovimiento === 'SALIDA'  && selectedCliente)   body.idCliente   = selectedCliente.id;
        if (form.tipoMovimiento === 'ENTRADA' && selectedProveedor) body.idProveedor = selectedProveedor.id;

        try {
            interface MovResponse { resultado: string; stockNuevo: number; albaranCodigo?: string; albaranFecha?: string; }
            const { data } = await api.post<MovResponse>('/stock/movimiento', body);

            setProductos(prev => prev.map(p => p.id === selected.id ? { ...p, stockActual: data.stockNuevo } : p));
            setSelected(prev => prev?.id === selected.id ? { ...prev, stockActual: data.stockNuevo } : prev);

            if (form.tipoMovimiento !== 'AJUSTE' && data.albaranCodigo) {
                setAlbaranInfo({
                    codigo: data.albaranCodigo, fecha: data.albaranFecha ?? new Date().toISOString(),
                    tipoMovimiento: form.tipoMovimiento, producto: selected,
                    cantidad: cantidadNum, precioUnitario: !isNaN(precio) && precio > 0 ? precio : null,
                    referencia: form.referencia.trim(), notas: form.notas.trim(), stockNuevo: data.stockNuevo,
                });
                setAlbaranOpen(true);
            }

            setResult({ ok: true, mensaje: data.resultado, stockNuevo: data.stockNuevo });
            setSelectedCliente(null); setSelectedProveedor(null);
            setForm(EMPTY_FORM);

        } catch (err: unknown) {
            let msg = 'Error de red o servidor no disponible.';
            if (err && typeof err === 'object' && 'response' in err) {
                const ae = err as { response?: { status?: number; data?: { message?: string } } };
                const st = ae.response?.status;
                const sm = ae.response?.data?.message ?? '';
                if      (st === 409) msg = sm || 'Stock insuficiente o artículo no disponible.';
                else if (st === 422) msg = sm || 'ID no existente o inactivo. Comprueba que existe o habla con soporte.';
                else if (st === 403) msg = 'Sin permiso. Roles: CAJERO · GESTOR_INVENTARIO · ADMIN';
                else if (st === 401) msg = 'Sesión expirada. Redirigiendo al login…';
                else                 msg = sm || `Error ${st ?? 'desconocido'} al procesar la transacción.`;
            }
            setResult({ ok: false, mensaje: msg });
        } finally {
            setIsSaving(false);
        }
    }, [selected, form, selectedCliente, selectedProveedor]);

    // ── Render ────────────────────────────────────────────────────────
    return (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', gap: '16px', height: 'calc(100dvh - 104px)', minHeight: 0 }}>

            {/* ══ IZQUIERDA — Tabla ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>

                <div style={{ flexShrink: 0 }}>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,2vw,22px)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        Control de Stock
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
                        Transacciones ACID via Stored Procedure · Selecciona un producto para operar
                    </p>
                </div>

                {/* Búsqueda */}
                <div style={{ flexShrink: 0, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>⌕</span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU…"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                        style={{ ...inputStyle, paddingLeft: '30px', fontSize: '12px' }}
                        onFocus={onFI} onBlur={onBI}
                    />
                </div>

                {/* Filtros */}
                <div style={{ flexShrink: 0, display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(['TODOS','ESTANDAR','RETRO'] as const).map(t => {
                        const active = activeFilter === t;
                        const color  = t === 'RETRO' ? 'var(--accent-gold)' : 'var(--accent-primary)';
                        return <button key={t} onClick={() => { setActiveFilter(t); setCurrentPage(0); }} style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', background: active ? color : 'transparent', color: active ? 'var(--text-inverse)' : 'var(--text-muted)', border: `1px solid ${active ? color : 'var(--border-default)'}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease' }}>{t}</button>;
                    })}
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
                    {(['OK','BAJO','CRITICO'] as const).map(e => {
                        const active = activeFilter === e;
                        const color  = ESTADO_COLOR[e];
                        return <button key={e} onClick={() => { setActiveFilter(active ? 'TODOS' : e); setCurrentPage(0); }} style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', background: active ? color : 'transparent', color: active ? 'var(--text-inverse)' : color, border: `1px solid ${active ? color : 'var(--border-default)'}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease' }}>{e}</button>;
                    })}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
                        {loadState === 'loading' ? 'Cargando…' : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`}
                    </span>
                </div>

                {/* Tabla */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                    {loadState === 'loading' ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>Cargando productos…</div>
                    ) : loadState === 'error' ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>Error al cargar productos. Comprueba la conexión con el backend.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                                    {['SKU','Producto','Tipo','Stock','Mín.','Estado'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map(p => {
                                    const isSel = selected?.id === p.id;
                                    return (
                                        <tr key={p.id} onClick={() => handleSelect(p)}
                                            style={{ borderBottom: '1px solid var(--border-subtle)', background: isSel ? 'rgba(59,130,246,0.10)' : 'transparent', cursor: 'pointer', transition: 'background 120ms ease', outline: isSel ? '2px solid rgba(59,130,246,0.30)' : 'none', outlineOffset: '-2px' }}
                                            onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-overlay)'; }}
                                            onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                                        >
                                            <td style={{ padding: '10px 12px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>{p.sku}</span></td>
                                            <td style={{ padding: '10px 12px', maxWidth: '200px' }}><div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div></td>
                                            <td style={{ padding: '10px 12px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--text-secondary)', border: `1px solid ${p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--border-default)'}`, borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.04em' }}>{p.tipoProducto}</span></td>
                                            <td style={{ padding: '10px 12px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: getStockColor(p), letterSpacing: '-0.01em' }}>{p.stockActual}</span></td>
                                            <td style={{ padding: '10px 12px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>{p.stockMinimo}</span></td>
                                            <td style={{ padding: '10px 12px' }}>{(() => { const b = getEstadoBadge(p); return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: b.color, background: `${b.color}18`, border: `1px solid ${b.color}`, borderRadius: '3px', padding: '2px 8px', whiteSpace: 'nowrap' }}>{b.text}</span>; })()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Paginación */}
                {loadState === 'ok' && (
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button disabled={safePage === 0} onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', padding: '5px 10px', background: 'transparent', color: safePage === 0 ? 'var(--border-default)' : 'var(--text-muted)', border: `1px solid ${safePage === 0 ? 'var(--border-subtle)' : 'var(--border-default)'}`, borderRadius: '4px', cursor: safePage === 0 ? 'default' : 'pointer', transition: 'all 120ms ease' }}>
                            ← ANT
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i).map(i => {
                            const show = totalPages <= 6 || i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1;
                            if (!show) {
                                if (i === 1 || i === totalPages - 2) return <span key={i} style={{ color: 'var(--text-muted)', fontSize: '11px' }}>…</span>;
                                return null;
                            }
                            const active = i === safePage;
                            return (
                                <button key={i} onClick={() => setCurrentPage(i)} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: active ? 700 : 400, padding: '4px 9px', background: active ? 'var(--accent-primary)' : 'transparent', color: active ? 'var(--text-inverse)' : 'var(--text-muted)', border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-default)'}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 120ms ease', minWidth: '30px' }}>
                                    {i + 1}
                                </button>
                            );
                        })}

                        <button disabled={safePage >= totalPages - 1} onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', padding: '5px 10px', background: 'transparent', color: safePage >= totalPages - 1 ? 'var(--border-default)' : 'var(--text-muted)', border: `1px solid ${safePage >= totalPages - 1 ? 'var(--border-subtle)' : 'var(--border-default)'}`, borderRadius: '4px', cursor: safePage >= totalPages - 1 ? 'default' : 'pointer', transition: 'all 120ms ease' }}>
                            SIG →
                        </button>

                        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />

                        <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(0); }}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', outline: 'none' }}>
                            {[10, 20, 50].map(n => <option key={n} value={n}>{n} / pág.</option>)}
                        </select>

                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginLeft: 'auto' }}>
                            {safePage * rowsPerPage + 1}–{Math.min((safePage + 1) * rowsPerPage, filtered.length)} de {filtered.length}
                        </span>
                    </div>
                )}
            </div>

            {/* ══ DERECHA — Formulario ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', overflow: 'hidden', height: '100%', minHeight: 0 }}>
                <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '4px' }}>◈ REGISTRAR MOVIMIENTO</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: selected ? 'var(--text-primary)' : 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        {selected ? selected.sku : '— Selecciona un producto —'}
                    </div>
                    {selected && <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.nombre}</div>}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', paddingBottom: '80px' }}>
                    {!selected ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center', padding: '32px 16px' }}>
                            <div style={{ fontSize: '40px', opacity: 0.12 }}>◈</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Selecciona un producto de la tabla para registrar una entrada, salida o ajuste
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--border-default)', letterSpacing: '0.06em' }}>
                                Las transacciones son ACID via Stored Procedure
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Stock actual */}
                            <div style={{ display: 'flex', overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                                {[
                                    { label: 'STOCK ACTUAL', value: String(selected.stockActual), color: getStockColor(selected), big: true },
                                    { label: 'MÍNIMO',       value: String(selected.stockMinimo), color: 'var(--text-secondary)', big: true },
                                    { label: 'ESTADO',       value: getEstadoBadge(selected).text.replace(/^[^\s]+\s/, ''), color: getEstadoBadge(selected).color, big: false },
                                ].map((item, i) => (
                                    <div key={i} style={{ flex: 1, padding: '10px 12px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>{item.label}</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: item.big ? '22px' : '13px', fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Tipo */}
                            <div>
                                <label style={labelStyle}>Tipo de Movimiento</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {(['ENTRADA','SALIDA','AJUSTE'] as TipoMovimiento[]).map(t => {
                                        const active = form.tipoMovimiento === t;
                                        return <button key={t} onClick={() => { setField('tipoMovimiento', t); setSelectedCliente(null); setSelectedProveedor(null); }} style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 4px', background: active ? TIPO_COLOR[t] : 'transparent', color: active ? 'var(--text-inverse)' : TIPO_COLOR[t], border: `1px solid ${TIPO_COLOR[t]}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 140ms ease' }}>{t}</button>;
                                    })}
                                </div>
                            </div>

                            {/* Cantidad */}
                            <div>
                                <label style={labelStyle}>Cantidad *</label>
                                <input type="number" min={1} placeholder="Introduce la cantidad…" value={form.cantidad} onChange={e => setField('cantidad', e.target.value)} style={inputStyle} onFocus={onFI} onBlur={onBI} />
                            </div>

                            {/* Precio */}
                            {form.tipoMovimiento !== 'AJUSTE' && (
                                <div>
                                    <label style={labelStyle}>Precio unitario (€) <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <input type="number" min={0} step="0.01" placeholder="0.00" value={form.precioUnitario} onChange={e => setField('precioUnitario', e.target.value)} style={inputStyle} onFocus={onFI} onBlur={onBI} />
                                </div>
                            )}

                            {/* Selector de cliente — SALIDA */}
                            {form.tipoMovimiento === 'SALIDA' && (
                                <div>
                                    <label style={labelStyle}>Cliente <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <SelectorPredictivo
                                        opciones={clientes} selected={selectedCliente} onSelect={setSelectedCliente}
                                        placeholder="Buscar cliente por ID o nombre…" accentColor="var(--accent-cyan)"
                                    />
                                </div>
                            )}

                            {/* Selector de proveedor — ENTRADA */}
                            {form.tipoMovimiento === 'ENTRADA' && (
                                <div>
                                    <label style={labelStyle}>Proveedor <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <SelectorPredictivo
                                        opciones={proveedores} selected={selectedProveedor} onSelect={setSelectedProveedor}
                                        placeholder="Buscar proveedor por ID o razón social…" accentColor="var(--accent-primary)"
                                    />
                                </div>
                            )}

                            {/* Referencia */}
                            <div>
                                <label style={labelStyle}>Referencia <span style={{ fontWeight: 400, opacity: 0.55 }}>— albarán, factura…</span></label>
                                <input type="text" placeholder="ej. ALB-2026-0042" value={form.referencia} onChange={e => setField('referencia', e.target.value)} style={inputStyle} onFocus={onFI} onBlur={onBI} />
                            </div>

                            {/* Notas */}
                            <div>
                                <label style={labelStyle}>Notas <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                <textarea placeholder="Información adicional del movimiento…" rows={2} value={form.notas} onChange={e => setField('notas', e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: '52px' }} onFocus={onFI} onBlur={onBI} />
                            </div>

                            {result && <ResultPanel result={result} />}

                            <button onClick={handleSubmit} disabled={isSaving} className="btn btn-primary"
                                style={{ width: '100%', fontSize: '12px', letterSpacing: '0.12em', opacity: isSaving ? 0.6 : 1, cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
                                {isSaving ? 'PROCESANDO…' : `REGISTRAR ${form.tipoMovimiento}`}
                            </button>

                        </div>
                    )}
                </div>
            </div>
        </div>

        <AlbaranModal isOpen={albaranOpen} onClose={() => setAlbaranOpen(false)} data={albaranInfo} />
        </>
    );
}