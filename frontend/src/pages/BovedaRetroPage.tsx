/**
 * pages/BovedaRetroPage.tsx — v4
 *
 * Mismo estilo que el resto de la app (Rajdhani + JetBrains Mono, vars CSS globales).
 * Catálogo en tabla con filas expandibles en lugar de tarjetas grandes.
 */

import { useState, useEffect, useCallback } from 'react';
import { Pencil }              from 'lucide-react';
import type { Producto, EstadoConservacion, PaginatedResponse } from '../types/models';
import { MOCK_PRODUCTOS }      from '../mocks/mockProductos';
import { TasadorIA }           from '../components/boveda/TasadorIA';
import { ProductFormPanel }    from '../components/productos/ProductFormPanel';
import type { ProductForm }    from '../components/productos/ProductModal';
import { useTableFilters, calculateAutoLimit } from '../hooks/useTableFilters';
import { TableControls, SkeletonRows } from '../components/table/TableControls';
import { productoService }     from '../services/productoService';
import api from '../services/api';
import { ActionIconBtn }       from '../components/ui/ActionIconBtn';

// ── Constantes de estado de conservación ─────────────────────────────────────

type EstadoKey = EstadoConservacion | 'TODOS';
type ActivoKey = 'TODOS' | 'ACTIVOS' | 'VENDIDOS';
type SortField  = 'nombre' | 'precioVenta';
type SortDir    = 'asc' | 'desc';

const ESTADO_META: Record<EstadoKey, { label: string; color: string; desc: string }> = {
    TODOS:   { label: 'Todos',  color: 'var(--text-muted)',    desc: '' },
    MINT:    { label: 'MINT',   color: '#ffd700',              desc: 'Precintado de fábrica — nunca abierto' },
    CIB:     { label: 'CIB',    color: 'var(--accent-primary)',desc: 'Complete In Box — caja, cartucho y manual' },
    LOOSE:   { label: 'LOOSE',  color: 'var(--accent-gold)',   desc: 'Solo cartucho o disco, sin caja ni manual' },
    LOOSE_D: { label: 'DMG',    color: 'var(--accent-danger)', desc: 'Con daños visibles en caja o cartucho' },
};

// ── Fallback filtrado local ───────────────────────────────────────────────────
function simulateFilter(
    data: Producto[], search: string,
    estado: EstadoKey, activo: ActivoKey, page: number, size: number,
): { content: Producto[]; totalElements: number; totalPages: number } {
    const q = search.toLowerCase();
    const filtered = data.filter(p => {
        const matchSearch = !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        const matchEstado = estado === 'TODOS' || p.estadoConservacion === estado;
        // Usamos stockActual como fuente de verdad para retro vendido (stock=0),
        // en lugar de p.activo que puede no estar actualizado tras un movimiento.
        const esVendido   = p.stockActual === 0;
        const matchActivo = activo === 'TODOS'
            || (activo === 'ACTIVOS' ? !esVendido : esVendido);
        return matchSearch && matchEstado && matchActivo;
    });
    return {
        content: filtered.slice(page * size, (page + 1) * size),
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size) || 1,
    };
}

// ── Chip de filtro ────────────────────────────────────────────────────────────
function FilterChip({
    label, color, active, onClick, onMouseEnter, onMouseLeave,
}: {
    label: string; color: string; active: boolean;
    onClick: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                fontFamily:    'var(--font-display)',
                fontSize:      '10px',
                fontWeight:    700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color:         active ? 'var(--text-inverse)' : 'var(--text-secondary)',
                background:    active ? color : 'transparent',
                border:        `1px solid ${active ? color : 'var(--border-default)'}`,
                borderRadius:  'var(--radius-base)',
                padding:       '4px 10px',
                cursor:        'pointer',
                transition:    'all 150ms var(--ease-out)',
                whiteSpace:    'nowrap',
            }}
            onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = color;
                onMouseEnter?.();
            }}
            onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                onMouseLeave?.();
            }}
        >
            {label}
        </button>
    );
}

