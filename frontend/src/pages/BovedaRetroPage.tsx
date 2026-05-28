/**
 * pages/BovedaRetroPage.tsx — SUFP v3 RETRO
 *
 * Catálogo de piezas retro arcade con estética pixel art.
 * · GET /api/productos?tipo=RETRO&buscar=&page=&size=
 * · Filtros chip: estado (MINT/CIB/LOOSE/DMG) · activo (ACTIVOS/VENDIDOS)
 * · Filtros mutuamente excluyentes — seleccionar uno resetea el otro
 * · Anti-flicker: firstLoadDone ref evita setIsLoading en cambios de filtro
 * · Client-side post-filter garantiza el resultado aunque el backend ignore params
 * · Fallback: filtrado local sobre MOCK_PRODUCTOS cuando el backend no responde
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Producto, EstadoConservacion, PaginatedResponse } from '../types/models';
import { MOCK_PRODUCTOS }   from '../mocks/mockProductos';
import { TasadorIA }        from '../components/boveda/TasadorIA';
import { ProductModal }     from '../components/productos/ProductModal';
import type { ProductForm } from '../components/productos/ProductModal';
import { useTableFilters, calculateAutoLimit } from '../hooks/useTableFilters';
import { TableControls }    from '../components/table/TableControls';
import api                  from '../services/api';

// ── Paleta retro ──────────────────────────────────────────────────────────────
const R = {
    bg:       '#080808',
    surface:  '#0e0e0d',
    elevated: '#141413',
    amber:    '#ffb830',
    amberHi:  '#ffe080',
    cream:    '#f5ead8',
    sand:     '#d4a860',
    dust:     '#8a6a38',
    red:      '#ff4444',
    border:   'rgba(255,180,40,0.14)',
    borderHi: 'rgba(255,200,80,0.32)',
} as const;

// ── Color por estado de conservación ─────────────────────────────────────────
const ESTADO_COLOR: Record<EstadoConservacion, string> = {
    MINT:    '#ffd700',
    CIB:     '#44ffaa',
    LOOSE:   '#ffaa33',
    LOOSE_D: '#ff4444',
};

// ── Tipos de filtro ───────────────────────────────────────────────────────────
type EstadoKey = EstadoConservacion | 'TODOS';
type ActivoKey = 'TODOS' | 'ACTIVOS' | 'VENDIDOS';

// ── Metadatos de chips y leyenda ──────────────────────────────────────────────
const ESTADO_INFO: Record<EstadoKey, { icon: string; label: string; color: string; desc: string }> = {
    TODOS:   { icon: '■', label: 'TODOS',  color: R.sand,               desc: 'Mostrar todas las piezas'             },
    MINT:    { icon: '★', label: 'MINT',   color: ESTADO_COLOR.MINT,    desc: 'Precintado, sin abrir — máximo valor' },
    CIB:     { icon: '◈', label: 'CIB',    color: ESTADO_COLOR.CIB,     desc: 'Caja + Manual completo'               },
    LOOSE:   { icon: '◎', label: 'LOOSE',  color: ESTADO_COLOR.LOOSE,   desc: 'Solo cartucho o disco, sin caja'      },
    LOOSE_D: { icon: '▲', label: 'DMG',    color: ESTADO_COLOR.LOOSE_D, desc: 'Con daños o desgaste visible'         },
};

const ACTIVO_INFO: Record<ActivoKey, { icon: string; label: string; color: string }> = {
    TODOS:    { icon: '▪', label: 'Todos',    color: R.sand    },
    ACTIVOS:  { icon: '●', label: 'Activos',  color: '#44ffaa' },
    VENDIDOS: { icon: '✕', label: 'Vendidos', color: R.red     },
};

// ── Keyframes CSS ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
    @keyframes retroGlow {
        0%, 100% { text-shadow: 0 0 6px #ffe08080; }
        50%       { text-shadow: 0 0 18px #ffe080, 0 0 36px #ffb83060; }
    }
    @keyframes pixelPulse {
        0%, 100% { opacity: 0.30; transform: scaleY(1); }
        50%       { opacity: 1;   transform: scaleY(1.6); }
    }
    @keyframes skRetro {
        0%, 100% { opacity: 0.04; }
        50%       { opacity: 0.11; }
    }
    @keyframes insertCoin {
        0%, 78%, 100% { opacity: 1; }
        88%            { opacity: 0; }
    }
`;

// ── Helper: filtrado local como fallback ──────────────────────────────────────
function simulateFilter(
    data:   Producto[],
    search: string,
    estado: EstadoKey,
    activo: ActivoKey,
    page:   number,
    size:   number,
): { content: Producto[]; totalElements: number; totalPages: number } {
    const q = search.toLowerCase();
    const filtered = data.filter(p => {
        const matchSearch = !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        const matchEstado = estado === 'TODOS' || p.estadoConservacion === estado;
        const matchActivo = activo === 'TODOS'
            || (activo === 'ACTIVOS' ? p.activo === true : p.activo === false);
        return matchSearch && matchEstado && matchActivo;
    });
    const totalElements = filtered.length;
    const totalPages    = Math.ceil(totalElements / size) || 1;
    return { content: filtered.slice(page * size, (page + 1) * size), totalElements, totalPages };
}

// ── Componente: puntos píxel animados ─────────────────────────────────────────
function PixelDotSeparator(): JSX.Element {
    return (
        <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '4px',
            flexShrink:     0,
            padding:        '1px 0',
        }}>
            {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                    width:      '3px',
                    height:     '3px',
                    flexShrink: 0,
                    background: i % 2 === 0 ? R.amberHi : R.amber,
                    animation:  `pixelPulse ${1.0 + i * 0.20}s ease-in-out ${i * 110}ms infinite`,
                }} />
            ))}
        </div>
    );
}

// ── Componente: chips de estado ───────────────────────────────────────────────
function EstadoFilter({ value, onChange }: {
    value:    EstadoKey;
    onChange: (v: EstadoKey) => void;
}): JSX.Element {
    const [hovered, setHovered] = useState<EstadoKey | null>(null);
    const KEYS: EstadoKey[] = ['TODOS', 'MINT', 'CIB', 'LOOSE', 'LOOSE_D'];

    const infoVisible = hovered
        ? ESTADO_INFO[hovered]
        : value !== 'TODOS' ? ESTADO_INFO[value] : null;

    return (
        <div style={{ position: 'relative', display: 'flex', gap: '4px', alignItems: 'center' }}>
            {KEYS.map(key => {
                const info     = ESTADO_INFO[key];
                const isActive = value === key;
                return (
                    <button
                        key={key}
                        onClick={() => onChange(key)}
                        onMouseEnter={() => setHovered(key)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            fontFamily:    'Courier New, monospace',
                            fontSize:      '11px',
                            fontWeight:    700,
                            letterSpacing: '0.08em',
                            padding:       '5px 10px',
                            background:    isActive ? `${info.color}18` : 'transparent',
                            color:         isActive ? info.color : R.dust,
                            border:        `1px solid ${isActive ? info.color : R.border}`,
                            borderRadius:  '0',
                            cursor:        'pointer',
                            transition:    'all 120ms ease',
                            whiteSpace:    'nowrap',
                        }}
                    >
                        {info.icon} {info.label}
                    </button>
                );
            })}
            {/* Leyenda flotante — no afecta al layout */}
            {infoVisible && (
                <div style={{
                    position:      'absolute',
                    top:           'calc(100% + 7px)',
                    left:          0,
                    fontFamily:    'Courier New, monospace',
                    fontSize:      '10px',
                    color:         infoVisible.color,
                    whiteSpace:    'nowrap',
                    pointerEvents: 'none',
                    zIndex:        20,
                    opacity:       0.88,
                }}>
                    ▸ {infoVisible.desc}
                </div>
            )}
        </div>
    );
}

