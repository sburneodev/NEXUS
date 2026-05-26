import { useState, useMemo } from 'react';
import type { Producto, EstadoConservacion } from '../types/models';
import { MOCK_PRODUCTOS } from '../mocks/mockProductos';
import { TasadorIA } from '../components/boveda/TasadorIA';
import { ProductModal } from '../components/productos/ProductModal';
import type { ProductForm } from '../components/productos/ProductModal';

// ── Badge de conservación ─────────────────────────────────────────────
const BADGE_MAP: Record<EstadoConservacion, { label: string; color: string }> = {
    MINT:    { label: '★ MINT',    color: 'var(--accent-primary)' },
    CIB:     { label: '◈ CIB',     color: 'var(--accent-cyan)'    },
    LOOSE:   { label: '◎ LOOSE',   color: 'var(--text-secondary)' },
    LOOSE_D: { label: '▲ LOOSE-D', color: 'var(--accent-danger)'  },
};

// ── Tarjeta de pieza retro ────────────────────────────────────────────
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
            {/* Borde superior degradado (gradient no funciona en border-image con border-radius) */}
            <div style={{
                position:   'absolute',
                top:        0,
                left:       0,
                right:      0,
                height:     '2px',
                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))',
            }} />

            {/* Overlay vendido */}
            {!p.activo && (
                <div style={{
                    position:       'absolute',
                    inset:          0,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    background:     'rgba(5,5,10,0.75)',
                    zIndex:         2,
                    backdropFilter: 'blur(2px)',
                }}>
                    <span style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      'var(--text-xl)',
                        fontWeight:    700,
                        letterSpacing: '0.2em',
                        color:         'var(--accent-danger)',
                        border:        '2px solid var(--accent-danger)',
                        padding:       '4px 16px',
                        transform:     'rotate(-12deg)',
                    }}>VENDIDO</span>
                </div>
            )}

            {/* SKU + badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      'var(--text-xs)',
                    color:         'var(--accent-primary)',
                    letterSpacing: '0.08em',
                }}>{p.sku}</span>
                {badge && (
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        fontWeight:    700,
                        letterSpacing: '0.08em',
                        color:         badge.color,
                        border:        `1px solid ${badge.color}`,
                        borderRadius:  '3px',
                        padding:       '2px 7px',
                        whiteSpace:    'nowrap',
                        flexShrink:    0,
                    }}>{badge.label}</span>
                )}
            </div>

            {/* Nombre + plataforma */}
            <div>
                <h3 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'var(--text-base)',
                    fontWeight:    700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color:         'var(--text-primary)',
                    margin:        0,
                    lineHeight:    1.3,
                }}>{p.nombre}</h3>
                {plataforma && (
                    <div style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'var(--text-xs)',
                        color:         'var(--text-muted)',
                        letterSpacing: '0.06em',
                        marginTop:     'var(--space-1)',
                    }}>{plataforma}{anio ? ` · ${anio}` : ''}</div>
                )}
            </div>

            {/* Descripción */}
            {p.descripcion && (
                <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   'var(--text-sm)',
                    color:      'var(--text-secondary)',
                    lineHeight: 1.5,
                    margin:     0,
                    flex:       1,
                }}>{p.descripcion}</p>
            )}

            {/* Precio + tasación IA */}
            <div style={{
                borderTop:   '1px solid var(--border-subtle)',
                paddingTop:  'var(--space-3)',
                marginTop:   'auto',
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'var(--text-2xl)',
                        fontWeight:    700,
                        color:         'var(--accent-primary)',
                        letterSpacing: '-0.02em',
                        textShadow:    '0 0 16px rgba(0,255,136,0.3)',
                    }}>€{p.precioVenta.toFixed(2)}</span>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'var(--text-xs)',
                        color:         'var(--text-muted)',
                        letterSpacing: '0.04em',
                    }}>PVP</span>
                </div>
                {tasacion && (
                    <div style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        color:         'var(--text-muted)',
                        letterSpacing: '0.04em',
                        marginTop:     '3px',
                    }}>
                        Tasación IA: €{tasacion.toFixed(2)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────
export function BovedaRetroPage(): JSX.Element {
    const [search, setSearch]       = useState('');
    const [filter, setFilter]       = useState<EstadoConservacion | 'TODOS'>('TODOS');
    const [modalOpen, setModalOpen] = useState(false);
    const [prefill,  setPrefill]    = useState<Partial<ProductForm> | undefined>(undefined);
    const [products, setProducts]   = useState(MOCK_PRODUCTOS.filter(p => p.tipoProducto === 'RETRO'));

    // Filtrado
    const filtered = useMemo(() => products.filter(p => {
        const matchSearch = search === ''
            || p.nombre.toLowerCase().includes(search.toLowerCase())
            || p.sku.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'TODOS' || p.estadoConservacion === filter;
        return matchSearch && matchFilter;
    }), [products, search, filter]);

    const disponibles = filtered.filter(p => p.activo).length;

    // Cuando TasadorIA indica "Registrar" → abrir modal con prefill
    function handleRegistrar(data: Partial<ProductForm>): void {
        setPrefill(data);
        setModalOpen(true);
    }

    // Guardar nuevo producto desde el modal
    function handleSave(data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn'>): void {
        const newProd: Producto = {
            ...data,
            id:           Date.now(),
            creadoEn:     new Date().toISOString(),
            actualizadoEn: new Date().toISOString(),
        };
        setProducts(prev => [newProd, ...prev]);
        setModalOpen(false);
        setPrefill(undefined);
    }

    return (
        <div style={{ background: 'var(--bg-base)', minHeight: '100%' }}>

            {/* ── Tasador IA ── */}
            <TasadorIA onRegistrar={handleRegistrar} />

            {/* ── Cabecera catálogo ── */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   'var(--text-2xl)',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>◆</span>
                    <h1 style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      'var(--text-3xl)',
                        fontWeight:    700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color:         'var(--text-primary)',
                        margin:        0,
                    }}>
                        La Bóveda{' '}
                        <span style={{
                            background:           'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor:  'transparent',
                            backgroundClip:       'text',
                        }}>Retro</span>
                    </h1>
                </div>
                <p style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      'var(--text-sm)',
                    color:         'var(--text-muted)',
                    letterSpacing: '0.06em',
                }}>
                    {disponibles} pieza{disponibles !== 1 ? 's' : ''} disponible{disponibles !== 1 ? 's' : ''} de {products.length} en catálogo · Coleccionismo desde 1978
                </p>
            </div>

            {/* ── Barra de búsqueda ── */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                <input
                    type="search"
                    placeholder="Buscar por nombre o SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex:         1,
                        minWidth:     '200px',
                        fontFamily:   'var(--font-mono)',
                        fontSize:     'var(--text-sm)',
                        color:        'var(--text-primary)',
                        background:   'var(--bg-surface)',
                        border:       '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-base)',
                        padding:      'var(--space-3) var(--space-4)',
                        outline:      'none',
                        caretColor:   'var(--accent-primary)',
                        transition:   'border-color 160ms ease',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                />
                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value as EstadoConservacion | 'TODOS')}
                    style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      'var(--text-xs)',
                        fontWeight:    600,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color:         'var(--text-primary)',
                        background:    'var(--bg-surface)',
                        border:        '1px solid var(--border-default)',
                        borderRadius:  'var(--radius-base)',
                        padding:       'var(--space-3) var(--space-4)',
                        outline:       'none',
                        cursor:        'pointer',
                    }}
                >
                    <option value="TODOS">Todos los estados</option>
                    <option value="MINT">MINT</option>
                    <option value="CIB">CIB</option>
                    <option value="LOOSE">LOOSE</option>
                    <option value="LOOSE_D">LOOSE-D</option>
                </select>
            </div>

            {/* ── Grid de piezas ── */}
            {filtered.length === 0 ? (
                <div style={{
                    textAlign:     'center',
                    padding:       'var(--space-16)',
                    fontFamily:    'var(--font-mono)',
                    fontSize:      'var(--text-sm)',
                    color:         'var(--text-muted)',
                    letterSpacing: '0.08em',
                }}>SIN PIEZAS ENCONTRADAS</div>
            ) : (
                <div style={{
                    display:             'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap:                 'var(--space-5)',
                }}>
                    {filtered.map(p => <RetroCard key={p.id} producto={p} />)}
                </div>
            )}

            {/* ── Modal de alta precargado ── */}
            <ProductModal
                producto={null}
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setPrefill(undefined); }}
                onSave={handleSave}
                initialValues={prefill}
            />
        </div>
    );
}
