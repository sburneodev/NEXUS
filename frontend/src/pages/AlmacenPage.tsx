import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────
interface RackData {
    nivel: number;
    id_producto: number | null;
    sku: string | null;
    nombre: string | null;
    stock_actual: number | null;
    stock_minimo: number | null;
    tipo_producto: 'ESTANDAR' | 'RETRO' | null;
    estado_conservacion: string | null;
    bajo_minimo: boolean;
}
type NivelMap = Record<string, RackData>;
type EstanteriaMap = Record<string, NivelMap>;
type PasilloMap = Record<string, EstanteriaMap>;
interface MapaResponse { mapa: PasilloMap; total_racks: number; racks_ocupados: number; }
interface RackSeleccionado { pasillo: string; estanteria: string; racks: RackData[]; }

// ── Constantes ────────────────────────────────────────────────────────
const ESTANTERIAS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const LEFT_SIDE   = ['P4', 'P3', 'P2', 'P1'] as const;
const RIGHT_SIDE  = ['P8', 'P7', 'P6', 'P5'] as const;

// Capacidad física real: 8 pasillos × 6 estanterías = 48 racks
const MAX_RACKS = 48;

// ── Mock data ─────────────────────────────────────────────────────────
const MOCK: MapaResponse = {
    total_racks: 96, racks_ocupados: 11,
    mapa: {
        P1: {
            A: { 1: { nivel:1, id_producto:1, sku:'RET-SNES-001', nombre:'Super Mario World — SNES CIB', stock_actual:1, stock_minimo:1, tipo_producto:'RETRO', estado_conservacion:'CIB', bajo_minimo:false } },
            B: { 1: { nivel:1, id_producto:2, sku:'RET-SNES-002', nombre:'Donkey Kong Country — SNES MINT', stock_actual:1, stock_minimo:1, tipo_producto:'RETRO', estado_conservacion:'MINT', bajo_minimo:false } },
            C: { 1: { nivel:1, id_producto:3, sku:'STD-PS5-001', nombre:'God of War Ragnarök — PS5', stock_actual:42, stock_minimo:5, tipo_producto:'ESTANDAR', estado_conservacion:null, bajo_minimo:false } },
            D: {}, E: {}, F: {},
        },
        P2: { A: {}, B: {}, C: { 1: { nivel:1, id_producto:4, sku:'RET-N64-001', nombre:'Zelda: OoT — N64 CIB', stock_actual:1, stock_minimo:1, tipo_producto:'RETRO', estado_conservacion:'CIB', bajo_minimo:false } }, D: {}, E: {}, F: {} },
        P3: { A: { 1: { nivel:1, id_producto:5, sku:'STD-PS5-002', nombre:'Elden Ring — PS5', stock_actual:28, stock_minimo:5, tipo_producto:'ESTANDAR', estado_conservacion:null, bajo_minimo:false } }, B: {}, C: {}, D: {}, E: {}, F: {} },
        P4: { A: { 1: { nivel:1, id_producto:7, sku:'STD-ACC-001', nombre:'DualSense PS5 Blanco', stock_actual:3, stock_minimo:5, tipo_producto:'ESTANDAR', estado_conservacion:null, bajo_minimo:true } }, B: {}, C: {}, D: {}, E: {}, F: {} },
        P5: { A: { 1: { nivel:1, id_producto:8, sku:'RET-N64-002', nombre:'Zelda Majora\'s Mask — N64', stock_actual:2, stock_minimo:5, tipo_producto:'RETRO', estado_conservacion:'LOOSE', bajo_minimo:true } }, B: {}, C: {}, D: {}, E: {}, F: {} },
        P6: { A: { 1: { nivel:1, id_producto:9, sku:'STD-NSW-001', nombre:'Zelda: TOTK — Switch', stock_actual:55, stock_minimo:10, tipo_producto:'ESTANDAR', estado_conservacion:null, bajo_minimo:false } }, B: {}, C: {}, D: {}, E: {}, F: {} },
        P7: { A: {}, B: {}, C: { 1: { nivel:1, id_producto:10, sku:'STD-FNK-001', nombre:'Funko Pop! Link #856', stock_actual:35, stock_minimo:5, tipo_producto:'ESTANDAR', estado_conservacion:null, bajo_minimo:false } }, D: {}, E: {}, F: {} },
        P8: { A: {}, B: {}, C: {}, D: {}, E: {}, F: {} },
    },
};

