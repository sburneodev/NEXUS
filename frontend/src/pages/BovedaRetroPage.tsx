/**
 * pages/BovedaRetroPage.tsx — Arcade Retro Theme v3
 *
 * Aplica html.theme-retro al montar (tipografía Courier New + acentos ámbar)
 * pero sobreescribe las vars de fondo con valores casi-negros para evitar
 * la saturación naranja. El ámbar aparece solo como acento/glow, no como fondo.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Producto, EstadoConservacion, PaginatedResponse } from '../types/models';
import { MOCK_PRODUCTOS }      from '../mocks/mockProductos';
import { TasadorIA }           from '../components/boveda/TasadorIA';
import { ProductModal }        from '../components/productos/ProductModal';
import type { ProductForm }    from '../components/productos/ProductModal';
import { useTableFilters, calculateAutoLimit } from '../hooks/useTableFilters';
import { TableControls }       from '../components/table/TableControls';
import api                     from '../services/api';

// ── Paleta interna — fondos casi negros, texto blanco y naranja claro ────────
const R = {
    bg:        '#060606',   // negro neutro puro — fondo de página
    surface:   '#0d0d0d',   // tarjetas: neutral puro sin calidez
    elevated:  '#131313',   // cabeceras HUD: neutral oscuro
    amber:     '#ffb830',   // naranja para acentos de acción
    amberHi:   '#ffe080',   // ámbar muy claro / casi amarillo para precio/highlight
    cream:     '#f5ead8',   // texto primario: blanco cálido muy legible
    sand:      '#e8e2d8',   // texto secundario: blanco cálido tenue — naranja muy claro
    dust:      '#c8c2b8',   // texto terciario: blanco cálido apagado — tirando a blanco
    red:       '#ff4444',   // peligro/vendido
    border:    'rgba(255,180,40,0.09)',   // borde sutil — más discreto
    borderHi:  'rgba(255,200,80,0.24)',   // borde activo
} as const;

// ── Colores únicos por estado — se usan en chips, badges y tarjetas ──────────
type EstadoKey = EstadoConservacion | 'TODOS';

const ESTADO_COLOR: Record<EstadoConservacion, string> = {
    MINT:    '#ffd700',  // dorado  — perfecto, precintado
    CIB:     '#44ffaa',  // verde   — completo con caja y manual
    LOOSE:   '#ffaa33',  // ámbar   — solo cartucho
    LOOSE_D: '#ff4444',  // rojo    — con daños
};

const ESTADO_INFO: Record<EstadoKey, { label: string; icon: string; desc: string; color: string }> = {
    TODOS:   { icon: '■', label: 'Todos',  color: R.sand,                desc: 'Ver todas las piezas del catálogo sin filtrar.' },
    MINT:    { icon: '★', label: 'MINT',   color: ESTADO_COLOR.MINT,    desc: 'Precintado de fábrica. Nunca abierto ni usado.' },
    CIB:     { icon: '◈', label: 'CIB',    color: ESTADO_COLOR.CIB,     desc: 'Complete In Box — caja, cartucho y manual originales.' },
    LOOSE:   { icon: '◎', label: 'LOOSE',  color: ESTADO_COLOR.LOOSE,   desc: 'Solo cartucho o disco, sin caja ni manual.' },
    LOOSE_D: { icon: '▲', label: 'DMG',    color: ESTADO_COLOR.LOOSE_D, desc: 'Con daños visibles en caja, cartucho o manual.' },
};

// ── Badge de conservación para las tarjetas ───────────────────────────────────
const BADGE_MAP: Record<EstadoConservacion, { label: string; color: string }> = {
    MINT:    { label: '★ MINT',  color: ESTADO_COLOR.MINT    },
    CIB:     { label: '◈ CIB',   color: ESTADO_COLOR.CIB     },
    LOOSE:   { label: '◎ LOOSE', color: ESTADO_COLOR.LOOSE   },
    LOOSE_D: { label: '▲ DMG',   color: ESTADO_COLOR.LOOSE_D },
};

// ── Filtro de estado activo/vendido ───────────────────────────────────────────
type ActivoKey = 'TODOS' | 'ACTIVOS' | 'VENDIDOS';

// ── Helper: filtrado local como fallback ──────────────────────────────────────
function simulateFilter(
    data: Producto[], search: string,
    estado: EstadoKey, activo: ActivoKey, page: number, size: number,
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
    return { content: filtered.slice(page * size, (page + 1) * size), totalElements, totalPages: Math.ceil(totalElements / size) || 1 };
}

// ── Selector de estado con chips y descripción en línea ───────────────────────
function EstadoFilter({
    value,
    onChange,
}: {
    value:    EstadoKey;
    onChange: (v: EstadoKey) => void;
}): JSX.Element {
    const [hovered, setHovered] = useState<EstadoKey | null>(null);

    // Descripción visible: hover tiene prioridad; si no, la del chip activo (no TODOS)
    const infoVisible = hovered
        ? ESTADO_INFO[hovered]
        : value !== 'TODOS' ? ESTADO_INFO[value] : null;

    return (
        // position: relative para que la descripción absoluta se ancle aquí
        <div style={{ position: 'relative', display: 'flex', gap: '4px', alignItems: 'center' }}>
            {(Object.entries(ESTADO_INFO) as [EstadoKey, typeof ESTADO_INFO['TODOS']][]).map(([key, info]) => {
                const isActive = value === key;
                const isHover  = hovered === key;
                return (
                    <button
                        key={key}
                        onClick={() => onChange(key)}
                        onMouseEnter={() => setHovered(key)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            fontFamily:    'Courier New, monospace',
                            fontSize:      '10px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            color:         isActive ? '#09080a' : isHover ? info.color : R.sand,
                            background:    isActive ? info.color : isHover ? `${info.color}18` : 'transparent',
                            border:        `1.5px solid ${isActive || isHover ? info.color : R.border}`,
                            borderRadius:  '0px',
                            padding:       '5px 9px',
                            cursor:        'pointer',
                            transition:    'all 130ms ease',
                            boxShadow:     isActive ? `0 0 10px ${info.color}55` : 'none',
                            whiteSpace:    'nowrap',
                        }}
                    >
                        {info.icon} {info.label}
                    </button>
                );
            })}

            {/* Descripción flotante — position:absolute, no afecta la altura del flex */}
            {infoVisible && (
                <div style={{
                    position:      'absolute',
                    top:           'calc(100% + 7px)',
                    left:          0,
                    fontFamily:    'Courier New, monospace',
                    fontSize:      '10px',
                    letterSpacing: '0.05em',
                    color:         infoVisible.color,
                    whiteSpace:    'nowrap',
                    pointerEvents: 'none',
                    zIndex:        20,
                    opacity:       0.88,
                    transition:    'opacity 150ms ease',
                }}>
                    ▸ {infoVisible.desc}
                </div>
            )}
        </div>
    );
}
// ── Chips Activos / Vendidos ──────────────────────────────────────────────────
const ACTIVO_INFO: Record<ActivoKey, { label: string; icon: string; color: string }> = {
    TODOS:    { icon: '▪', label: 'Todos',    color: R.sand    },
    ACTIVOS:  { icon: '●', label: 'Activos',  color: '#44ffaa' },
    VENDIDOS: { icon: '✕', label: 'Vendidos', color: R.red     },
};

