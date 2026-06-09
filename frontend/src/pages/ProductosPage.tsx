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
import { useLocation }                                                     from 'react-router-dom';
import { Boxes, Pencil, Trash2 }                                           from 'lucide-react';
import type { Producto, TipoProducto, PaginatedResponse }                  from '../types/models';
import { ProductFormPanel }                                                 from '../components/productos/ProductFormPanel';
import { useTableFilters, calculateAutoLimit }                              from '../hooks/useTableFilters';
import { TableControls, SkeletonRows }                                     from '../components/table/TableControls';
import { productoService }                                                  from '../services/productoService';
import api                                                                  from '../services/api';
import { MovimientoDrawer }                                                 from '../components/stock/MovimientoDrawer';
import { ActionIconBtn }                                                    from '../components/ui/ActionIconBtn';

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
    const [refreshTick, setRefreshTick] = useState(0);
    const [drawerOpen,     setDrawerOpen]     = useState(false);
    const [drawerProducto, setDrawerProducto] = useState<Producto | null>(null);
    const [confirmId,      setConfirmId]      = useState<number | null>(null);

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
        // Los productos RETRO siempre tienen stock 1 (pieza única) — no deben
        // aparecer en "Stock Bajo"; ese filtro es exclusivo de productos ESTÁNDAR.
        if (chip === 'stockBajo')  { params.set('stockBajo', 'true'); params.set('tipo', 'ESTANDAR'); }
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
        if (chip === 'stockBajo')  return rows.filter(p => p.stockActual <= p.stockMinimo && p.tipoProducto !== 'RETRO');
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

    // ── Soft delete (sin window.confirm — confirmación inline en la fila) ────────
    const handleSoftDelete = useCallback(async (p: Producto): Promise<void> => {
        try {
            await productoService.editar(p.id, { ...p, activo: false } as any);
            setConfirmId(null);
            refresh();
        } catch {
            console.error('Error desactivando producto');
        }
    }, [refresh]);

    // Escape cierra la confirmación inline
    useEffect(() => {
        if (!confirmId) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmId(null); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [confirmId]);

    // ── Drawer de stock ───────────────────────────────────────────────────────
    const openStockDrawer = (p: Producto): void => { setDrawerProducto(p); setDrawerOpen(true); };
    const closeStockDrawer = (): void => { setDrawerOpen(false); setTimeout(() => setDrawerProducto(null), 320); };
    const handleMovimientoSaved = useCallback((_id: number, _stock: number) => { refresh(); }, [refresh]);

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
                                                {confirmId === p.id ? (
                                                    /* ── Confirmación inline ── */
                                                    <div style={{
                                                        display:     'flex',
                                                        alignItems:  'center',
                                                        gap:         '6px',
                                                        animation:   'fadeIn 120ms ease',
                                                    }}>
                                                        <span style={{
                                                            fontFamily:    'var(--font-mono)',
                                                            fontSize:      '11px',
                                                            color:         '#f87171',
                                                            letterSpacing: '0.04em',
                                                            paddingRight:  '2px',
                                                        }}>
                                                            ¿Inactivar?
                                                        </span>
                                                        <button
                                                            onClick={() => handleSoftDelete(p)}
                                                            style={{
                                                                fontFamily:    'var(--font-display)',
                                                                fontSize:      '10px',
                                                                fontWeight:    700,
                                                                letterSpacing: '0.08em',
                                                                padding:       '4px 10px',
                                                                border:        '1px solid #dc2626',
                                                                borderRadius:  '4px',
                                                                background:    'rgba(220,38,38,0.14)',
                                                                color:         '#f87171',
                                                                cursor:        'pointer',
                                                                transition:    'all 120ms ease',
                                                            }}
                                                            onMouseEnter={e => {
                                                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.28)';
                                                                (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5';
                                                            }}
                                                            onMouseLeave={e => {
                                                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.14)';
                                                                (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                                                            }}
                                                        >
                                                            ✓ Sí
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmId(null)}
                                                            style={{
                                                                fontFamily:    'var(--font-display)',
                                                                fontSize:      '10px',
                                                                fontWeight:    700,
                                                                letterSpacing: '0.08em',
                                                                padding:       '4px 10px',
                                                                border:        '1px solid var(--border-default)',
                                                                borderRadius:  '4px',
                                                                background:    'transparent',
                                                                color:         'var(--text-muted)',
                                                                cursor:        'pointer',
                                                                transition:    'all 120ms ease',
                                                            }}
                                                            onMouseEnter={e => {
                                                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)';
                                                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                                                            }}
                                                            onMouseLeave={e => {
                                                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                                                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                                                            }}
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* ── Botones normales ── */
                                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                        <ActionIconBtn
                                                            icon={Boxes}
                                                            color="primary"
                                                            title="Gestionar stock"
                                                            onClick={() => openStockDrawer(p)}
                                                        />
                                                        <ActionIconBtn
                                                            icon={Pencil}
                                                            color="cyan"
                                                            title={`Editar ${p.nombre}`}
                                                            onClick={() => openEdit(p)}
                                                        />
                                                        <ActionIconBtn
                                                            icon={Trash2}
                                                            color="danger"
                                                            title={`Inactivar ${p.nombre}`}
                                                            onClick={() => setConfirmId(p.id)}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <MovimientoDrawer
                open={drawerOpen}
                producto={drawerProducto}
                onClose={closeStockDrawer}
                onSaved={handleMovimientoSaved}
            />
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