// ── Helpers ───────────────────────────────────────────────────────────
function racksDeEstanteria(m: NivelMap): RackData[] { return Object.values(m); }

function cellStatus(racks: RackData[]): 'empty' | 'ok' | 'low' | 'critical' | 'retro' {
    // Un rack está ocupado solo si tiene producto CON stock > 0
    const occ = racks.filter(r => r.id_producto !== null && (r.stock_actual ?? 0) > 0);
    if (occ.length === 0) return 'empty';
    if (occ.some(r => r.tipo_producto === 'RETRO')) return 'retro';
    if (occ.some(r => r.bajo_minimo)) return 'critical';
    return 'ok';
}

// Calcula ocupación física real: racks únicos (pasillo+estantería) con stock > 0 / MAX_RACKS
function calcularOcupacionVisual(mapa: PasilloMap): { pct: number; ocupados: number; libres: number; criticos: number } {
    const ocupadosSet = new Set<string>();
    let criticos = 0;

    for (const [pasillo, em] of Object.entries(mapa)) {
        for (const [estanteria, nm] of Object.entries(em)) {
            const racks = Object.values(nm);
            const conStock = racks.filter(r => r.id_producto !== null && (r.stock_actual ?? 0) > 0);
            if (conStock.length > 0) {
                ocupadosSet.add(`${pasillo}:${estanteria}`);
                if (conStock.some(r => r.bajo_minimo && r.tipo_producto !== 'RETRO')) criticos++;
            }
        }
    }

    const ocupados = ocupadosSet.size;
    return {
        pct:      Math.round((ocupados / MAX_RACKS) * 100),
        ocupados,
        libres:   MAX_RACKS - ocupados,
        criticos,
    };
}

const STATUS_COLOR: Record<string, string> = {
    empty:    'var(--border-subtle)',
    ok:       'var(--accent-primary)',
    low:      'var(--accent-cyan)',
    retro:    'var(--accent-gold)',
    critical: 'var(--accent-danger)',
};
const STATUS_BG: Record<string, string> = {
    empty:    'transparent',
    ok:       'rgba(0,255,136,0.09)',
    low:      'rgba(0,212,255,0.08)',
    retro:    'rgba(255,200,69,0.10)',
    critical: 'rgba(255,68,102,0.13)',
};

// ── Celda individual ──────────────────────────────────────────────────
interface CellProps {
    racks:       RackData[];
    estanteria:  string;
    selected:    boolean;
    highlighted: boolean;
    onClick:     () => void;
}
function Cell({ racks, estanteria, selected, highlighted, onClick }: CellProps): JSX.Element {
    const status  = cellStatus(racks);
    const occ     = racks.filter(r => r.id_producto !== null);
    const first   = occ[0] ?? null;
    const isEmpty = status === 'empty';

    const border = selected
        ? '2px solid var(--accent-cyan)'
        : highlighted
        ? '2px dashed var(--accent-gold)'
        : `1.5px solid ${STATUS_COLOR[status]}`;

    return (
        <div
            onClick={isEmpty ? undefined : onClick}
            title={first?.nombre ?? undefined}
            style={{
                flex:           1,
                minWidth:       0,
                minHeight:      0,
                border,
                borderRadius:   '8px',
                background:     selected ? 'rgba(0,212,255,0.14)' : STATUS_BG[status],
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         isEmpty ? 'default' : 'pointer',
                gap:            '4px',
                padding:        '6px 4px',
                transition:     'all 140ms ease',
                boxShadow:      selected
                    ? '0 0 12px rgba(0,212,255,0.30)'
                    : status !== 'empty'
                    ? `0 0 8px ${STATUS_COLOR[status]}33`
                    : 'none',
            }}
        >
            {!isEmpty ? (
                <>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   'clamp(14px, 2.2vh, 26px)',
                        fontWeight: 700,
                        color:      STATUS_COLOR[status],
                        lineHeight: 1,
                    }}>
                        {first!.stock_actual}
                    </span>
                    <span style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      'clamp(9px, 1.1vh, 13px)',
                        fontWeight:    700,
                        letterSpacing: '0.08em',
                        color:         'var(--text-muted)',
                    }}>
                        {estanteria}
                    </span>
                </>
            ) : (
                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(11px, 1.4vh, 16px)',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    color:         'var(--border-default)',
                    opacity:       0.45,
                }}>
                    {estanteria}
                </span>
            )}
        </div>
    );
}

