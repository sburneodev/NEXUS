/**
 * pages/BovedaRetroPage.tsx — SUFP v2
 *
 * Catálogo de piezas retro con búsqueda + paginación server-side.
 * · GET /api/productos?tipo=RETRO&buscar=&page=&size=
 * · Fallback: filtrado local sobre MOCK_PRODUCTOS cuando el backend no responde.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Producto, EstadoConservacion, PaginatedResponse } from '../types/models';
import { MOCK_PRODUCTOS }      from '../mocks/mockProductos';
import { TasadorIA }           from '../components/boveda/TasadorIA';
import { ProductModal }        from '../components/productos/ProductModal';
import type { ProductForm }    from '../components/productos/ProductModal';
import { useTableFilters }     from '../hooks/useTableFilters';
import { TableControls }       from '../components/table/TableControls';
import api                     from '../services/api';

// ── Badge de conservación ─────────────────────────────────────────────────────
const BADGE_MAP: Record<EstadoConservacion, { label: string; color: string }> = {
    MINT:    { label: '★ MINT',    color: 'var(--accent-primary)' },
    CIB:     { label: '◈ CIB',     color: 'var(--accent-cyan)'    },
    LOOSE:   { label: '◎ LOOSE',   color: 'var(--text-secondary)' },
    LOOSE_D: { label: '▲ LOOSE-D', color: 'var(--accent-danger)'  },
};

// ── Helper: filtrado local como fallback ──────────────────────────────────────
function simulateFilter(
    data:   Producto[],
    search: string,
    estado: EstadoConservacion | 'TODOS',
    page:   number,
    size:   number,
): { content: Producto[]; totalElements: number; totalPages: number } {
    const q = search.toLowerCase();
    const filtered = data.filter(p => {
        const matchSearch = !q
            || p.nombre.toLowerCase().includes(q)
            || p.sku.toLowerCase().includes(q);
        const matchEstado = estado === 'TODOS' || p.estadoConservacion === estado;
        return matchSearch && matchEstado;
    });
    const totalElements = filtered.length;
    const totalPages    = Math.ceil(totalElements / size) || 1;
    return { content: filtered.slice(page * size, (page + 1) * size), totalElements, totalPages };
}

// ── Tarjeta de pieza retro ────────────────────────────────────────────────────
function RetroCard({ producto: p }: { producto: Producto }): JSX.Element {
    const badge      = p.estadoConservacion ? BADGE_MAP[p.estadoConservacion] : null;
    const attrs      = p.atributosEspecificos as Record<string, unknown> | null;
    const plataforma = attrs?.['plataforma'] as string | undefined;
    const anio       = attrs?.['anio']       as number | undefined;
    const tasacion   = attrs?.['tasacion_ia_eur'] as number | undefined;

    return (
        <div className="card" style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           'var(--space-3)',
            cursor:        'default',
            position:      'relative',
            overflow:      'hidden',
            opacity:       p.activo ? 1 : 0.55,
        }}>
            {/* Borde superior degradado */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))' }} />

            {/* Overlay vendido */}
            {!p.activo && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,10,0.75)', zIndex: 2, backdropFilter: 'blur(2px)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--accent-danger)', border: '2px solid var(--accent-danger)', padding: '4px 16px', transform: 'rotate(-12deg)' }}>VENDIDO</span>
                </div>
            )}

            {/* SKU + badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>{p.sku}</span>
                {badge && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: badge.color, border: `1px solid ${badge.color}`, borderRadius: '3px', padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{badge.label}</span>
                )}
            </div>

            {/* Nombre + plataforma */}
            <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{p.nombre}</h3>
                {plataforma && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 'var(--space-1)' }}>{plataforma}{anio ? ` · ${anio}` : ''}</div>
                )}
            </div>

            {/* Descripción */}
            {p.descripcion && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, flex: 1 }}>{p.descripcion}</p>
            )}

            {/* Precio + tasación IA */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '-0.02em', textShadow: '0 0 16px rgba(0,255,136,0.3)' }}>€{p.precioVenta.toFixed(2)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>PVP</span>
                </div>
                {tasacion && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '3px' }}>
                        Tasación IA: €{tasacion.toFixed(2)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function BovedaRetroPage(): JSX.Element {

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'boveda', initialLimit: 20 });
    const { buildParams, setPagination, search: activeSearch, page: activePage, limit: activeLimit } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,       setRows]       = useState<Producto[]>([]);
    const [isLoading,  setIsLoading]  = useState(true);
    const [filterEstado, setFilterEstado] = useState<EstadoConservacion | 'TODOS'>('TODOS');
    const [modalOpen,  setModalOpen]  = useState(false);
    const [prefill,    setPrefill]    = useState<Partial<ProductForm> | undefined>(undefined);

    // Dataset local (mock) para el fallback de filtrado
    const [localData] = useState<Producto[]>(
        MOCK_PRODUCTOS.filter(p => p.tipoProducto === 'RETRO')
    );

    // ── Fetch server-side ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const params = buildParams();
        params.set('tipo', 'RETRO');
        if (filterEstado !== 'TODOS') params.set('estado', filterEstado);

        api.get<PaginatedResponse<Producto>>(`/productos?${params.toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    setRows(data.content);
                    setPagination(data.totalElements, data.totalPages);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    const result = simulateFilter(localData, activeSearch, filterEstado, activePage, activeLimit);
                    setRows(result.content);
                    setPagination(result.totalElements, result.totalPages);
                }
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return (): void => { cancelled = true; };
    }, [
        filters.querySignal,
        filterEstado,
        buildParams,
        setPagination,
        activeSearch,
        activePage,
        activeLimit,
        localData,
    ]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    function handleRegistrar(data: Partial<ProductForm>): void {
        setPrefill(data);
        setModalOpen(true);
    }

    const handleSave = useCallback((
        data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn'>
    ): void => {
        // En un caso real haríamos api.post('/productos', data)
        // Por ahora solo cerramos el modal
        setModalOpen(false);
        setPrefill(undefined);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ background: 'var(--bg-base)', minHeight: '100%' }}>

            {/* Tasador IA */}
            <TasadorIA onRegistrar={handleRegistrar} />

            {/* Cabecera catálogo */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>◆</span>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        La Bóveda{' '}
                        <span style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Retro</span>
                    </h1>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Coleccionismo desde 1978
                </p>
            </div>

            {/* TableControls: búsqueda · estado · filas · paginación */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="pieza"
                    entityLabelPlural="piezas"
                    searchPlaceholder="Buscar por nombre o SKU..."
                    extraFilters={
                        <select
                            value={filterEstado}
                            onChange={e => {
                                setFilterEstado(e.target.value as EstadoConservacion | 'TODOS');
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
                                padding:       '8px 12px',
                                outline:       'none',
                                cursor:        'pointer',
                                flexShrink:    0,
                            }}
                        >
                            <option value="TODOS">Todos los estados</option>
                            <option value="MINT">MINT</option>
                            <option value="CIB">CIB</option>
                            <option value="LOOSE">LOOSE</option>
                            <option value="LOOSE_D">LOOSE-D</option>
                        </select>
                    }
                />
            </div>

            {/* Grid de piezas */}
            {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
                    {Array.from({ length: Math.min(filters.limit, 8) }).map((_, i) => (
                        <div key={i} className="card" style={{ minHeight: '220px', background: 'var(--bg-surface)' }}>
                            <div style={{ height: '12px', width: '40%', borderRadius: '3px', background: 'var(--bg-overlay)', animation: 'skPulse 1.4s ease-in-out infinite', animationDelay: `${i * 80}ms`, marginBottom: '12px' }} />
                            <div style={{ height: '16px', width: '75%', borderRadius: '3px', background: 'var(--bg-overlay)', animation: 'skPulse 1.4s ease-in-out infinite', animationDelay: `${i * 80 + 40}ms`, marginBottom: '8px' }} />
                            <div style={{ height: '11px', width: '55%', borderRadius: '3px', background: 'var(--bg-overlay)', animation: 'skPulse 1.4s ease-in-out infinite', animationDelay: `${i * 80 + 80}ms` }} />
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    {filters.search
                        ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                        : 'SIN PIEZAS ENCONTRADAS'}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
                    {rows.map(p => <RetroCard key={p.id} producto={p} />)}
                </div>
            )}

            {/* Modal de alta precargado */}
            <ProductModal
                produto={null}
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setPrefill(undefined); }}
                onSave={handleSave}
                initialValues={prefill}
            />
        </div>
    );
}