// ── Componente: chips activo/vendido ──────────────────────────────────────────
function ActivoFilter({ value, onChange }: {
    value:    ActivoKey;
    onChange: (v: ActivoKey) => void;
}): JSX.Element {
    const KEYS: Exclude<ActivoKey, 'TODOS'>[] = ['ACTIVOS', 'VENDIDOS'];
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {KEYS.map(key => {
                const info     = ACTIVO_INFO[key];
                const isActive = value === key;
                return (
                    <button
                        key={key}
                        onClick={() => onChange(isActive ? 'TODOS' : key)}
                        style={{
                            fontFamily:    'Courier New, monospace',
                            fontSize:      '11px',
                            fontWeight:    700,
                            letterSpacing: '0.08em',
                            padding:       '5px 10px',
                            background:    isActive ? `${info.color}18` : 'transparent',
                            color:         isActive ? info.color : R.dust,
                            border:        `1px solid ${isActive ? info.color : R.border}`,
                            borderRadius:  '0',
                            cursor:        'pointer',
                            transition:    'all 120ms ease',
                            whiteSpace:    'nowrap',
                        }}
                    >
                        {info.icon} {info.label}
                    </button>
                );
            })}
        </div>
    );
}

// ── Tarjeta de pieza retro ────────────────────────────────────────────────────
function RetroCard({ producto: p }: { producto: Producto }): JSX.Element {
    const estadoColor = p.estadoConservacion ? ESTADO_COLOR[p.estadoConservacion] : R.amber;
    const estadoInfo  = p.estadoConservacion ? ESTADO_INFO[p.estadoConservacion]  : null;
    const attrs       = p.atributosEspecificos as Record<string, unknown> | null;
    const plataforma  = attrs?.['plataforma'] as string | undefined;
    const anio        = attrs?.['anio']       as number | undefined;
    const tasacion    = attrs?.['tasacion_ia_eur'] as number | undefined;

    return (
        <div style={{
            background:    R.surface,
            border:        `2px solid ${R.border}`,
            borderRadius:  '0',
            boxShadow:     `4px 4px 0 rgba(0,0,0,0.9), inset 0 0 0 1px ${R.elevated}`,
            display:       'flex',
            flexDirection: 'column',
            position:      'relative',
            overflow:      'hidden',
        }}>
            {/* Barra superior coloreada por estado */}
            <div style={{
                height:     '3px',
                background: `linear-gradient(90deg, ${estadoColor}, ${estadoColor}70)`,
                flexShrink: 0,
            }} />

            {/* Overlay VENDIDO */}
            {!p.activo && (
                <div style={{
                    position:       'absolute',
                    inset:          0,
                    zIndex:         10,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    background:     'rgba(5,4,3,0.78)',
                }}>
                    <span style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '16px',
                        fontWeight:    700,
                        letterSpacing: '0.28em',
                        color:         R.red,
                        border:        `2px solid ${R.red}`,
                        outline:       `1px solid ${R.red}40`,
                        outlineOffset: '4px',
                        padding:       '5px 16px',
                        transform:     'rotate(-12deg)',
                        display:       'inline-block',
                    }}>VENDIDO</span>
                </div>
            )}

            {/* Cabecera: SKU + badge estado */}
            <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                padding:        '8px 12px',
                borderBottom:   `1px solid ${R.border}`,
                background:     R.elevated,
                gap:            '8px',
            }}>
                <span style={{
                    fontFamily:    'Courier New, monospace',
                    fontSize:      '10px',
                    color:         R.amber,
                    letterSpacing: '0.08em',
                    opacity:       0.85,
                }}>{p.sku}</span>
                {estadoInfo && (
                    <span style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '9px',
                        fontWeight:    700,
                        letterSpacing: '0.10em',
                        color:         estadoColor,
                        border:        `1px solid ${estadoColor}`,
                        padding:       '2px 7px',
                        flexShrink:    0,
                    }}>
                        {estadoInfo.icon} {estadoInfo.label}
                    </span>
                )}
            </div>

            {/* Cuerpo */}
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <h3 style={{
                    fontFamily:    'Courier New, monospace',
                    fontSize:      '13px',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color:         R.cream,
                    margin:        0,
                    lineHeight:    1.3,
                }}>{p.nombre}</h3>
                {plataforma && (
                    <div style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '10px',
                        color:         R.sand,
                        letterSpacing: '0.06em',
                    }}>
                        {plataforma}{anio ? ` · ${anio}` : ''}
                    </div>
                )}
                {p.descripcion && (
                    <p style={{
                        fontFamily:  'Courier New, monospace',
                        fontSize:    '10px',
                        color:       R.dust,
                        lineHeight:  1.5,
                        margin:      0,
                        flex:        1,
                    }}>
                        {p.descripcion.slice(0, 80)}{p.descripcion.length > 80 ? '…' : ''}
                    </p>
                )}
            </div>

            {/* Pie: precio */}
            <div style={{
                padding:        '10px 12px',
                borderTop:      `1px solid ${R.border}`,
                background:     R.elevated,
                display:        'flex',
                alignItems:     'baseline',
                justifyContent: 'space-between',
                gap:            '8px',
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '20px',
                        fontWeight:    700,
                        color:         estadoColor,
                        letterSpacing: '-0.02em',
                        textShadow:    `0 0 12px ${estadoColor}55`,
                    }}>€{p.precioVenta.toFixed(2)}</span>
                    <span style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '9px',
                        color:         R.dust,
                        letterSpacing: '0.06em',
                    }}>PVP</span>
                </div>
                {tasacion && (
                    <span style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '9px',
                        color:         R.dust,
                        letterSpacing: '0.04em',
                    }}>IA €{tasacion.toFixed(2)}</span>
                )}
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function BovedaRetroPage(): JSX.Element {

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'boveda', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination, search: activeSearch, page: activePage, limit: activeLimit } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,         setRows]         = useState<Producto[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [filterEstado, setFilterEstado] = useState<EstadoKey>('TODOS');
    const [filterActivo, setFilterActivo] = useState<ActivoKey>('TODOS');
    const [modalOpen,    setModalOpen]    = useState(false);
    const [prefill,      setPrefill]      = useState<Partial<ProductForm> | undefined>(undefined);
    const [refreshTick,  setRefreshTick]  = useState(0);

    // Ref anti-flicker: no mostramos skeleton en cambios de filtro, solo en carga inicial
    const firstLoadDone = useRef(false);

    // Dataset local (mock) para el fallback offline
    const [localData] = useState<Producto[]>(
        MOCK_PRODUCTOS.filter(p => p.tipoProducto === 'RETRO')
    );

    // ── Tema retro: override de variables CSS directamente en <html> ──────────
    // Esto supera la especificidad del selector html.theme-retro { } en theme.css
    useEffect(() => {
        const html = document.documentElement;
        html.classList.add('theme-retro');
        html.style.setProperty('--bg-void',    '#030303');
        html.style.setProperty('--bg-base',    '#080808');
        html.style.setProperty('--bg-surface', '#0e0e0d');
        html.style.setProperty('--bg-elevated','#141413');
        html.style.setProperty('--bg-overlay', '#1a1a19');
        return (): void => {
            html.classList.remove('theme-retro');
            html.style.removeProperty('--bg-void');
            html.style.removeProperty('--bg-base');
            html.style.removeProperty('--bg-surface');
            html.style.removeProperty('--bg-elevated');
            html.style.removeProperty('--bg-overlay');
        };
    }, []);

    // ── Fetch server-side ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        // Solo mostramos skeleton en la carga inicial; los cambios de filtro no la disparan
        if (!firstLoadDone.current) setIsLoading(true);

        const params = buildParams();
        params.set('tipo', 'RETRO');
        if (filterEstado !== 'TODOS') params.set('estado', filterEstado);
        if (filterActivo === 'ACTIVOS')  params.set('activo', 'true');
        if (filterActivo === 'VENDIDOS') params.set('activo', 'false');

        api.get<PaginatedResponse<Producto>>(`/productos?${params.toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    firstLoadDone.current = true;
                    // Client-side post-filter: garantía aunque el backend ignore los params
                    const filteredContent = data.content.filter(p => {
                        const matchEstado = filterEstado === 'TODOS' || p.estadoConservacion === filterEstado;
                        const matchActivo = filterActivo === 'TODOS'
                            || (filterActivo === 'ACTIVOS' ? p.activo === true : p.activo === false);
                        return matchEstado && matchActivo;
                    });
                    const hasFilter = filterEstado !== 'TODOS' || filterActivo !== 'TODOS';
                    setRows(filteredContent);
                    setPagination(
                        hasFilter ? filteredContent.length                                  : data.totalElements,
                        hasFilter ? (Math.ceil(filteredContent.length / activeLimit) || 1) : data.totalPages,
                    );
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    firstLoadDone.current = true;
                    const result = simulateFilter(localData, activeSearch, filterEstado, filterActivo, activePage, activeLimit);
                    setRows(result.content);
                    setPagination(result.totalElements, result.totalPages);
                    setIsLoading(false);
                }
            });

        return (): void => { cancelled = true; };
    }, [
        filters.querySignal,
        filterEstado,
        filterActivo,
        refreshTick,
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

    const handleSave = useCallback(async (
        data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>
    ): Promise<void> => {
        try {
            await api.post('/productos', data);
        } catch (err) {
            console.error('Error registrando pieza retro:', err);
        } finally {
            setModalOpen(false);
            setPrefill(undefined);
            setRefreshTick(t => t + 1);
        }
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ background: R.bg, minHeight: '100%' }}>
            <style>{KEYFRAMES}</style>

            {/* Tasador IA */}
            <TasadorIA onRegistrar={handleRegistrar} />

            {/* Cabecera catálogo */}
            <div style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                    <PixelDotSeparator />
                    <h1 style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '22px',
                        fontWeight:    700,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color:         R.cream,
                        margin:        0,
                    }}>
                        La Bóveda{' '}
                        <span style={{ color: R.amberHi, animation: 'retroGlow 2.4s ease-in-out infinite' }}>
                            RETRO
                        </span>
                    </h1>
                    <PixelDotSeparator />
                    <span style={{
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '11px',
                        color:         R.dust,
                        letterSpacing: '0.06em',
                    }}>Coleccionismo desde 1978</span>
                    <span style={{
                        marginLeft:    'auto',
                        fontFamily:    'Courier New, monospace',
                        fontSize:      '11px',
                        color:         R.amber,
                        letterSpacing: '0.12em',
                        animation:     'insertCoin 1.8s step-end infinite',
                    }}>► INSERT COIN</span>
                </div>
            </div>

            {/* Controles: búsqueda · chips estado/activo · paginación */}
            <div style={{ marginBottom: 'var(--space-8)', position: 'relative', paddingBottom: '18px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="pieza"
                    entityLabelPlural="piezas"
                    searchPlaceholder="Buscar por nombre o SKU..."
                    extraFilters={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <EstadoFilter
                                value={filterEstado}
                                onChange={v => {
                                    setFilterEstado(v);
                                    if (v !== 'TODOS') setFilterActivo('TODOS');
                                    filters.setPage(0);
                                }}
                            />
                            <span style={{ width: '1px', height: '22px', background: R.border, flexShrink: 0 }} />
                            <ActivoFilter
                                value={filterActivo}
                                onChange={v => {
                                    setFilterActivo(v);
                                    if (v !== 'TODOS') setFilterEstado('TODOS');
                                    filters.setPage(0);
                                }}
                            />
                        </div>
                    }
                />
            </div>

            {/* Grid de piezas */}
            {(isLoading && rows.length === 0) ? (
                // Skeleton solo en la carga inicial
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                    {Array.from({ length: Math.min(filters.limit, 8) }).map((_, i) => (
                        <div key={i} style={{
                            background:   R.surface,
                            border:       `2px solid ${R.border}`,
                            borderRadius: '0',
                            boxShadow:    '4px 4px 0 rgba(0,0,0,0.9)',
                            minHeight:    '210px',
                            overflow:     'hidden',
                        }}>
                            <div style={{
                                height:      '26px',
                                background:  R.elevated,
                                borderBottom:`1px solid ${R.border}`,
                                animation:   `skRetro 1.5s ease-in-out ${i * 100}ms infinite`,
                            }} />
                            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[55, 80, 60].map((w, j) => (
                                    <div key={j} style={{
                                        height:    '10px',
                                        width:     `${w}%`,
                                        borderRadius: '0',
                                        background:'rgba(200,145,20,0.10)',
                                        animation: `skRetro 1.5s ease-in-out ${i * 100 + j * 50}ms infinite`,
                                    }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div style={{
                    textAlign:     'center',
                    padding:       '60px 20px',
                    border:        `1px solid ${R.border}`,
                    background:    R.surface,
                    fontFamily:    'Courier New, monospace',
                    fontSize:      '13px',
                    color:         R.dust,
                    letterSpacing: '0.10em',
                }}>
                    {filters.search
                        ? `// NO DATA FOUND: "${filters.search.toUpperCase()}"`
                        : '// NO DATA FOUND'}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                    {rows.map(p => <RetroCard key={p.id} producto={p} />)}
                </div>
            )}

            {/* Modal de alta retro — tipo fijo RETRO, sin selector */}
            <ProductModal
                producto={null}
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setPrefill(undefined); }}
                onSave={handleSave}
                initialValues={prefill}
                modoCreacion="RETRO"
            />
        </div>
    );
}