// ── Fila de pasillo ───────────────────────────────────────────────────
interface PasilloRowProps {
    pasillo:      string;
    side:         'left' | 'right';
    mapa:         PasilloMap;
    seleccionado: RackSeleccionado | null;
    skuResaltado: string;
    onSelect:     (r: RackSeleccionado | null) => void;
}
function PasilloRow({ pasillo, side, mapa, seleccionado, skuResaltado, onSelect }: PasilloRowProps): JSX.Element {
    const label = (
        <div style={{
            width:          '40px',
            flexShrink:     0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
        }}>
            <span style={{
                fontFamily:    'var(--font-display)',
                fontSize:      'clamp(12px, 1.6vh, 18px)',
                fontWeight:    700,
                color:         'var(--accent-cyan)',
                letterSpacing: '0.10em',
            }}>
                {pasillo}
            </span>
        </div>
    );

    return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', gap: '6px', minHeight: 0 }}>
            {side === 'left' && label}
            {ESTANTERIAS.map(est => {
                const nivelMap = mapa[pasillo]?.[est] ?? {};
                const racks    = racksDeEstanteria(nivelMap);
                const isSel    = seleccionado?.pasillo === pasillo && seleccionado?.estanteria === est;
                const isHighl  = Boolean(skuResaltado && racks.some(r => r.sku === skuResaltado));
                return (
                    <Cell
                        key={est}
                        racks={racks}
                        estanteria={est}
                        selected={isSel}
                        highlighted={isHighl}
                        onClick={() => {
                            const hasData = racks.some(r => r.id_producto !== null);
                            if (!hasData) return;
                            onSelect(isSel ? null : { pasillo, estanteria: est, racks });
                        }}
                    />
                );
            })}
            {side === 'right' && label}
        </div>
    );
}

