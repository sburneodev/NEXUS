/**
 * pages/ProductosPage.tsx — SUFP reference implementation
 *
 * Demuestra la integración completa del Sistema Universal de Filtrado
 * y Paginación (SUFP):
 *
 *   1. useTableFilters  → estado centralizado (search/limit/page/sort)
 *   2. TableControls    → barra de búsqueda + selector de filas + paginación
 *   3. SkeletonRows     → skeleton loader en el <tbody> durante la carga
 *   4. useEffect        → dispara petición GET server-side en cada cambio
 *                         de `filters.querySignal` o de `filterTipo`
 *
 * Flujo de datos:
 *   input del usuario → debounce 300ms → querySignal cambia
 *   → useEffect dispara GET /productos?page=0&size=20&search=xxx
 *   → respuesta: data.content → setRows / data.totalElements → setPagination
 *
 * Fallback: si el backend no está disponible, filtra MOCK_PRODUCTOS
 * localmente con la misma lógica server-side (útil en desarrollo).
 */

import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties }               from 'react';
import type { Producto, TipoProducto, PaginatedResponse } from '../types/models';
import { useTableFilters }                               from '../hooks/useTableFilters';
import { TableControls, SkeletonRows }                  from '../components/table/TableControls';
import { ProductModal }                                  from '../components/productos/ProductModal';
import { MOCK_PRODUCTOS }                               from '../mocks/mockProductos';
import api                                              from '../services/api';

// ── Helper: simulación server-side sobre datos mock ──────────────────────────
// Se usa como fallback cuando el backend no está disponible.
// En producción solo se usa el API real; este bloque se puede eliminar.
function simulateServerFilter(
    data:   Producto[],
    search: string,
    tipo:   TipoProducto | 'TODOS',
    page:   number,
    size:   number,
): { content: Producto[]; totalElements: number; totalPages: number } {
    const q = search.toLowerCase();

    const filtered = data.filter(p => {
        const matchSearch = !q
            || p.nombre.toLowerCase().includes(q)
            || p.sku.toLowerCase().includes(q);
        const matchTipo = tipo === 'TODOS' || p.tipoProducto === tipo;
        return matchSearch && matchTipo;
    });

    const totalElements = filtered.length;
    const totalPages    = Math.ceil(totalElements / size) || 1;
    const content       = filtered.slice(page * size, (page + 1) * size);

    return { content, totalElements, totalPages };
}

// ── Página ────────────────────────────────────────────────────────────────────

