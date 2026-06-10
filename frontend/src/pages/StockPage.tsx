/**
 * pages/StockPage.tsx — Control de Stock v5
 *
 * · Drawer extraído a components/stock/MovimientoDrawer
 * · Tabla a ancho completo con botones Entrada / Salida / Ajuste por fila
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { PackagePlus, PackageMinus, SlidersHorizontal } from 'lucide-react';
import { productoService }        from '../services/productoService';
import { calculateAutoLimit }     from '../hooks/useTableFilters';
import type { Producto, TipoMovimiento } from '../types/models';
import {
    MovimientoDrawer,
    getEstado,
    ESTADO_COLOR,
    getEstadoBadge,
    getStockColor,
    TIPO_COLOR,
} from '../components/stock/MovimientoDrawer';
import type { StockEstado } from '../components/stock/MovimientoDrawer';
import { ActionIconBtn }          from '../components/ui/ActionIconBtn';

// ── Estilos reutilizables ─────────────────────────────────────────────────────

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

// ── Supress unused-import warning for StockEstado (used as type annotation) ──
// (type-only import keeps the bundle clean)
type _SE = StockEstado; // eslint-disable-line @typescript-eslint/no-unused-vars

// ═══════════════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════════════

export function StockPage(): JSX.Element {
    const [productos,       setProductos]      = useState<Producto[]>([]);
    const [loadState,       setLoadState]      = useState<'loading'|'ok'|'error'>('loading');
    const [activeFilter,    setActiveFilter]   = useState<'TODOS'|'ESTANDAR'|'RETRO'|'OK'|'BAJO'|'CRITICO'>('TODOS');
    const [searchTerm,      setSearchTerm]     = useState('');
    const [currentPage,     setCurrentPage]    = useState(0);
    const [rowsPerPage,     setRowsPerPage]    = useState<number>(() => calculateAutoLimit());

    // Drawer
    const [sortField,       setSortField]      = useState<'nombre' | 'stockActual' | 'stockMinimo' | null>(null);
    const [sortDir,         setSortDir]        = useState<'asc' | 'desc'>('asc');

    const toggleSort = (field: 'nombre' | 'stockActual' | 'stockMinimo'): void => {
        if (sortField !== field) {
            setSortField(field); setSortDir('asc');
        } else if (sortDir === 'asc') {
            setSortDir('desc');
        } else {
            setSortField(null);
        }
        setCurrentPage(0);
    };

    const [drawerOpen,      setDrawerOpen]     = useState(false);
    const [drawerProducto,  setDrawerProducto] = useState<Producto | null>(null);
    const [drawerInitialTipo, setDrawerInitialTipo] = useState<TipoMovimiento>('ENTRADA');

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

                setProductos(todos);
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

    // ── Ordenación client-side ─────────────────────────────────────────────────
    const sorted = useMemo(() => {
        if (!sortField) return filtered;
        return [...filtered].sort((a, b) => {
            if (sortField === 'nombre') {
                return sortDir === 'asc'
                    ? a.nombre.localeCompare(b.nombre, 'es-ES')
                    : b.nombre.localeCompare(a.nombre, 'es-ES');
            }
            const aVal = a[sortField] as number;
            const bVal = b[sortField] as number;
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }, [filtered, sortField, sortDir]);

    // ── Paginación client-side ─────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
    const safePage   = Math.min(currentPage, totalPages - 1);
    const paginated  = useMemo(
        () => sorted.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage),
        [sorted, safePage, rowsPerPage],
    );

    // ── Drawer helpers ─────────────────────────────────────────────────────────
    const openDrawer = useCallback((p: Producto, tipo: TipoMovimiento) => {
        setDrawerProducto(p);
        setDrawerInitialTipo(tipo);
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        setTimeout(() => setDrawerProducto(null), 320);
    }, []);

    const handleMovimientoSaved = useCallback((productoId: number, stockNuevo: number) => {
        setProductos(prev => prev.map(p => p.id === productoId ? { ...p, stockActual: stockNuevo } : p));
    }, []);

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

                {/* Buscador */}
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

            {/* ── Contador + Paginación ── */}
            {loadState === 'ok' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>

                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        {sorted.length === 0
                            ? 'Sin productos'
                            : <>Mostrando{' '}
                                <strong style={{ color: 'var(--text-secondary)' }}>
                                    {safePage * rowsPerPage + 1}–{Math.min((safePage + 1) * rowsPerPage, sorted.length)}
                                </strong>
                                {' '}de{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{sorted.length}</strong>
                                {' '}producto{sorted.length !== 1 ? 's' : ''}
                            </>
                        }
                    </span>

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
                                    <th style={stockThBase}>SKU</th>
                                    <StockSortableTh label="Producto"  field="nombre"       currentField={sortField} dir={sortDir} onSort={toggleSort} />
                                    <th style={stockThBase}>Tipo</th>
                                    <StockSortableTh label="Stock Act." field="stockActual"  currentField={sortField} dir={sortDir} onSort={toggleSort} />
                                    <StockSortableTh label="Mín."       field="stockMinimo"  currentField={sortField} dir={sortDir} onSort={toggleSort} />
                                    <th style={stockThBase}>Estado</th>
                                    <th style={stockThBase}>Acciones</th>
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
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--text-muted)', letterSpacing: '0.04em' }}>
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
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: badge.color, whiteSpace: 'nowrap' }}>
                                                    {badge.text}
                                                </span>
                                            </td>
                                            {/* Acciones */}
                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                    <ActionIconBtn
                                                        icon={PackagePlus}
                                                        color="primary"
                                                        title="Registrar entrada de stock"
                                                        onClick={() => openDrawer(p, 'ENTRADA')}
                                                    />
                                                    <ActionIconBtn
                                                        icon={PackageMinus}
                                                        color="danger"
                                                        title="Registrar salida de stock"
                                                        onClick={() => openDrawer(p, 'SALIDA')}
                                                    />
                                                    <ActionIconBtn
                                                        icon={SlidersHorizontal}
                                                        color="gold"
                                                        title="Ajustar stock manualmente"
                                                        onClick={() => openDrawer(p, 'AJUSTE')}
                                                    />
                                                </div>
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
            initialTipo={drawerInitialTipo}
            onClose={closeDrawer}
            onSaved={handleMovimientoSaved}
        />
        </>
    );
}