// ── Panel de información lateral (siempre visible) ────────────────────
interface InfoPanelProps {
    sel:          RackSeleccionado | null;
    skuResaltado: string;
    onClose:      () => void;
}
function InfoPanel({ sel, skuResaltado, onClose }: InfoPanelProps): JSX.Element {
    const ocupados = sel
        ? sel.racks.filter(r => r.id_producto !== null).sort((a, b) => a.nivel - b.nivel)
        : [];

    return (
        <div style={{
            width:        '100%',
            height:       '100%',
            display:      'flex',
            flexDirection:'column',
            background:   'var(--bg-surface)',
            border:       '1px solid var(--border-default)',
            borderRadius: '10px',
            overflow:     'hidden',
        }}>
            {/* Cabecera del panel — compacta para el 20% de ancho */}
            <div style={{
                padding:        '9px 10px',
                borderBottom:   '1px solid var(--border-subtle)',
                background:     'var(--bg-elevated)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                flexShrink:     0,
            }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '9px',
                        fontWeight:    700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color:         'var(--accent-cyan)',
                        marginBottom:  '2px',
                        whiteSpace:    'nowrap',
                        overflow:      'hidden',
                        textOverflow:  'ellipsis',
                    }}>
                        ◈ DETALLE
                    </div>
                    <div style={{
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '11px',
                        fontWeight:   700,
                        color:        sel ? 'var(--text-primary)' : 'var(--text-muted)',
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {sel ? `${sel.pasillo} — ${sel.estanteria}` : '— —'}
                    </div>
                    {sel && (
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-muted)', marginTop:'1px' }}>
                            {ocupados.length} producto{ocupados.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
                {sel && (
                    <button
                        onClick={onClose}
                        style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'13px', lineHeight:1, padding:'3px', flexShrink:0, marginLeft:'4px' }}
                    >✕</button>
                )}
            </div>

            {/* Contenido */}
            {/* paddingBottom:104px garantiza que el FAB flotante nunca tape
                el último elemento al hacer scroll en el panel derecho.     */}
            <div style={{ flex:1, overflowY:'auto', padding:'8px', paddingBottom:'104px', display:'flex', flexDirection:'column', gap:'6px' }}>
                {!sel ? (
                    /* Estado vacío */
                    <div style={{
                        flex:           1,
                        display:        'flex',
                        flexDirection:  'column',
                        alignItems:     'center',
                        justifyContent: 'center',
                        gap:            '8px',
                        padding:        '16px 8px',
                        textAlign:      'center',
                    }}>
                        <div style={{ fontSize:'22px', opacity:0.18 }}>▦</div>
                        <div style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '9px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            color:         'var(--text-muted)',
                            lineHeight:    1.5,
                        }}>
                            Selecciona una celda para ver su contenido
                        </div>
                        <div style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '9px',
                            color:         'var(--border-default)',
                            letterSpacing: '0.04em',
                        }}>
                            Solo celdas ocupadas
                        </div>
                    </div>
                ) : ocupados.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'16px 8px', fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.08em' }}>
                        RACK VACÍO
                    </div>
                ) : (
                    ocupados.map(rack => {
                        const hl = Boolean(skuResaltado && rack.sku === skuResaltado);
                        return (
                            <div key={rack.nivel} style={{
                                background:   hl ? 'var(--accent-gold-glow)' : 'var(--bg-elevated)',
                                border:       `1px solid ${hl ? 'var(--accent-gold)' : rack.bajo_minimo ? 'var(--accent-danger)' : 'var(--border-subtle)'}`,
                                borderRadius: '6px',
                                padding:      '7px 9px',
                            }}>
                                {/* SKU + badges */}
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'3px', gap:'4px' }}>
                                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--accent-cyan)', letterSpacing:'0.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        N{rack.nivel} · {rack.sku}
                                    </span>
                                    <div style={{ display:'flex', gap:'2px', flexShrink:0 }}>
                                        {rack.tipo_producto === 'RETRO' && (
                                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'7px', color:'var(--accent-gold)', border:'1px solid var(--accent-gold)', borderRadius:'2px', padding:'0 3px', lineHeight:'13px' }}>R</span>
                                        )}
                                        {rack.bajo_minimo && (
                                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'7px', color:'var(--accent-danger)', border:'1px solid var(--accent-danger)', borderRadius:'2px', padding:'0 3px', lineHeight:'13px' }}>!</span>
                                        )}
                                    </div>
                                </div>
                                {/* Nombre del producto */}
                                <div style={{ fontFamily:'var(--font-body)', fontSize:'10px', color:'var(--text-primary)', fontWeight:500, marginBottom:'5px', lineHeight:1.3,
                                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>
                                    {rack.nombre}
                                </div>
                                {/* Métricas en fila compacta */}
                                <div style={{ display:'flex', gap:'10px' }}>
                                    <div>
                                        <div style={{ fontFamily:'var(--font-display)', fontSize:'7px', fontWeight:700, letterSpacing:'0.08em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'1px' }}>Stock</div>
                                        <div style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:700, color: rack.bajo_minimo ? 'var(--accent-danger)' : 'var(--accent-primary)', lineHeight:1 }}>
                                            {rack.stock_actual}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontFamily:'var(--font-display)', fontSize:'7px', fontWeight:700, letterSpacing:'0.08em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'1px' }}>Mín.</div>
                                        <div style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:700, color:'var(--text-secondary)', lineHeight:1 }}>
                                            {rack.stock_minimo}
                                        </div>
                                    </div>
                                    {rack.estado_conservacion && (
                                        <div>
                                            <div style={{ fontFamily:'var(--font-display)', fontSize:'7px', fontWeight:700, letterSpacing:'0.08em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'1px' }}>Est.</div>
                                            <div style={{ fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:700, color:'var(--accent-gold)', lineHeight:1 }}>
                                                {rack.estado_conservacion}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────
export function AlmacenPage(): JSX.Element {
    const [mapaData, setMapaData]           = useState<MapaResponse>(MOCK);
    const [loading, setLoading]             = useState(true);
    const [seleccionado, setSeleccionado]   = useState<RackSeleccionado | null>(null);
    const [busqueda, setBusqueda]           = useState('');
    const [skuResaltado, setSkuResaltado]   = useState('');

    useEffect(() => {
        api.get<MapaResponse>('/almacen/mapa')
            .then(({ data }) => { setMapaData(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const { pct: pctOcupado, ocupados, libres, criticos } = useMemo(
        () => calcularOcupacionVisual(mapaData.mapa),
        [mapaData]
    );

    const handleBuscar = useCallback(() => {
        if (!busqueda.trim()) { setSkuResaltado(''); return; }
        const sku = busqueda.trim().toUpperCase();
        setSkuResaltado(sku);
        const mapa = mapaData.mapa;
        for (const [pasillo, em] of Object.entries(mapa)) {
            for (const [estanteria, nm] of Object.entries(em)) {
                const racks = racksDeEstanteria(nm);
                if (racks.some(r => r.sku === sku)) {
                    setSeleccionado({ pasillo, estanteria, racks });
                    return;
                }
            }
        }
    }, [busqueda, mapaData]);

    const mapa = mapaData.mapa;

    return (
        <>
            <style>{`
                @keyframes terminalBlink { 0%,100%{opacity:1} 50%{opacity:0} }
                /* Responsive: tablet/móvil → columna única, mapa arriba info abajo */
                @media (max-width: 900px) {
                    .almacen-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            <div style={{
                height:        'calc(100dvh - 104px)',
                display:       'flex',
                flexDirection: 'column',
                gap:           '8px',
                overflow:      'hidden',
            }}>

                {/* ── Status bar ─────────────────────────────────────────── */}
                <div style={{
                    flexShrink:     0,
                    height:         '48px',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    background:     'var(--bg-surface)',
                    border:         '1px solid var(--border-subtle)',
                    borderRadius:   '8px',
                    padding:        '0 18px',
                    gap:            '16px',
                }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:'13px', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-primary)' }}>
                            ▦ PLANO DEL ALMACÉN
                        </span>
                        {/* Ocupación */}
                        <div style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:700, color: pctOcupado > 85 ? 'var(--accent-danger)' : pctOcupado > 60 ? 'var(--accent-gold)' : 'var(--accent-primary)', letterSpacing:'0.04em' }}>
                                {pctOcupado}% ocupado
                            </span>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.04em', marginTop:'2px' }}>
                                {ocupados} en uso · {libres} libres de {MAX_RACKS}
                            </span>
                        </div>
                        {criticos > 0 && (
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--accent-danger)', letterSpacing:'0.04em' }}>
                                ⚠ {criticos} bajo mínimo
                            </span>
                        )}
                        {loading && (
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--accent-cyan)' }}>
                                CARGANDO<span style={{ animation:'terminalBlink 0.8s step-end infinite' }}>█</span>
                            </span>
                        )}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                        {([ ['Stock OK','var(--accent-primary)'], ['Stock bajo','var(--accent-cyan)'], ['Retro','var(--accent-gold)'], ['Crítico','var(--accent-danger)'] ] as [string,string][]).map(([lbl, col]) => (
                            <div key={lbl} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                <div style={{ width:'11px', height:'11px', borderRadius:'3px', background:col, flexShrink:0 }} />
                                <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-secondary)', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{lbl}</span>
                            </div>
                        ))}
                        <div style={{ display:'flex', gap:'6px' }}>
                            <input
                                type="text" placeholder="SKU..." value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                                style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-primary)', background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:'5px', padding:'4px 10px', outline:'none', width:'120px', caretColor:'var(--accent-cyan)' }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                            />
                            <button onClick={handleBuscar} style={{ fontFamily:'var(--font-display)', fontSize:'10px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', padding:'4px 10px', background:'transparent', color:'var(--accent-cyan)', border:'1px solid var(--accent-cyan)', borderRadius:'5px', cursor:'pointer' }}>
                                BUSCAR
                            </button>
                            {skuResaltado && (
                                <button onClick={() => { setSkuResaltado(''); setBusqueda(''); setSeleccionado(null); }} aria-label="Limpiar filtro de SKU" style={{ fontFamily:'var(--font-mono)', fontSize:'10px', padding:'4px 8px', background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border-subtle)', borderRadius:'5px', cursor:'pointer' }}>✕</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Cuerpo principal: Mapa 70% (izq) + Panel Info 30% (dcha) ── */}
                <div className="almacen-grid" style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'80% 20%', gap:'8px' }}>

                    {/* Mapa del almacén — columna izquierda 70% */}
                    <div style={{ minWidth:0, minHeight:0, display:'flex', flexDirection:'column', gap:'8px', overflow:'hidden' }}>

                        {/* Grid de pasillos + corredor */}
                        <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 52px 1fr', gap:'8px' }}>

                            {/* Izquierda: P4 P3 P2 P1 */}
                            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                {LEFT_SIDE.map(p => (
                                    <PasilloRow key={p} pasillo={p} side="left" mapa={mapa}
                                        seleccionado={seleccionado} skuResaltado={skuResaltado}
                                        onSelect={setSeleccionado} />
                                ))}
                            </div>

                            {/* Centro: CORREDOR */}
                            <div style={{
                                display:        'flex',
                                flexDirection:  'column',
                                alignItems:     'center',
                                justifyContent: 'space-between',
                                background:     'var(--bg-surface)',
                                border:         '1px solid var(--border-subtle)',
                                borderRadius:   '8px',
                                padding:        '8px 0',
                            }}>
                                <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', fontWeight:600, letterSpacing:'0.18em', color:'var(--text-muted)', textTransform:'uppercase', writingMode:'vertical-rl', transform:'rotate(180deg)' }}>
                                    CORREDOR
                                </span>
                                <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-evenly', alignItems:'center' }}>
                                    {[0,1,2].map(i => (
                                        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'clamp(10px,1.2vh,14px)', color:'var(--accent-cyan)', opacity:0.5 }}>↑</span>
                                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'clamp(10px,1.2vh,14px)', color:'var(--accent-cyan)', opacity:0.3 }}>↓</span>
                                        </div>
                                    ))}
                                </div>
                                <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', fontWeight:600, letterSpacing:'0.18em', color:'var(--text-muted)', textTransform:'uppercase', writingMode:'vertical-rl', transform:'rotate(180deg)' }}>
                                    CORREDOR
                                </span>
                            </div>

                            {/* Derecha: P8 P7 P6 P5 */}
                            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                {RIGHT_SIDE.map(p => (
                                    <PasilloRow key={p} pasillo={p} side="right" mapa={mapa}
                                        seleccionado={seleccionado} skuResaltado={skuResaltado}
                                        onSelect={setSeleccionado} />
                                ))}
                            </div>
                        </div>

                        {/* Barra ENTRADA / SALIDA */}
                        <div style={{
                            flexShrink:     0,
                            height:         '28px',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            background:     'var(--bg-surface)',
                            border:         '1px solid var(--border-subtle)',
                            borderRadius:   '6px',
                        }}>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', fontWeight:600, letterSpacing:'0.20em', color:'var(--text-muted)', textTransform:'uppercase' }}>
                                ↑ ENTRADA / SALIDA ↑
                            </span>
                        </div>
                    </div>

                    {/* Panel de información — columna derecha 30% */}
                    <InfoPanel
                        sel={seleccionado}
                        skuResaltado={skuResaltado}
                        onClose={() => setSeleccionado(null)}
                    />

                </div>
            </div>
        </>
    );
}