// ── Fila expandida con detalle completo ───────────────────────────────────────
function DetailRow({ p, onEdit }: { p: Producto; onEdit: () => void }) {
    const attrs     = p.atributosEspecificos as Record<string, unknown> | null;
    const anio      = attrs?.['anio']            as number | undefined;
    const tasacion  = attrs?.['tasacion_ia_eur'] as number | undefined;
    const plataforma= attrs?.['plataforma']      as string | undefined;

    return (
        <tr>
            <td colSpan={7} style={{ padding: 0, borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{
                    background:   'var(--bg-elevated)',
                    padding:      '16px 20px 16px 44px',
                    display:      'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap:          '16px',
                    borderTop:    '1px solid var(--border-subtle)',
                    animation:    'fadeInUp 160ms var(--ease-out) both',
                }}>
                    {p.descripcion && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Descripción</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.descripcion}</div>
                        </div>
                    )}

                    {plataforma && (
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Plataforma</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{plataforma}{anio ? ` · ${anio}` : ''}</div>
                        </div>
                    )}

                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Precio venta</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--accent-gold)' }}>€{p.precioVenta.toFixed(2)}</div>
                    </div>

                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Precio coste</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>€{p.precioCoste.toFixed(2)}</div>
                    </div>

                    {tasacion !== undefined && (
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Tasación IA</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)' }}>€{tasacion.toFixed(2)}</div>
                        </div>
                    )}

                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Stock</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{p.stockActual} ud.</div>
                    </div>

                    {/* Botón editar — esquina derecha del panel */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <ActionIconBtn
                            icon={Pencil}
                            color="gold"
                            title="Editar pieza retro"
                            onClick={e => { e.stopPropagation(); onEdit(); }}
                        />
                    </div>
                </div>
            </td>
        </tr>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export function BovedaRetroPage(): JSX.Element {

    const filters = useTableFilters({ key: 'boveda', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination, search: activeSearch, page: activePage, limit: activeLimit } = filters;

    const [rows,         setRows]         = useState<Producto[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [filterEstado, setFilterEstado] = useState<EstadoKey>('TODOS');
    const [filterActivo, setFilterActivo] = useState<ActivoKey>('ACTIVOS');
    const [expandedId,      setExpandedId]      = useState<number | null>(null);
    const [hoveredEstado,   setHoveredEstado]   = useState<EstadoKey | null>(null);
    const [sortField,       setSortField]       = useState<SortField | null>(null);
    const [sortDir,         setSortDir]         = useState<SortDir>('asc');

    const toggleSort = (field: SortField): void => {
        if (sortField !== field) {
            setSortField(field); setSortDir('asc');
        } else if (sortDir === 'asc') {
            setSortDir('desc');
        } else {
            setSortField(null);
        }
        filters.setPage(0);
    };
    const [editOpen,     setEditOpen]     = useState(false);
    const [selected,     setSelected]     = useState<Producto | null>(null);
    const [prefillData,  setPrefillData]  = useState<Partial<ProductForm> | null>(null);
    const [saveError,    setSaveError]    = useState<string | null>(null);
    const [localData]                     = useState<Producto[]>(MOCK_PRODUCTOS.filter(p => p.tipoProducto === 'RETRO'));

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const params = buildParams();
        params.set('tipo', 'RETRO');
        if (filterEstado !== 'TODOS') params.set('estado', filterEstado);
        params.set('sort', sortField ? `${sortField},${sortDir}` : 'id,desc');
        // No enviamos ?activo al backend porque el backend puede no actualizar
        // ese campo al hacer movimientos de stock. La distinción DISPONIBLE/VENDIDO
        // se hace client-side mediante stockActual === 0.

        api.get<PaginatedResponse<Producto>>(`/productos?${params.toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    const filtered = data.content.filter(p => {
                        const matchEstado = filterEstado === 'TODOS' || p.estadoConservacion === filterEstado;
                        const esVendido   = p.stockActual === 0;
                        const matchActivo = filterActivo === 'TODOS'
                            || (filterActivo === 'ACTIVOS' ? !esVendido : esVendido);
                        return matchEstado && matchActivo;
                    });
                    const hasFilter = filterEstado !== 'TODOS' || filterActivo !== 'TODOS';
                    setRows(filtered);
                    setPagination(
                        hasFilter ? filtered.length : data.totalElements,
                        hasFilter ? (Math.ceil(filtered.length / activeLimit) || 1) : data.totalPages,
                    );
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    const r = simulateFilter(localData, activeSearch, filterEstado, filterActivo, activePage, activeLimit);
                    setRows(r.content);
                    setPagination(r.totalElements, r.totalPages);
                    setIsLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, [filters.querySignal, filterEstado, filterActivo, sortField, sortDir, buildParams, setPagination, activeSearch, activePage, activeLimit, localData]);

    function handleRegistrar(data: Partial<ProductForm>): void {
        // Tasador IA: pre-rellena el formulario con los datos de la tasación
        setPrefillData(data);
        setSelected(null);
        setEditOpen(true);
    }
    function handleOpenNew(): void  { setPrefillData(null); setSelected(null); setEditOpen(true); }
    function handleOpenEdit(p: Producto): void { setPrefillData(null); setSelected(p); setEditOpen(true); }
    function closeEdit(): void { setEditOpen(false); setSelected(null); setPrefillData(null); }

    const handleSave = useCallback(async (
        data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>,
    ): Promise<void> => {
        setSaveError(null);
        try {
            if (selected) {
                await productoService.editar(selected.id, data as any);
                setRows(prev => prev.map(r =>
                    r.id === selected.id ? { ...r, ...data, id: selected.id } : r
                ));
                setExpandedId(null);
            } else {
                const { data: nuevo } = await api.post<Producto>('/productos', data);
                setRows(prev => [nuevo, ...prev]);
            }
            closeEdit();
        } catch (err: any) {
            const msg = err?.response?.data?.message
                ?? err?.response?.data
                ?? 'Error al guardar la pieza. Comprueba que el SKU no esté duplicado.';
            setSaveError(String(msg));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    return (
        <div>
        {editOpen ? (
            /* ── Panel de alta/edición RETRO a pantalla completa ── */
            <ProductFormPanel
                producto={selected}
                modoRetro={true}
                onCancel={closeEdit}
                onSave={handleSave}
                initialValues={prefillData ?? undefined}
                serverError={saveError}
            />
        ) : (
            <>
            {/* ── Cabecera ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h1 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(16px, 2vw, 22px)',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color:         'var(--text-primary)',
                    lineHeight:    1.1,
                    margin:        0,
                }}>
                    LA{' '}
                    <span style={{
                        background:           'linear-gradient(125deg, #D4920A 0%, #B97310 50%, #9A5C08 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor:  'transparent',
                        backgroundClip:       'text',
                        filter:               'drop-shadow(0 0 8px rgba(180,110,8,0.22))',
                        display:              'inline-block',
                    }}>
                        BÓVEDA
                    </span>{' '}
                    RETRO
                </h1>

                <button
                    onClick={handleOpenNew}
                    style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '12px',
                        fontWeight:    700,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        padding:       '9px 20px',
                        background:    'linear-gradient(135deg, #B97310, #D4920A)',
                        color:         '#0A0A0F',
                        border:        'none',
                        borderRadius:  'var(--radius-base)',
                        cursor:        'pointer',
                        display:       'flex',
                        alignItems:    'center',
                        gap:           '7px',
                        boxShadow:     '0 0 18px rgba(180,110,8,0.30)',
                        transition:    'opacity 150ms ease, box-shadow 150ms ease',
                        flexShrink:    0,
                    }}
                    onMouseEnter={e => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.opacity = '0.88';
                        b.style.boxShadow = '0 0 26px rgba(180,110,8,0.50)';
                    }}
                    onMouseLeave={e => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.opacity = '1';
                        b.style.boxShadow = '0 0 18px rgba(180,110,8,0.30)';
                    }}
                >
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>◆</span>
                    AÑADIR PIEZA RETRO
                </button>
            </div>

            {/* ── Tasador IA ── */}
            <TasadorIA onRegistrar={handleRegistrar} />

            {/* ── Búsqueda + filtros en una sola fila ── */}
            {(() => {
                const activeDesc = hoveredEstado
                    ? ESTADO_META[hoveredEstado].desc
                    : filterEstado !== 'TODOS' ? ESTADO_META[filterEstado].desc : '';

                // chipsNode es estático respecto al hover — NO incluye activeDesc
                // para evitar que los re-renders del hover rompan los eventos del ratón
                const chipsNode = (
                    <>
                        {/* Separador vertical */}
                        <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border-default)', flexShrink: 0, margin: '0 2px' }} />

                        {/* Chips de estado */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            {(Object.keys(ESTADO_META) as EstadoKey[]).map(key => (
                                <FilterChip
                                    key={key}
                                    label={ESTADO_META[key].label}
                                    color={ESTADO_META[key].color}
                                    active={filterEstado === key}
                                    onClick={() => { setFilterEstado(key); setFilterActivo('TODOS'); filters.setPage(0); }}
                                    onMouseEnter={() => setHoveredEstado(key)}
                                    onMouseLeave={() => setHoveredEstado(null)}
                                />
                            ))}

                            {/* Separador interno */}
                            <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border-default)', flexShrink: 0, margin: '0 2px' }} />

                            {(['ACTIVOS', 'VENDIDOS'] as ActivoKey[]).map(key => (
                                <FilterChip
                                    key={key}
                                    label={key === 'ACTIVOS' ? 'Disponibles' : 'Vendidos'}
                                    color={key === 'ACTIVOS' ? 'var(--accent-primary)' : 'var(--accent-danger)'}
                                    active={filterActivo === key}
                                    onClick={() => { setFilterActivo(filterActivo === key ? 'TODOS' : key); setFilterEstado('TODOS'); filters.setPage(0); }}
                                />
                            ))}
                        </div>
                    </>
                );

                return (
                    <div style={{ marginBottom: '16px' }}>
                        <TableControls
                            filters={filters}
                            isLoading={isLoading}
                            entityLabel="pieza"
                            entityLabelPlural="piezas"
                            searchPlaceholder="Buscar por nombre o SKU..."
                            extraFilters={chipsNode}
                        />
                        {/* Leyenda — fuera del chipsNode para no re-crear los chips en cada hover */}
                        <div style={{
                            height:        '18px',
                            marginTop:     '5px',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '10px',
                            color:         hoveredEstado ? ESTADO_META[hoveredEstado].color : 'var(--text-muted)',
                            letterSpacing: '0.04em',
                            opacity:       activeDesc ? 0.75 : 0,
                            transition:    'opacity 150ms ease, color 150ms ease',
                            pointerEvents: 'none',
                        }}>
                            {activeDesc ? `▸ ${activeDesc}` : ''}
                        </div>
                    </div>
                );
            })()}

            {/* ── Tabla ── */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                                <th style={bovedaThStyle}>Estado</th>
                                <th style={bovedaThStyle}>SKU</th>
                                <BovedaSortableTh label="Nombre"       field="nombre"      currentField={sortField} dir={sortDir} onSort={toggleSort} />
                                <th style={bovedaThStyle}>Plataforma</th>
                                <BovedaSortableTh label="Precio"       field="precioVenta" currentField={sortField} dir={sortDir} onSort={toggleSort} />
                                <th style={bovedaThStyle}>Disponibilidad</th>
                                <th style={bovedaThStyle}></th>
                            </tr>
                        </thead>
                        <tbody style={{ opacity: isLoading && rows.length > 0 ? 0.5 : 1, transition: 'opacity 200ms' }}>
                            {isLoading && rows.length === 0 && (
                                <SkeletonRows rows={Math.min(filters.limit, 8)} cols={7} />
                            )}
                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN PIEZAS EN EL CATÁLOGO'}
                                    </td>
                                </tr>
                            )}
                            {rows.map(p => {
                                const isExpanded = expandedId === p.id;
                                const estadoMeta = p.estadoConservacion ? ESTADO_META[p.estadoConservacion] : null;
                                const attrs      = p.atributosEspecificos as Record<string, unknown> | null;
                                const plataforma = attrs?.['plataforma'] as string | undefined;
                                const anio       = attrs?.['anio']       as number | undefined;

                                return (
                                    <>
                                        <tr
                                            key={p.id}
                                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                            style={{
                                                borderBottom:  isExpanded ? 'none' : '1px solid var(--border-subtle)',
                                                cursor:        'pointer',
                                                background:    isExpanded ? 'var(--bg-elevated)' : 'transparent',
                                                opacity:       p.activo ? 1 : 0.45,
                                                transition:    'background 120ms ease',
                                                borderLeft:    isExpanded ? '2px solid var(--accent-gold)' : '2px solid transparent',
                                            }}
                                            onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-overlay)'; }}
                                            onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                                        >
                                            {/* Estado */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {estadoMeta && (
                                                    <span style={{
                                                        fontFamily:    'var(--font-mono)',
                                                        fontSize:      '9px',
                                                        fontWeight:    700,
                                                        letterSpacing: '0.08em',
                                                        color:         estadoMeta.color,
                                                        border:        `1px solid ${estadoMeta.color}`,
                                                        borderRadius:  '3px',
                                                        padding:       '2px 6px',
                                                        background:    `${estadoMeta.color}12`,
                                                        whiteSpace:    'nowrap',
                                                    }}>
                                                        {estadoMeta.label}
                                                    </span>
                                                )}
                                            </td>

                                            {/* SKU */}
                                            <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                                                {p.sku}
                                            </td>

                                            {/* Nombre */}
                                            <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)', maxWidth: '260px' }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.nombre}
                                                </div>
                                            </td>

                                            {/* Plataforma */}
                                            <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                {plataforma ? `${plataforma}${anio ? ` · ${anio}` : ''}` : '—'}
                                            </td>

                                            {/* Precio */}
                                            <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)', whiteSpace: 'nowrap' }}>
                                                €{p.precioVenta.toFixed(2)}
                                            </td>

                                            {/* Disponibilidad */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className={p.stockActual === 0 ? 'badge badge-danger' : 'badge badge-green'} style={{ fontSize: '9px' }}>
                                                    {p.stockActual === 0 ? '✕ VENDIDO' : '● DISPONIBLE'}
                                                </span>
                                            </td>

                                            {/* Expand */}
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    display:    'inline-block',
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize:   '10px',
                                                    color:      'var(--text-muted)',
                                                    transform:  isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    transition: 'transform 200ms var(--ease-out)',
                                                }}>▶</span>
                                            </td>
                                        </tr>

                                        {isExpanded && <DetailRow key={`${p.id}-detail`} p={p} onEdit={() => handleOpenEdit(p)} />}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            </>
        )}
        </div>
    );
}

// ── Estilos y cabeceras de tabla ──────────────────────────────────────────────

const bovedaThStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left',
    fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-muted)', whiteSpace: 'nowrap',
};

function BovedaSortableTh({ label, field, currentField, dir, onSort }: {
    label:        string;
    field:        SortField;
    currentField: SortField | null;
    dir:          SortDir;
    onSort:       (f: SortField) => void;
}): JSX.Element {
    const active = currentField === field;
    return (
        <th style={{ ...bovedaThStyle, cursor: 'pointer', userSelect: 'none' }}>
            <button
                onClick={() => onSort(field)}
                style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: active ? 'var(--accent-gold)' : 'var(--text-muted)',
                    padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'color 120ms ease', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
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

