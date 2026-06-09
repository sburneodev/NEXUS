/**
 * pages/ProductosPage.tsx — SUFP v3.1
 *
 * Gestión de productos con filtrado y paginación server-side.
 * · Chips de filtro rápido: Todos / Estándar / Retro / Stock Bajo / Críticos
 * · Cabeceras de tabla ordenables: SKU, Nombre, Precio Venta, Stock
 * · Ajuste rápido de stock inline (mini-modal)
 * · Creación: navega a /productos/nuevo (wizard dedicado)
 * · Edición:  ProductFormPanel integrado en el panel central
 */

import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import { createPortal }                                                            from 'react-dom';
import { useLocation }                                                     from 'react-router-dom';
import type { Producto, TipoProducto, PaginatedResponse }                  from '../types/models';
import { ProductFormPanel }                                                 from '../components/productos/ProductFormPanel';
import { useTableFilters, calculateAutoLimit }                              from '../hooks/useTableFilters';
import { TableControls, SkeletonRows }                                     from '../components/table/TableControls';
import { productoService }                                                  from '../services/productoService';
import api                                                                  from '../services/api';

// ── Tipos locales ─────────────────────────────────────────────────────────────

type ChipFilter = 'todos' | 'ESTANDAR' | 'RETRO' | 'stockBajo' | 'criticos' | 'inactivos';
type SortField  = 'sku' | 'nombre' | 'precioVenta' | 'stockActual';
type SortDir    = 'asc' | 'desc';

// ── Página ────────────────────────────────────────────────────────────────────

