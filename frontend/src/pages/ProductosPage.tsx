/**
 * pages/ProductosPage.tsx — SUFP v3
 *
 * Gestión de productos con filtrado y paginación server-side.
 * · GET /api/productos?buscar=&tipo=&page=&size=
 * · useTableFilters v3 + TableControls (sistema universal NEXUS)
 * · Debounce sin bucles: el useEffect depende de filters.querySignal
 *   (= debouncedSearch · page · limit · sort), NUNCA del raw input.
 * · sessionStorage persiste page, limit y search al navegar
 */

import { useState, useEffect, useCallback, CSSProperties } from 'react';
import type { Producto, TipoProducto, PaginatedResponse } from '../types/models';
import { ProductModal }                from '../components/productos/ProductModal';
import { useTableFilters, calculateAutoLimit } from '../hooks/useTableFilters';
import { TableControls, SkeletonRows } from '../components/table/TableControls';
import { productoService }             from '../services/productoService';
import api                             from '../services/api';

// ── Página ────────────────────────────────────────────────────────────────────

export function ProductosPage(): JSX.Element {

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'productos', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination } = filters;

    // ── Estado local ─────────────────────────────────────────────────────────
    const [rows,        setRows]        = useState<Producto[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [filterTipo,  setFilterTipo]  = useState<TipoProducto | 'TODOS'>('TODOS');
    const [modalOpen,   setModalOpen]   = useState(false);
    const [selected,    setSelected]    = useState<Producto | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const refresh = useCallback(() => setRefreshTick(t => t + 1), []);

    // ── Fetch server-side ─────────────────────────────────────────────────────
    // Dependencias explícitas del flujo debounce:
    //   · filters.querySignal  = debouncedSearch § page § limit § sort
    //     (NUNCA el searchInput crudo → cero peticiones intermedias por tecla)
    //   · filterTipo           = filtro local de tipo de producto
    //   · refreshTick          = invalidación manual tras crear/editar/eliminar
    // buildParams y setPagination son useCallback estables sincronizados con
    // querySignal; se excluyen de deps deliberadamente para evitar doble ejecución.
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const params = buildParams();
        if (filterTipo !== 'TODOS') params.set('tipo', filterTipo);

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
    }, [filters.querySignal, filterTipo, refreshTick]);

    // ── Guardar (crear o editar) ──────────────────────────────────────────────
    const handleSave = useCallback(async (
        data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>,
    ): Promise<void> => {
        try {
            if (selected) {
                await productoService.editar(selected.id, data as any);
            } else {
                await productoService.crear(data as any);
                filters.setPage(0); // tras crear, volvemos a página 1
            }
            setModalOpen(false);
            setSelected(null);
            refresh();
        } catch (err) {
            console.error('Error guardando producto:', err);
        }
    }, [selected, filters, refresh]);

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

    const openNew  = (): void => { setSelected(null); setModalOpen(true); };
    const openEdit = (p: Producto): void => { setSelected(p); setModalOpen(true); };

    // ── Badge de stock ────────────────────────────────────────────────────────
    const stockBadge = (p: Producto): JSX.Element => {
        const critico = p.stockActual <= p.stockMinimo;
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
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>

            {/* ── Cabecera ──────────────────────────────────────────────── */}
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
                    onClick={openNew}
                    className="btn btn-primary"
                    style={{ letterSpacing: '0.10em', fontSize: '11px', padding: '6px 14px', flexShrink: 0 }}
                >
                    + AÑADIR PRODUCTO
                </button>
            </div>

            {/* ── TableControls: búsqueda · tipo · filas · paginación ──── */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="producto"
                    entityLabelPlural="productos"
                    searchPlaceholder="Buscar por nombre, SKU o descripción..."
                    extraFilters={
                        <select
                            value={filterTipo}
                            aria-label="Filtrar por tipo de producto"
                            onChange={e => {
                                setFilterTipo(e.target.value as TipoProducto | 'TODOS');
                                filters.setPage(0);
                            }}
                            style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '12px',
                                fontWeight:    600,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color:         'var(--text-primary)',
                                background:    'var(--bg-surface)',
                                border:        '1px solid var(--border-default)',
                                borderRadius:  '6px',
                                padding:       '9px 12px',
                                cursor:        'pointer',
                                flexShrink:    0,
                            }}
                        >
                            <option value="TODOS">Todos los tipos</option>
                            <option value="ESTANDAR">ESTÁNDAR</option>
                            <option value="RETRO">RETRO — La Bóveda</option>
                        </select>
                    }
                />
            </div>

            {/* ── Tabla ─────────────────────────────────────────────────── */}
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
                                {['SKU', 'Nombre', 'Tipo', 'Precio Venta', 'Stock', 'Estado', 'Acciones'].map(h => (
                                    <th key={h} style={{
                                        padding:       '10px 14px',
                                        textAlign:     'left',
                                        fontFamily:    'var(--font-display)',
                                        fontSize:      '10px',
                                        fontWeight:    700,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color:         'var(--text-muted)',
                                        whiteSpace:    'nowrap',
                                        background:    'var(--bg-elevated)',
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <SkeletonRows rows={Math.min(filters.limit, 10)} cols={7} />
                            ) : rows.length === 0 ? (
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
                                            : 'SIN PRODUCTOS'}
                                    </td>
                                </tr>
                            ) : rows.map(p => (
                                <tr
                                    key={p.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-subtle)',
                                        transition:   'background 120ms ease',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
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
                                    <td style={tdStyle}>
                                        <div style={{
                                            fontFamily: 'var(--font-body)',
                                            fontSize:   '13px',
                                            color:      'var(--text-primary)',
                                            fontWeight: 500,
                                        }}>
                                            {p.nombre}
                                        </div>
                                        {p.descripcion && (
                                            <div style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   '10px',
                                                color:      'var(--text-muted)',
                                                marginTop:  '2px',
                                            }}>
                                                {p.descripcion.slice(0, 50)}{p.descripcion.length > 50 ? '…' : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            fontFamily:    'var(--font-mono)',
                                            fontSize:      '10px',
                                            letterSpacing: '0.06em',
                                            color:         p.tipoProducto === 'RETRO'
                                                ? 'var(--accent-gold)'
                                                : 'var(--text-secondary)',
                                            border:        `1px solid ${p.tipoProducto === 'RETRO'
                                                ? 'var(--accent-gold)'
                                                : 'var(--border-default)'}`,
                                            borderRadius:  '3px',
                                            padding:       '2px 6px',
                                        }}>
                                            {p.tipoProducto}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize:   '13px',
                                            color:      'var(--text-primary)',
                                            fontWeight: 600,
                                        }}>
                                            €{p.precioVenta.toFixed(2)}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{stockBadge(p)}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            fontFamily:    'var(--font-mono)',
                                            fontSize:      '10px',
                                            color:         p.activo
                                                ? 'var(--accent-primary)'
                                                : 'var(--text-muted)',
                                            letterSpacing: '0.06em',
                                        }}>
                                            {p.activo ? '● ACTIVO' : '○ INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                        <button
                                            onClick={() => openEdit(p)}
                                            style={actionBtnStyle('#0088cc')}
                                            aria-label={`Editar ${p.nombre}`}
                                        >
                                            EDITAR
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            style={actionBtnStyle('#cc2244')}
                                            aria-label={`Eliminar ${p.nombre}`}
                                        >
                                            ELIMINAR
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal ─────────────────────────────────────────────────── */}
            <ProductModal
                producto={selected}
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelected(null); }}
                onSave={handleSave}
            />
        </div>
    );
}

// ── Estilos reutilizables ─────────────────────────────────────────────────────

const tdStyle: CSSProperties = {
    padding:       '10px 14px',
    verticalAlign: 'middle',
};

function actionBtnStyle(color: string): CSSProperties {
    return {
        fontFamily:    'var(--font-display)',
        fontSize:      '10px',
        fontWeight:    700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding:       '4px 10px',
        background:    'transparent',
        color,
        border:        `1px solid ${color}`,
        borderRadius:  '4px',
        cursor:        'pointer',
        marginRight:   '6px',
        opacity:       0.75,
        transition:    'opacity 120ms ease',
    };
}