export function ProductosPage(): JSX.Element {

    // ── SUFP — estado de filtrado centralizado ────────────────────────────────
    const filters = useTableFilters({ key: 'productos', initialLimit: 20 });

    // Desestructuramos las funciones estables (useCallback) para declararlas
    // como dependencias del useEffect sin provocar re-renders innecesarios.
    const { buildParams, setPagination, search: activeSearch, page: activePage, limit: activeLimit } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,       setRows]       = useState<Producto[]>([]);
    const [isLoading,  setIsLoading]  = useState(true);
    const [filterTipo, setFilterTipo] = useState<TipoProducto | 'TODOS'>('TODOS');
    const [modalOpen,  setModalOpen]  = useState(false);
    const [selected,   setSelected]   = useState<Producto | null>(null);

    // Dataset local para operaciones CRUD optimistas (mock o caché local).
    // Cuando cambia (handleSave / handleDelete), el useEffect se re-ejecuta
    // automáticamente porque `localData` está en su array de dependencias.
    const [localData, setLocalData] = useState<Producto[]>(MOCK_PRODUCTOS);

    // ── Fetching server-side ──────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const params = buildParams();
        // Filtros adicionales fuera del hook (tipo de producto)
        if (filterTipo !== 'TODOS') params.set('tipo', filterTipo);

        api.get<PaginatedResponse<Producto>>(`/productos?${params.toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    setRows(data.content);
                    setPagination(data.totalElements, data.totalPages);
                }
            })
            .catch(() => {
                // Fallback: filtrado local sobre MOCK_PRODUCTOS
                if (!cancelled) {
                    const result = simulateServerFilter(
                        localData, activeSearch, filterTipo, activePage, activeLimit
                    );
                    setRows(result.content);
                    setPagination(result.totalElements, result.totalPages);
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return (): void => { cancelled = true; };
    }, [
        filters.querySignal, // ← se actualiza cuando search/page/limit/sort cambian
        filterTipo,          // ← filtro extra fuera del hook
        buildParams,
        setPagination,
        activeSearch,
        activePage,
        activeLimit,
        localData,           // ← al editar/borrar localmente, re-filtra automáticamente
    ]);

    // ── Handlers CRUD ─────────────────────────────────────────────────────────

    const handleSave = useCallback((
        data: Omit<Produto, 'id' | 'creadoEn' | 'actualizadoEn'>
    ): void => {
        setLocalData(prev => {
            if (selected) {
                // Edición: actualiza el elemento existente
                return prev.map(p => p.id === selected.id ? { ...p, ...data } : p);
            }
            // Alta: prepend con id temporal
            const newProduct: Produto = {
                ...data,
                id:           Date.now(),
                creadoEn:     new Date().toISOString(),
                actualizadoEn: new Date().toISOString(),
            };
            return [newProduct, ...prev];
        });
        setModalOpen(false);
        setSelected(null);
    }, [selected]);

    const handleDelete = useCallback((id: number): void => {
        if (window.confirm('¿Eliminar este produto?')) {
            setLocalData(prev => prev.filter(p => p.id !== id));
        }
    }, []);

    const openNew  = (): void => { setSelected(null);  setModalOpen(true); };
    const openEdit = (p: Produto): void => { setSelected(p); setModalOpen(true); };

    // ── Renderer de badge de stock ────────────────────────────────────────────
    const stockBadge = (p: Produto): JSX.Element => {
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
            {/* ── Cabecera ─────────────────────────────────────────────── */}
            <div style={{
                display:        'flex',
                alignItems:     'flex-start',
                justifyContent: 'space-between',
                marginBottom:   '20px',
                flexWrap:       'wrap',
                gap:            '12px',
            }}>
                <div>
                    <h1 style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '1.5rem',
                        fontWeight:    700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color:         'var(--text-primary)',
                        marginBottom:  '4px',
                    }}>
                        Productos
                    </h1>
                    <p style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '12px',
                        color:         'var(--text-muted)',
                        letterSpacing: '0.04em',
                    }}>
                        Gestión de catálogo y stock
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="btn btn-primary"
                    style={{ letterSpacing: '0.12em', fontSize: '12px', flexShrink: 0 }}
                >
                    + AÑADIR PRODUCTO
                </button>
            </div>

            {/* ── TableControls: buscador · tipo · filas · paginación ───── */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="producto"
                    extraFilters={
                        <select
                            value={filterTipo}
                            onChange={e => {
                                setFilterTipo(e.target.value as TipoProducto | 'TODOS');
                                filters.setPage(0); // resetea página al cambiar tipo
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
                                padding:       '8px 12px',
                                outline:       'none',
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
                            {/* Skeleton loader durante carga */}
                            {isLoading && <SkeletonRows rows={filters.limit > 8 ? 8 : filters.limit} cols={7} />}

                            {/* Estado vacío */}
                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        style={{
                                            padding:       '48px',
                                            textAlign:     'center',
                                            fontFamily:    'var(--font-mono)',
                                            fontSize:      '12px',
                                            color:         'var(--text-muted)',
                                            letterSpacing: '0.08em',
                                        }}
                                    >
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN PRODUCTOS'}
                                    </td>
                                </tr>
                            )}

                            {/* Filas de datos */}
                            {!isLoading && rows.map(p => (
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
                                            title="Editar producto"
                                        >EDITAR</button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            style={actionBtnStyle('#cc2244')}
                                            title="Eliminar producto"
                                        >ELIMINAR</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal ────────────────────────────────────────────────── */}
            <ProductModal
                produto={selected}
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