export function ProductosPage(): JSX.Element {
    const location = useLocation();

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'productos', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination } = filters;

    // ── Estado local ─────────────────────────────────────────────────────────
    const [rows,        setRows]        = useState<Producto[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [chip,        setChip]        = useState<ChipFilter>('todos');
    const [sortField,   setSortField]   = useState<SortField | null>(null);
    const [sortDir,     setSortDir]     = useState<SortDir>('asc');
    const [editOpen,    setEditOpen]    = useState(false);
    const [selected,    setSelected]    = useState<Producto | null>(null);
    const [adjusting,   setAdjusting]   = useState<Producto | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);

    // Mensaje de éxito tras crear producto desde /productos/nuevo
    const [successMsg, setSuccessMsg] = useState<string | null>(
        (location.state as { created?: boolean } | null)?.created
            ? '✓ Producto creado correctamente'
            : null,
    );
    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => setSuccessMsg(null), 4000);
            return () => clearTimeout(t);
        }
    }, [successMsg]);

    const refresh = useCallback(() => setRefreshTick(t => t + 1), []);

    // ── Helpers de ordenación ─────────────────────────────────────────────────
    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
        filters.setPage(0);
    };

    const sortIcon = (field: SortField): string => {
        if (sortField !== field) return ' ⇅';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    // ── Fetch server-side ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const params = buildParams();

        // Filtro de tipo
        if (chip === 'ESTANDAR') params.set('tipo', 'ESTANDAR');
        if (chip === 'RETRO')    params.set('tipo', 'RETRO');

        // Filtros de stock / estado (backend + fallback client-side)
        if (chip === 'stockBajo')  params.set('stockBajo',    'true');
        if (chip === 'criticos')   params.set('stockCritico', 'true');
        if (chip === 'inactivos')  params.set('activo',       'false');

        // Ordenación
        if (sortField) params.set('sort', `${sortField},${sortDir}`);

        api.get<PaginatedResponse<Producto>>(`/productos?${params.toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    setRows(data.content);
                    setPagination(data.totalElements, data.totalPages);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRows([]);
                    setPagination(0, 0);
                }
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return (): void => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.querySignal, chip, sortField, sortDir, refreshTick]);

    // ── Filtro client-side como fallback (stock bajo / críticos) ─────────────
    const displayRows = (() => {
        if (chip === 'stockBajo')  return rows.filter(p => p.stockActual <= p.stockMinimo);
        if (chip === 'criticos')   return rows.filter(p => p.stockActual === 0);
        if (chip === 'inactivos')  return rows.filter(p => !p.activo);
        return rows;
    })();

    // ── Guardar (creación o edición) ─────────────────────────────────────────
    const handleSave = useCallback(async (
        data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>,
    ): Promise<void> => {
        try {
            if (selected) {
                await productoService.editar(selected.id, data as any);
            } else {
                await productoService.crear(data as any);
            }
            setEditOpen(false);
            setSelected(null);
            refresh();
        } catch (err) {
            console.error('Error guardando producto:', err);
        }
    }, [selected, refresh]);

    // ── Eliminar ─────────────────────────────────────────────────────────────
    const handleDelete = useCallback(async (id: number): Promise<void> => {
        if (window.confirm('¿Eliminar este producto?')) {
            try {
                await productoService.eliminar(id);
                refresh();
            } catch (err) {
                console.error('Error eliminando producto:', err);
            }
        }
    }, [refresh]);

    // ── Ajuste de stock ───────────────────────────────────────────────────────
    const handleStockSave = useCallback(async (producto: Producto, newStock: number): Promise<void> => {
        try {
            await productoService.editar(producto.id, { ...producto, stockActual: newStock } as any);
            setAdjusting(null);
            refresh();
        } catch {
            console.error('Error ajustando stock');
        }
    }, [refresh]);

    const openEdit = (p: Producto): void => { setSelected(p); setEditOpen(true); };
    const closeEdit = (): void => { setEditOpen(false); setSelected(null); };

    // ── Chips de filtro ───────────────────────────────────────────────────────
    const CHIPS: { key: ChipFilter; label: string; icon?: string; danger?: boolean; muted?: boolean; color?: string }[] = [
        { key: 'todos',     label: 'Todos' },
        { key: 'ESTANDAR',  label: 'Estándar' },
        { key: 'RETRO',     label: 'Retro',      icon: '★', color: 'var(--accent-gold)'   },
        { key: 'stockBajo', label: 'Stock Bajo', icon: '⚠', danger: true                  },
        { key: 'criticos',  label: 'Sin Stock',  icon: '●', danger: true                  },
        { key: 'inactivos', label: 'Inactivos',  icon: '○', muted:  true                  },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            {editOpen ? (

                /* ── Panel de edición a pantalla completa ─────────────────── */
                <ProductFormPanel
                    producto={selected}
                    onCancel={closeEdit}
                    onSave={handleSave}
                />

            ) : (
                <>
                    {/* ── Toast de éxito ────────────────────────────────── */}
                    {successMsg && (
                        <div style={{
                            marginBottom:  '14px',
                            padding:       '10px 16px',
                            background:    'rgba(34,197,94,0.08)',
                            border:        '1px solid rgba(34,197,94,0.28)',
                            borderRadius:  '8px',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '12px',
                            color:         '#22C55E',
                            display:       'flex',
                            alignItems:    'center',
                            gap:           '8px',
                        }}>
                            {successMsg}
                        </div>
                    )}

                    {/* ── Cabecera ──────────────────────────────────────── */}
                    <div style={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'space-between',
                        marginBottom:   '14px',
                        flexWrap:       'wrap',
                        gap:            '8px',
                    }}>
                        <div>
                            <h1 style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '1rem',
                                fontWeight:    700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                color:         'var(--text-primary)',
                                marginBottom:  '2px',
                            }}>
                                Productos
                            </h1>
                            <p style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '11px',
                                color:         'var(--text-muted)',
                                letterSpacing: '0.04em',
                            }}>
                                {isLoading
                                    ? 'Cargando...'
                                    : `${filters.totalItems.toLocaleString('es-ES')} producto${filters.totalItems !== 1 ? 's' : ''} encontrado${filters.totalItems !== 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <button
                            onClick={() => { setSelected(null); setEditOpen(true); }}
                            className="btn btn-primary"
                            style={{ flexShrink: 0 }}
                        >
                            + AÑADIR PRODUCTO
                        </button>
                    </div>

                    {/* ── Chips de filtro ───────────────────────────────── */}
                    <div style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '6px',
                        marginBottom: '12px',
                        flexWrap:   'wrap',
                    }}>
                        {CHIPS.map(c => {
                            const active = chip === c.key;
                            // Color: explícito > danger > muted > primario
                            const accentColor = c.muted
                                ? 'var(--text-muted)'
                                : c.danger
                                    ? 'var(--accent-danger)'
                                    : c.color ?? 'var(--accent-primary)';
                            const activeBg = c.muted
                                ? 'rgba(168,181,194,0.10)'
                                : c.danger
                                    ? 'rgba(248,113,113,0.12)'
                                    : 'var(--accent-primary-glow)';

                            return (
                                <button
                                    key={c.key}
                                    onClick={() => { setChip(c.key); filters.setPage(0); }}
                                    style={{
                                        fontFamily:    'var(--font-display)',
                                        fontSize:      '11px',
                                        fontWeight:    700,
                                        letterSpacing: '0.09em',
                                        textTransform: 'uppercase',
                                        padding:       '5px 12px',
                                        borderRadius:  '20px',
                                        border:        `1px solid ${active ? accentColor : 'var(--border-default)'}`,
                                        background:    active ? activeBg : 'transparent',
                                        color:         active ? accentColor : 'var(--text-muted)',
                                        cursor:        'pointer',
                                        transition:    'all 160ms ease',
                                        display:       'flex',
                                        alignItems:    'center',
                                        gap:           '4px',
                                    }}
                                    onMouseEnter={e => {
                                        if (!active) {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)';
                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!active) {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                                        }
                                    }}
                                >
                                    {c.icon && <span>{c.icon}</span>}
                                    {c.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Búsqueda y controles de tabla ─────────────────── */}
                    <div style={{ marginBottom: '14px' }}>
                        <TableControls
                            filters={filters}
                            isLoading={isLoading}
                            entityLabel="producto"
                            entityLabelPlural="productos"
                            searchPlaceholder="Buscar por nombre, SKU o descripción..."
                        />
                    </div>

                    {/* ── Tabla ─────────────────────────────────────────── */}
                    <div style={{
                        background:   'var(--bg-surface)',
                        border:       '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        overflow:     'hidden',
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                        {/* SKU — ordenable */}
                                        <SortableTh
                                            label="SKU"
                                            field="sku"
                                            currentField={sortField}
                                            dir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        {/* Nombre — ordenable */}
                                        <SortableTh
                                            label="Nombre"
                                            field="nombre"
                                            currentField={sortField}
                                            dir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        <Th>Tipo</Th>
                                        {/* Precio — ordenable */}
                                        <SortableTh
                                            label="Precio Venta"
                                            field="precioVenta"
                                            currentField={sortField}
                                            dir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        {/* Stock — ordenable */}
                                        <SortableTh
                                            label="Stock"
                                            field="stockActual"
                                            currentField={sortField}
                                            dir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        <Th>Estado</Th>
                                        <Th>Acciones</Th>
                                    </tr>
                                </thead>
                                <tbody style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 200ms ease' }}>
                                    {isLoading && displayRows.length === 0 && (
                                        <SkeletonRows rows={Math.min(filters.limit, 10)} cols={7} />
                                    )}
                                    {!isLoading && displayRows.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{
                                                padding:       '48px',
                                                textAlign:     'center',
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '12px',
                                                color:         'var(--text-muted)',
                                                letterSpacing: '0.08em',
                                            }}>
                                                {filters.search
                                                    ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                                    : chip !== 'todos'
                                                        ? 'SIN PRODUCTOS EN ESTE FILTRO'
                                                        : 'SIN PRODUCTOS'}
                                            </td>
                                        </tr>
                                    )}
                                    {displayRows.map(p => (
                                        <tr
                                            key={p.id}
                                            style={{
                                                borderBottom: '1px solid var(--border-subtle)',
                                                transition:   'background 120ms ease',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.035)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            {/* SKU */}
                                            <td style={tdStyle}>
                                                <span style={{
                                                    fontFamily:    'var(--font-mono)',
                                                    fontSize:      '11px',
                                                    color:         'var(--accent-cyan)',
                                                    letterSpacing: '0.04em',
                                                }}>
                                                    {p.sku}
                                                </span>
                                            </td>

                                            {/* Nombre */}
                                            <td style={tdStyle}>
                                                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {p.nombre}
                                                </div>
                                                {p.descripcion && (
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {p.descripcion.slice(0, 48)}{p.descripcion.length > 48 ? '…' : ''}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Tipo */}
                                            <td style={tdStyle}>
                                                <span style={{
                                                    fontFamily:    'var(--font-mono)',
                                                    fontSize:      '11px',
                                                    letterSpacing: '0.06em',
                                                    color:         p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                                    border:        `1px solid ${p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                                                    background:    p.tipoProducto === 'RETRO' ? 'rgba(255,200,60,0.08)' : 'transparent',
                                                    borderRadius:  '3px',
                                                    padding:       '2px 7px',
                                                }}>
                                                    {p.tipoProducto}
                                                </span>
                                            </td>

                                            {/* Precio */}
                                            <td style={tdStyle}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                    €{p.precioVenta.toFixed(2)}
                                                </span>
                                            </td>

                                            {/* Stock */}
                                            <td style={tdStyle}>
                                                {stockBadge(p)}
                                            </td>

                                            {/* Estado */}
                                            <td style={tdStyle}>
                                                {p.tipoProducto === 'RETRO' && !p.activo ? (
                                                    <span style={{
                                                        fontFamily:    'var(--font-mono)', fontSize: '11px', fontWeight: 700,
                                                        letterSpacing: '0.14em', color: 'var(--accent-danger)',
                                                        border:        '1px solid var(--accent-danger)',
                                                        borderRadius:  '2px', padding: '2px 7px', display: 'inline-block',
                                                    }}>VENDIDO</span>
                                                ) : (
                                                    <span style={{
                                                        fontFamily:    'var(--font-mono)', fontSize: '11px',
                                                        color:         p.activo ? 'var(--accent-primary)' : 'var(--text-muted)',
                                                        letterSpacing: '0.06em',
                                                    }}>
                                                        {p.activo ? '● ACTIVO' : '○ INACTIVO'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                                <button
                                                    onClick={() => setAdjusting(p)}
                                                    style={actionBtn('var(--accent-primary)')}
                                                    aria-label={`Ajustar stock de ${p.nombre}`}
                                                    title="Ajustar stock"
                                                >
                                                    ± Stock
                                                </button>
                                                <button
                                                    onClick={() => openEdit(p)}
                                                    style={actionBtn('var(--accent-cyan)')}
                                                    aria-label={`Editar ${p.nombre}`}
                                                >
                                                    ✎ Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    style={actionBtn('#cc2244', 0.55)}
                                                    aria-label={`Eliminar ${p.nombre}`}
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ── Modal ajuste de stock ───────────────────────────── */}
            {adjusting && (
                <StockAdjustModal
                    producto={adjusting}
                    onClose={() => setAdjusting(null)}
                    onSave={newStock => handleStockSave(adjusting, newStock)}
                />
            )}
        </div>
    );
}

// ── Badge de stock ────────────────────────────────────────────────────────────

function stockBadge(p: Producto): JSX.Element {
    const critico = p.tipoProducto !== 'RETRO' && p.stockActual <= p.stockMinimo;
    return (
        <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '11px',
            fontWeight:    600,
            color:         critico ? 'var(--accent-danger)' : 'var(--accent-primary)',
            background:    critico ? 'var(--accent-danger-glow)' : 'var(--accent-primary-glow)',
            border:        `1px solid ${critico ? 'var(--accent-danger)' : 'var(--accent-primary)'}`,
            borderRadius:  '4px',
            padding:       '1px 6px',
            letterSpacing: '0.04em',
        }}>
            {p.stockActual}
        </span>
    );
}

// ── Cabeceras de tabla ────────────────────────────────────────────────────────

function Th({ children }: { children: ReactNode }): JSX.Element {
    return (
        <th style={thBase}>{children}</th>
    );
}

function SortableTh({ label, field, currentField, dir, onSort }: {
    label:        string;
    field:        SortField;
    currentField: SortField | null;
    dir:          SortDir;
    onSort:       (f: SortField) => void;
}): JSX.Element {
    const active = currentField === field;
    return (
        <th style={{ ...thBase, cursor: 'pointer', userSelect: 'none' }}>
            <button
                onClick={() => onSort(field)}
                style={{
                    background:    'transparent',
                    border:        'none',
                    cursor:        'pointer',
                    fontFamily:    'var(--font-display)',
                    fontSize:      '11px',   /* alineado con thBase */
                    fontWeight:    700,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color:         active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    padding:       0,
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '4px',
                    transition:    'color 120ms ease',
                    whiteSpace:    'nowrap',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
                {label}
                <span style={{ opacity: active ? 1 : 0.35, fontSize: '11px' }}>
                    {active ? (dir === 'asc' ? '↑' : '↓') : '⇅'}
                </span>
            </button>
        </th>
    );
}

// ── Modal ajuste de stock ─────────────────────────────────────────────────────

function StockAdjustModal({
    producto, onClose, onSave,
}: {
    producto: Producto;
    onClose:  () => void;
    onSave:   (n: number) => void;
}): JSX.Element {
    const [value,   setValue]   = useState(String(producto.stockActual));
    const [saving,  setSaving]  = useState(false);
    const num   = parseInt(value, 10);
    const valid = !isNaN(num) && num >= 0;
    const delta = valid ? num - producto.stockActual : 0;

    async function save() {
        if (!valid) return;
        setSaving(true);
        await onSave(num);
        setSaving(false);
    }

    // Cerrar con Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return createPortal(
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.52)',
                backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            }} />

            {/* Centrador — padding garantiza que la tarjeta nunca toque los bordes */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px', pointerEvents: 'none',
            }}>
                <div onClick={e => e.stopPropagation()} style={{
                    pointerEvents:  'auto',
                    boxSizing:      'border-box',          /* padding incluido en el ancho */
                    width:          'min(480px, 100%)',
                    background:     'var(--bg-surface)',
                    border:         '1px solid var(--border-default)',
                    borderTop:      '3px solid var(--accent-primary)',
                    borderRadius:   '14px',
                    boxShadow:      '0 28px 64px rgba(0,0,0,0.60)',
                    padding:        '28px',
                    animation:      'fadeInUp 0.20s cubic-bezier(0.23,1,0.32,1) both',
                }}>

                    {/* ── Header ── */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
                        <div>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontSize: '14px',
                                fontWeight: 700, letterSpacing: '0.12em',
                                textTransform: 'uppercase', color: 'var(--text-primary)',
                                lineHeight: 1.2,
                            }}>
                                ± Ajustar Stock
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-mono)', fontSize: '12px',
                                color: 'var(--accent-cyan)', marginTop: '5px', letterSpacing: '0.03em',
                            }}>
                                {producto.sku} · {producto.nombre.slice(0, 36)}{producto.nombre.length > 36 ? '…' : ''}
                            </div>
                        </div>
                        <button onClick={onClose} aria-label="Cerrar" style={{
                            flexShrink: 0, width: '36px', height: '36px',
                            background: 'transparent', border: '1px solid var(--border-subtle)',
                            borderRadius: '7px', color: 'var(--text-muted)', cursor: 'pointer',
                            fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 160ms ease',
                        }}
                        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border-accent)'; b.style.color = 'var(--text-secondary)'; }}
                        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border-subtle)'; b.style.color = 'var(--text-muted)'; }}
                        >✕</button>
                    </div>

                    {/* ── Stock actual ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        borderRadius: '10px', padding: '14px 18px', marginBottom: '18px',
                    }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                            Stock actual
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {producto.stockActual}
                        </span>
                    </div>

                    {/* ── Control +/− — grid con columnas fijas para evitar overflow ── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '56px 1fr 56px',
                        gap: '10px',
                        marginBottom: '14px',
                    }}>
                        <button
                            onClick={() => setValue(v => String(Math.max(0, (parseInt(v, 10) || 0) - 1)))}
                            aria-label="Restar uno"
                            style={adjBtn}
                        >−</button>

                        <input
                            type="number" min={0}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') save(); }}
                            autoFocus
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                textAlign: 'center',
                                fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700,
                                color: 'var(--text-primary)', background: 'var(--bg-elevated)',
                                border: '2px solid var(--accent-primary)', borderRadius: '10px',
                                padding: '12px 8px', outline: 'none',
                                caretColor: 'var(--accent-cyan)',
                                boxShadow: '0 0 0 4px rgba(59,130,246,0.14)',
                                transition: 'border-color 160ms ease, box-shadow 160ms ease',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(56,189,248,0.18)'; }}
                            onBlur={e  => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.14)'; }}
                        />

                        <button
                            onClick={() => setValue(v => String((parseInt(v, 10) || 0) + 1))}
                            aria-label="Sumar uno"
                            style={adjBtn}
                        >+</button>
                    </div>

                    {/* ── Delta ── */}
                    <div style={{ minHeight: '22px', textAlign: 'center', marginBottom: '20px' }}>
                        {valid && delta !== 0 && (
                            <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: '13px',
                                color: delta > 0 ? 'var(--accent-primary)' : 'var(--accent-danger)',
                                letterSpacing: '0.02em',
                            }}>
                                {delta > 0 ? `+${delta}` : delta} unidades respecto al actual
                            </span>
                        )}
                    </div>

                    {/* ── Botones de acción ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                        <button onClick={onClose} style={{
                            fontFamily: 'var(--font-display)', fontSize: '12px',
                            fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                            height: '48px', background: 'transparent', color: 'var(--text-secondary)',
                            border: '1px solid var(--border-default)', borderRadius: '8px',
                            cursor: 'pointer', transition: 'all 160ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; }}
                        >
                            Cancelar
                        </button>
                        <button onClick={save} disabled={!valid || saving} style={{
                            fontFamily: 'var(--font-display)', fontSize: '13px',
                            fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                            height: '48px',
                            background: valid && !saving
                                ? 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))'
                                : 'var(--bg-elevated)',
                            color: valid && !saving ? 'var(--text-inverse)' : 'var(--text-muted)',
                            border: 'none', borderRadius: '8px',
                            cursor: valid && !saving ? 'pointer' : 'not-allowed',
                            boxShadow: valid && !saving ? '0 0 18px rgba(59,130,246,0.30)' : 'none',
                            transition: 'all 160ms ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                        }}
                        onMouseEnter={e => { if (valid && !saving) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                        >
                            {saving ? '· Guardando…' : '✓ Guardar'}
                        </button>
                    </div>

                </div>
            </div>
        </>,
        document.body,
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const tdStyle: CSSProperties = {
    padding:       '12px 16px',  /* +2px vertical, +2px horizontal — WCAG AAA */
    verticalAlign: 'middle',
};

const thBase: CSSProperties = {
    padding:       '12px 16px',
    textAlign:     'left',
    fontFamily:    'var(--font-display)',
    fontSize:      '11px',       /* 11px mínimo para uppercase legible         */
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    color:         'var(--text-secondary)', /* AAA vs bg-elevated               */
    whiteSpace:    'nowrap',
    background:    'var(--bg-elevated)',
};

function actionBtn(color: string, opacity = 0.8): CSSProperties {
    return {
        fontFamily:    'var(--font-display)',
        fontSize:      '11px',   /* mínimo legible en etiquetas de acción      */
        fontWeight:    700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding:       '5px 10px', /* +1px vertical → hit target más cómodo   */
        background:    'transparent',
        color,
        border:        `1px solid ${color}`,
        borderRadius:  '4px',
        cursor:        'pointer',
        marginRight:   '5px',
        opacity,
        transition:    'opacity 120ms ease',
    };
}

const adjBtn: CSSProperties = {
    /* alto igual al input (12px padding × 2 + 28px font + 4px border × 2 ≈ 56px) */
    width:          '100%',
    height:         '56px',
    boxSizing:      'border-box',
    borderRadius:   '10px',
    background:     'var(--bg-elevated)',
    border:         '1px solid var(--border-default)',
    color:          'var(--text-primary)',
    fontFamily:     'var(--font-mono)',
    fontSize:       '22px',
    fontWeight:     700,
    lineHeight:     1,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    transition:     'border-color 140ms ease, background 140ms ease',
};