// ── Cabeceras de tabla ────────────────────────────────────────────────────────

const stockThBase: React.CSSProperties = {
    padding: '12px 14px', textAlign: 'left',
    fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.10em', textTransform: 'uppercase',
    color: 'var(--text-secondary)', whiteSpace: 'nowrap',
};

function StockSortableTh({ label, field, currentField, dir, onSort }: {
    label:        string;
    field:        'nombre' | 'stockActual' | 'stockMinimo';
    currentField: 'nombre' | 'stockActual' | 'stockMinimo' | null;
    dir:          'asc' | 'desc';
    onSort:       (f: 'nombre' | 'stockActual' | 'stockMinimo') => void;
}): JSX.Element {
    const active = currentField === field;
    return (
        <th style={{ ...stockThBase, cursor: 'pointer', userSelect: 'none' }}>
            <button
                onClick={() => onSort(field)}
                style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'color 120ms ease', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
                {label}
                <span style={{ opacity: active ? 1 : 0.3, fontSize: '9px', display: 'flex', flexDirection: 'column', lineHeight: '0.65', gap: 0 }}>
                    <span style={{ opacity: active && dir === 'asc'  ? 1 : active ? 0.3 : 1 }}>▲</span>
                    <span style={{ opacity: active && dir === 'desc' ? 1 : active ? 0.3 : 1 }}>▼</span>
                </span>
            </button>
        </th>
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

// ── Re-export helpers (convenience for other consumers) ───────────────────────
export { getEstado, ESTADO_COLOR, getEstadoBadge, getStockColor, TIPO_COLOR };
export type { StockEstado };