function ActivoFilter({
    value,
    onChange,
}: {
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
                        // Toggle: clic sobre el activo lo desactiva (vuelve a TODOS)
                        onClick={() => onChange(isActive ? 'TODOS' : key)}
                        title={key === 'ACTIVOS' ? 'Mostrar solo artículos en venta' : 'Mostrar solo artículos vendidos'}
                        style={{
                            fontFamily:    'Courier New, monospace',
                            fontSize:      '10px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            color:         isActive ? '#09080a' : R.sand,
                            background:    isActive ? info.color : 'transparent',
                            border:        `1.5px solid ${isActive ? info.color : R.border}`,
                            borderRadius:  '0px',
                            padding:       '5px 9px',
                            cursor:        'pointer',
                            transition:    'all 130ms ease',
                            boxShadow:     isActive ? `0 0 10px ${info.color}55` : 'none',
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
// ── Separador de puntos parpadeantes (entre título y subtítulo) ──────────────
function PixelDotSeparator(): JSX.Element {
    const dots = [0, 1, 2, 3, 4];
    return (
        <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            justifyContent:'center',
            gap:           '4px',
            flexShrink:    0,
            padding:       '1px 0',
        }}>
            {dots.map(i => (
                <div
                    key={i}
                    style={{
                        width:      '3px',
                        height:     '3px',
                        flexShrink: 0,
                        background: i % 2 === 0 ? R.amberHi : R.amber,
                        animation:  `pixelPulse ${1.0 + i * 0.20}s ease-in-out ${i * 110}ms infinite`,
                    }}
                />
            ))}
        </div>
    );
}

// ── Tarjeta de pieza retro — Dark Terminal Arcade ─────────────────────────────
function RetroCard({ producto: p }: { producto: Producto }): JSX.Element {
    const badge        = p.estadoConservacion ? BADGE_MAP[p.estadoConservacion] : null;
    const estadoColor  = p.estadoConservacion ? ESTADO_COLOR[p.estadoConservacion] : R.border;
    const attrs        = p.atributosEspecificos as Record<string, unknown> | null;
    const plataforma   = attrs?.['plataforma']      as string | undefined;
    const anio         = attrs?.['anio']            as number | undefined;
    const tasacion     = attrs?.['tasacion_ia_eur'] as number | undefined;

    return (
        <div
            style={{
                display:       'flex',
                flexDirection: 'column',
                height:        '100%',
                background:    R.surface,
                border:        `2px solid ${estadoColor}30`,
                borderRadius:  '0px',
                boxShadow:     `4px 4px 0 rgba(0,0,0,0.90)`,
                position:      'relative',
                overflow:      'hidden',
                opacity:       p.activo ? 1 : 0.50,
                transition:    'transform 130ms ease, box-shadow 130ms ease, border-color 130ms ease',
            }}
            onMouseEnter={e => {
                const d = e.currentTarget as HTMLDivElement;
                d.style.transform   = 'translate(-3px, -3px)';
                d.style.boxShadow   = `7px 7px 0 rgba(0,0,0,0.90), 0 0 22px ${estadoColor}30`;
                d.style.borderColor = `${estadoColor}70`;
            }}
            onMouseLeave={e => {
                const d = e.currentTarget as HTMLDivElement;
                d.style.transform   = 'translate(0,0)';
                d.style.boxShadow   = `4px 4px 0 rgba(0,0,0,0.90)`;
                d.style.borderColor = `${estadoColor}30`;
            }}
        >
            {/* Línea de acento superior — color del estado */}
            <div style={{
                position:   'absolute', top: 0, left: 0, right: 0,
                height:     '3px',
                background: `linear-gradient(90deg, transparent, ${estadoColor}, transparent)`,
                boxShadow:  `0 0 8px ${estadoColor}80`,
                zIndex:     5,
                pointerEvents: 'none',
            }} />

            {/* Scanlines — capa CRT muy sutil */}
            <div style={{
                position:      'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
                background:    'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
            }} />

            {/* Overlay VENDIDO — sello retro */}
            {!p.activo && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(5,4,3,0.75)',
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
                        textShadow:    `0 0 8px ${R.red}50`,
                    }}>VENDIDO</span>
                </div>
            )}

            {/* HUD bar — SKU · badge */}
            <div style={{
                background:     R.elevated,
                borderBottom:   `1px solid ${R.border}`,
                padding:        '6px 12px',
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                gap:            '8px',
            }}>
                <span style={{
                    fontFamily: 'Courier New, monospace', fontSize: '12px', fontWeight: 700,
                    color: R.sand, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{p.sku}</span>
                {badge && (
                    <span style={{
                        fontFamily: 'Courier New, monospace', fontSize: '12px', fontWeight: 700,
                        color: badge.color, letterSpacing: '0.08em', flexShrink: 0,
                        textShadow: `0 0 6px ${badge.color}50`,
                    }}>{badge.label}</span>
                )}
            </div>

            {/* Cuerpo */}
            <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <h3 style={{
                    fontFamily: 'Courier New, monospace', fontSize: '16px', fontWeight: 700,
                    letterSpacing: '0.03em', textTransform: 'uppercase',
                    color: R.cream, margin: 0, lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                }}>{p.nombre}</h3>

                {plataforma && (
                    <div style={{
                        fontFamily: 'Courier New, monospace', fontSize: '13px',
                        color: R.sand, letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                        <span style={{ color: R.amber }}>▶</span>
                        {plataforma}{anio ? ` / ${anio}` : ''}
                    </div>
                )}

                {p.descripcion && (
                    <p style={{
                        fontFamily: 'Courier New, monospace', fontSize: '13px',
                        color: R.dust, lineHeight: 1.6, margin: 0, flex: 1,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                    }}>{p.descripcion}</p>
                )}

                {/* Precio estilo HIGH SCORE */}
                <div style={{
                    borderTop:     `1px dashed ${R.border}`,
                    marginTop:     'auto',
                    paddingTop:    '11px',
                    paddingBottom: '14px',
                    background:    'rgba(0,0,0,0.18)',
                    borderRadius:  '0 0 0 0',
                }}>
                    <div style={{
                        fontFamily: 'Courier New, monospace', fontSize: '10px', fontWeight: 700,
                        letterSpacing: '0.20em', color: R.dust, textTransform: 'uppercase', marginBottom: '5px',
                    }}>HIGH SCORE</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontFamily: 'Courier New, monospace', fontSize: '30px', fontWeight: 700,
                            color: R.amberHi, lineHeight: 1,
                            textShadow: `0 0 12px rgba(255,224,128,0.26)`,
                        }}>€{p.precioVenta.toFixed(2)}</span>
                        {tasacion && (
                            <span style={{
                                fontFamily: 'Courier New, monospace', fontSize: '12px', color: R.dust,
                            }}>IA €{tasacion.toFixed(2)}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function BovedaRetroPage(): JSX.Element {

    // Activa el tema retro (tipografía + acentos ámbar) mientras esta página está montada.
    // Los fondos se sobreescriben directamente en html.style para que body y el shell
    // de la app reciban también los valores casi negros (el body usa var(--bg-base)).
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        html.classList.add('theme-retro');

        // Fondos: inline backgroundColor directo en html y body garantiza que
        // ninguna regla CSS (incluida html.theme-retro) pueda reintroducir
        // el tono cálido, independientemente de los custom properties.
        html.style.backgroundColor = '#060606';
        body.style.backgroundColor = '#060606';

        // Inline style en <html> tiene mayor especificidad que html.theme-retro { }
        html.style.setProperty('--bg-void',    '#040404');
        html.style.setProperty('--bg-base',    '#060606');
        html.style.setProperty('--bg-surface', '#0d0d0d');
        html.style.setProperty('--bg-elevated','#131313');
        html.style.setProperty('--bg-overlay', '#1a1a1a');
        // Acentos: totalmente neutros en los controles de UI (búsqueda,
        // paginación, focus rings) — el ámbar solo aparece en las RetroCards.
        html.style.setProperty('--accent-primary',      '#3e3e3e');
        html.style.setProperty('--accent-primary-glow', 'rgba(60,60,60,0.04)');
        html.style.setProperty('--accent-cyan',         '#363636');
        html.style.setProperty('--accent-cyan-glow',    'rgba(54,54,54,0.03)');
        html.style.setProperty('--border-subtle',       'rgba(200,194,184,0.08)');
        html.style.setProperty('--border-default',      'rgba(200,194,184,0.13)');
        html.style.setProperty('--text-primary',        '#f5ead8');
        html.style.setProperty('--text-secondary',      '#e8e2d8');
        html.style.setProperty('--text-muted',          '#c8c2b8');

        return (): void => {
            html.classList.remove('theme-retro');
            html.style.backgroundColor = '';
            body.style.backgroundColor = '';
            html.style.removeProperty('--bg-void');
            html.style.removeProperty('--bg-base');
            html.style.removeProperty('--bg-surface');
            html.style.removeProperty('--bg-elevated');
            html.style.removeProperty('--bg-overlay');
            html.style.removeProperty('--accent-primary');
            html.style.removeProperty('--accent-primary-glow');
            html.style.removeProperty('--accent-cyan');
            html.style.removeProperty('--accent-cyan-glow');
            html.style.removeProperty('--border-subtle');
            html.style.removeProperty('--border-default');
            html.style.removeProperty('--text-primary');
            html.style.removeProperty('--text-secondary');
            html.style.removeProperty('--text-muted');
        };
    }, []);

    const filters = useTableFilters({ key: 'boveda', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination, search: activeSearch, page: activePage, limit: activeLimit } = filters;

    const [rows,          setRows]          = useState<Producto[]>([]);
    const [isLoading,     setIsLoading]     = useState(true);
    const [filterEstado,  setFilterEstado]  = useState<EstadoKey>('TODOS');
    const [filterActivo,  setFilterActivo]  = useState<ActivoKey>('TODOS');
    const [modalOpen,     setModalOpen]     = useState(false);
    const [prefill,      setPrefill]      = useState<Partial<ProductForm> | undefined>(undefined);

    const [localData] = useState<Producto[]>(MOCK_PRODUCTOS.filter(p => p.tipoProducto === 'RETRO'));

    useEffect(() => {
        let cancelled = false;

        // Siempre activar loading — el skeleton solo se muestra si rows.length === 0,
        // así no hay parpadeo cuando ya hay datos cargados.
        setIsLoading(true);

        const params = buildParams();
        params.set('tipo', 'RETRO');
        if (filterEstado !== 'TODOS') params.set('estado', filterEstado);
        if (filterActivo === 'ACTIVOS')  params.set('activo', 'true');
        if (filterActivo === 'VENDIDOS') params.set('activo', 'false');

        api.get<PaginatedResponse<Producto>>(`/productos?${params.toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    // El backend puede ignorar los params estado/activo.
                    // Aplicamos filtro cliente sobre la respuesta como garantía.
                    const filteredContent = data.content.filter(p => {
                        const matchEstado = filterEstado === 'TODOS' || p.estadoConservacion === filterEstado;
                        const matchActivo = filterActivo === 'TODOS'
                            || (filterActivo === 'ACTIVOS' ? p.activo === true : p.activo === false);
                        return matchEstado && matchActivo;
                    });
                    const hasFilter = filterEstado !== 'TODOS' || filterActivo !== 'TODOS';
                    setRows(filteredContent);
                    setPagination(
                        hasFilter ? filteredContent.length                                   : data.totalElements,
                        hasFilter ? (Math.ceil(filteredContent.length / activeLimit) || 1)  : data.totalPages,
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

        return (): void => { cancelled = true; };
    }, [filters.querySignal, filterEstado, filterActivo, buildParams, setPagination, activeSearch, activePage, activeLimit, localData]);

    function handleRegistrar(data: Partial<ProductForm>): void { setPrefill(data); setModalOpen(true); }

    const handleSave = useCallback((
        data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>
    ): void => { void data; setModalOpen(false); setPrefill(undefined); }, []);

    return (
        <>
            <style>{`
                @keyframes retroBlink {
                    0%,49% { opacity:1; } 50%,100% { opacity:0; }
                }
                @keyframes retroGlow {
                    0%,100% { text-shadow: 0 0 10px rgba(196,138,18,0.28), 0 0 24px rgba(168,114,6,0.10); }
                    50%     { text-shadow: 0 0 16px rgba(196,138,18,0.42), 0 0 36px rgba(168,114,6,0.16); }
                }
                @keyframes retroFadeIn {
                    from { opacity:0; transform:translateY(8px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes skRetro {
                    0%,100% { opacity:0.15; } 50% { opacity:0.38; }
                }
                @keyframes pixelPulse {
                    0%,100% { opacity:0.25; transform:scale(1); }
                    50%     { opacity:0.80; transform:scale(1.35); }
                }
            `}</style>

            {/*
              Sobreescribimos las vars de fondo de theme-retro (que son cálidas/naranjas)
              con valores casi-negros. El ámbar sigue siendo el acento, pero no el fondo.
            */}
            <div
                className="crt-overlay"
                style={{
                    minHeight:   '100%',
                    background:  R.bg,
                    // Fondos casi negros — ningún tono cálido en el fondo
                    '--bg-void':     '#040404',
                    '--bg-base':     R.bg,
                    '--bg-surface':  R.surface,
                    '--bg-elevated': R.elevated,
                    '--bg-overlay':  '#141414',
                    // Acentos neutros en controles de UI — el ámbar solo aparece
                    // en las RetroCards (precio, badges, SKU) mediante R.amber / R.amberHi.
                    '--accent-primary':      '#3e3e3e',
                    '--accent-primary-glow': 'rgba(60,60,60,0.04)',
                    '--accent-cyan':         '#363636',
                    '--accent-cyan-glow':    'rgba(54,54,54,0.03)',
                    '--border-subtle':       'rgba(200,194,184,0.08)',
                    '--border-default':      'rgba(200,194,184,0.13)',
                    '--border-strong':       'rgba(200,194,184,0.22)',
                    // Texto: blanco cálido muy claro — "naranja muy claro, tirando a blanco"
                    '--text-primary':   R.cream,
                    '--text-secondary': R.sand,
                    '--text-muted':     R.dust,
                } as React.CSSProperties}
            >

                {/* ── Tasador IA ─────────────────────────────────────────────── */}
                <TasadorIA onRegistrar={handleRegistrar} />

                {/* ── Marquee header con puntos laterales animados ────────────── */}
                <div style={{
                    position:     'relative',
                    marginBottom: '24px',
                    padding:      '18px 20px',
                    border:       `1px solid ${R.border}`,
                    // Fondo muy sutil, casi transparente
                    background:   'transparent',
                    minHeight:    '56px',
                }}>
                    {/* ── Esquinas pixel art ── */}
                    {(['tl','tr','bl','br'] as const).map(pos => (
                        <div key={pos} style={{
                            position:    'absolute',
                            width: '10px', height: '10px',
                            top:    pos.startsWith('t') ? '-1px' : 'auto',
                            bottom: pos.startsWith('b') ? '-1px' : 'auto',
                            left:   pos.endsWith('l')   ? '-1px' : 'auto',
                            right:  pos.endsWith('r')   ? '-1px' : 'auto',
                            borderTop:    pos.startsWith('t') ? `2px solid ${R.amberHi}` : 'none',
                            borderBottom: pos.startsWith('b') ? `2px solid ${R.amberHi}` : 'none',
                            borderLeft:   pos.endsWith('l')   ? `2px solid ${R.amberHi}` : 'none',
                            borderRight:  pos.endsWith('r')   ? `2px solid ${R.amberHi}` : 'none',
                        }} />
                    ))}

                    {/* ── Contenido centrado entre los puntos ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <PixelDotSeparator />

                        <h1 style={{
                            fontFamily:    'Courier New, monospace',
                            fontSize:      'clamp(20px, 3vw, 32px)',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            color:         R.cream,
                            margin:        0,
                            lineHeight:    1,
                        }}>
                            La Bóveda{' '}
                            <span style={{ color: R.amberHi, animation: 'retroGlow 2.8s ease-in-out infinite' }}>
                                RETRO
                            </span>
                        </h1>

                        <PixelDotSeparator />

                        <span style={{
                            fontFamily:    'Courier New, monospace',
                            fontSize:      '13px',
                            color:         R.sand,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                        }}>Coleccionismo</span>

                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '1px', height: '14px', background: R.border, flexShrink: 0 }} />
                            <span style={{
                                fontFamily:    'Courier New, monospace',
                                fontSize:      '12px',
                                color:         R.amber,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                textShadow:    `0 0 6px rgba(255,184,48,0.30)`,
                                animation:     'retroBlink 1.2s step-end infinite',
                            }}>► INSERT COIN</span>
                        </span>
                    </div>
                </div>

                {/* ── Controles de búsqueda y filtros ────────────────────────── */}
                <div style={{ marginBottom: '24px' }}>
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
                                        // Siempre resetea filterActivo — así aunque filterEstado
                                        // ya fuera 'TODOS', filterActivo cambia y el effect se dispara.
                                        setFilterActivo('TODOS');
                                        filters.setPage(0);
                                    }}
                                />
                                <span style={{ width: '1px', height: '22px', background: R.border, flexShrink: 0 }} />
                                <ActivoFilter
                                    value={filterActivo}
                                    onChange={v => {
                                        setFilterActivo(v);
                                        // Siempre resetea filterEstado — misma razón.
                                        setFilterEstado('TODOS');
                                        filters.setPage(0);
                                    }}
                                />
                            </div>
                        }
                    />
                </div>

                {/* ── Grid de piezas ─────────────────────────────────────────── */}
                {/* Skeleton solo en la carga inicial (sin datos previos).
                    En cambios de filtro se conserva el grid con fade para evitar el parpadeo. */}
                {(isLoading && rows.length === 0) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                        {Array.from({ length: Math.min(filters.limit, 8) }).map((_, i) => (
                            <div key={i} style={{
                                background: R.surface, border: `2px solid ${R.border}`,
                                borderRadius: '0', boxShadow: '4px 4px 0 rgba(0,0,0,0.9)',
                                minHeight: '210px', overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '26px', background: R.elevated,
                                    borderBottom: `1px solid ${R.border}`,
                                    animation: `skRetro 1.5s ease-in-out ${i * 100}ms infinite`,
                                }} />
                                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[55, 80, 60].map((w, j) => (
                                        <div key={j} style={{
                                            height: '10px', width: `${w}%`, borderRadius: '0',
                                            background: `rgba(200,145,20,0.10)`,
                                            animation: `skRetro 1.5s ease-in-out ${i * 100 + j * 50}ms infinite`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        border: `1px solid ${R.border}`, background: R.surface,
                    }}>
                        <div style={{ fontFamily: 'Courier New, monospace', fontSize: '32px', color: `${R.amber}30`, marginBottom: '12px' }}>◈◈◈</div>
                        <div style={{ fontFamily: 'Courier New, monospace', fontSize: '14px', fontWeight: 700, color: R.sand, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            NO DATA FOUND
                        </div>
                        <div style={{ fontFamily: 'Courier New, monospace', fontSize: '11px', color: R.dust, letterSpacing: '0.08em' }}>
                            {filters.search ? `0 RESULTADOS PARA "${filters.search.toUpperCase()}"` : 'SIN PIEZAS EN EL CATÁLOGO'}
                        </div>
                    </div>
                ) : (
                    <div style={{
                        display:             'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gridAutoRows:        '252px',
                        gap:                 '18px',
                    }}>
                        {rows.map(p => <RetroCard key={p.id} producto={p} />)}
                    </div>
                )}
            </div>

            <ProductModal
                producto={null}
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setPrefill(undefined); }}
                onSave={handleSave}
                initialValues={prefill}
            />
        </>
    );
}
