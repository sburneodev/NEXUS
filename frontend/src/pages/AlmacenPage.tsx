/**
 * pages/AlmacenPage.tsx — UI-08
 *
 * Mapa interactivo 2D del almacén NEXUS ERP.
 * SVG nativo — sin librerías externas de mapas.
 * Consume GET /api/almacen/mapa (AlmacenController.java ya existente).
 *
 * Estructura de datos del backend:
 *   mapa[pasillo][estanteria][nivel] = { sku, nombre, stock_actual,
 *                                        stock_minimo, tipo_producto,
 *                                        bajo_minimo }
 */

import { useEffect, useState, useMemo } from 'react';
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

interface MapaResponse {
    mapa: PasilloMap;
    total_racks: number;
    racks_ocupados: number;
}

interface RackSeleccionado {
    pasillo: string;
    estanteria: string;
    racks: RackData[];
}

// ── Helpers ───────────────────────────────────────────────────────────

const PASILLOS_ORDEN = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
const ESTANTERIAS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Calcula el color del rack según ocupación y tipo */
function colorRack(racks: RackData[]): string {
    const ocupados = racks.filter(r => r.id_producto !== null);
    if (ocupados.length === 0) return 'var(--bg-overlay)';

    const tieneRetro = ocupados.some(r => r.tipo_producto === 'RETRO');
    const tieneCritico = ocupados.some(r => r.bajo_minimo);

    if (tieneCritico) return 'var(--accent-danger)';
    if (tieneRetro) return 'var(--accent-gold)';

    const ratio = ocupados.length / Math.max(racks.length, 1);
    if (ratio >= 0.8) return 'var(--accent-primary)';
    if (ratio >= 0.5) return 'var(--accent-cyan)';
    return 'rgba(0,212,255,0.35)';
}

/** Extrae todos los racks de una estantería como array plano */
function racksDeEstanteria(nivelMap: NivelMap): RackData[] {
    return Object.values(nivelMap);
}

// ── Componente SVG del rack individual ───────────────────────────────

interface RackSVGProps {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    racks: RackData[];
    seleccionado: boolean;
    onClick: () => void;
}

function RackSVG({ x, y, w, h, label, racks, seleccionado, onClick }: RackSVGProps): JSX.Element {
    const color = colorRack(racks);
    const ocupados = racks.filter(r => r.id_producto !== null).length;
    const total = racks.length;
    const vacio = ocupados === 0;

    return (
        <g
            onClick={onClick}
            style={{ cursor: vacio ? 'default' : 'pointer' }}
            className="rack-group"
        >
            {/* Fondo del rack */}
            <rect
                x={x} y={y} width={w} height={h}
                rx={3}
                fill={color}
                fillOpacity={seleccionado ? 1 : vacio ? 0.25 : 0.7}
                stroke={seleccionado ? 'var(--accent-primary)' : color}
                strokeWidth={seleccionado ? 2 : 1}
                strokeOpacity={seleccionado ? 1 : 0.5}
            />

            {/* Borde extra si está seleccionado */}
            {seleccionado && (
                <rect
                    x={x - 2} y={y - 2}
                    width={w + 4} height={h + 4}
                    rx={4}
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                />
            )}

            {/* Etiqueta estantería */}
            <text
                x={x + w / 2}
                y={y + h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={vacio ? 'var(--text-muted)' : 'var(--text-inverse)'}
                fontSize={10}
                fontFamily="var(--font-mono)"
                fontWeight={700}
            >
                {label}
            </text>

            {/* Indicador de ocupación abajo */}
            {!vacio && (
                <text
                    x={x + w / 2}
                    y={y + h - 5}
                    textAnchor="middle"
                    fill="var(--text-inverse)"
                    fontSize={7}
                    fontFamily="var(--font-mono)"
                    fillOpacity={0.75}
                >
                    {ocupados}/{total}
                </text>
            )}
        </g>
    );
}

// ── Página principal ──────────────────────────────────────────────────

export function AlmacenPage(): JSX.Element {
    const [mapaData, setMapaData] = useState<MapaResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [seleccionado, setSeleccionado] = useState<RackSeleccionado | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [skuResaltado, setSkuResaltado] = useState('');

    useEffect(() => {
        api.get<MapaResponse>('/almacen/mapa')
            .then(({ data }) => { setMapaData(data); setLoading(false); })
            .catch(() => { setError('No se pudo cargar el mapa del almacén.'); setLoading(false); });
    }, []);

    // Estadísticas rápidas
    const stats = useMemo(() => {
        if (!mapaData) return { pasillos: 0, ocupados: 0, criticos: 0, total: 0 };
        const mapa = mapaData.mapa;
        let criticos = 0;

        Object.values(mapa).forEach(estMap =>
            Object.values(estMap).forEach(nivelMap =>
                Object.values(nivelMap).forEach(r => { if (r.bajo_minimo) criticos++; })
            )
        );

        return {
            pasillos: Object.keys(mapa).length,
            ocupados: mapaData.racks_ocupados,
            criticos,
            total: mapaData.total_racks,
        };
    }, [mapaData]);

    function handleBuscar(): void {
        if (!mapaData || !busqueda.trim()) { setSkuResaltado(''); return; }
        const sku = busqueda.trim().toUpperCase();
        setSkuResaltado(sku);

        // Encontrar el rack que contiene ese SKU y seleccionarlo
        const mapa = mapaData.mapa;
        for (const [pasillo, estMap] of Object.entries(mapa)) {
            for (const [estanteria, nivelMap] of Object.entries(estMap)) {
                const racks = racksDeEstanteria(nivelMap);
                if (racks.some(r => r.sku === sku)) {
                    setSeleccionado({ pasillo, estanteria, racks });
                    return;
                }
            }
        }
    }

    // ── SVG layout ────────────────────────────────────────────────────
    const RACK_W = 48;
    const RACK_H = 38;
    const GAP_X = 10;
    const GAP_Y = 10;
    const PASILLO_SEP = 28;
    const LABEL_W = 32;
    const PADDING = 16;

    // Cuántas estanterías hay en cada pasillo (max 6 = A-F)
    function estanteriasDePassillo(pasillo: string): string[] {
        if (!mapaData) return ESTANTERIAS;
        const estMap = mapaData.mapa[pasillo];
        if (!estMap) return [];
        return Object.keys(estMap).sort();
    }

    // Calcula posición X del pasillo en el SVG
    function xDePasillo(idx: number): number {
        return PADDING + LABEL_W + idx * (ESTANTERIAS.length * (RACK_W + GAP_X) + PASILLO_SEP);
    }

    const pasillosPresentes = PASILLOS_ORDEN.filter(p => mapaData?.mapa[p]);
    const svgWidth = PADDING * 2 + LABEL_W + pasillosPresentes.length * (ESTANTERIAS.length * (RACK_W + GAP_X) + PASILLO_SEP);
    const svgHeight = PADDING * 2 + 24 + ESTANTERIAS.length * (RACK_H + GAP_Y);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
                    CARGANDO MAPA DEL ALMACÉN...
                    <span style={{ animation: 'terminalBlink 0.8s step-end infinite', marginLeft: '4px' }}>█</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ margin: '24px', padding: '16px', background: 'var(--accent-danger-glow)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-base)', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-danger)' }}>
                ⚠ {error}
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes terminalBlink { 0%,100%{opacity:1} 50%{opacity:0} }
                .rack-group:hover rect:first-child { filter: brightness(1.3); }
            `}</style>

            <div>
                {/* Cabecera */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                            Mapa del <span style={{ color: 'var(--accent-cyan)' }}>Almacén</span>
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', letterSpacing: '0.06em' }}>
                            PLANO INTERACTIVO · HAZ CLIC EN UN RACK PARA VER DETALLES
                        </p>
                    </div>

                    {/* Buscador de SKU */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                            type="text"
                            placeholder="Buscar SKU..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-base)', padding: 'var(--space-2) var(--space-3)', outline: 'none', width: '180px', caretColor: 'var(--accent-cyan)' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                        />
                        <button
                            onClick={handleBuscar}
                            className="btn btn-secondary"
                            style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.10em' }}
                        >
                            ◎ LOCALIZAR
                        </button>
                        {skuResaltado && (
                            <button
                                onClick={() => { setSkuResaltado(''); setBusqueda(''); setSeleccionado(null); }}
                                className="btn btn-ghost"
                                style={{ fontSize: 'var(--text-xs)' }}
                            >✕ LIMPIAR</button>
                        )}
                    </div>
                </div>

                {/* KPI bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                    {[
                        { label: 'PASILLOS ACTIVOS', value: stats.pasillos, color: 'var(--accent-cyan)', icon: '▦' },
                        { label: 'RACKS TOTALES', value: stats.total, color: 'var(--accent-primary)', icon: '◈' },
                        { label: 'RACKS OCUPADOS', value: stats.ocupados, color: 'var(--accent-cyan)', icon: '◉' },
                        { label: 'STOCK CRÍTICO', value: stats.criticos, color: 'var(--accent-danger)', icon: '▲' },
                    ].map(kpi => (
                        <div key={kpi.label} className="card" style={{ borderTop: `2px solid ${kpi.color}` }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                                {kpi.label}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: kpi.color, letterSpacing: '-0.02em' }}>
                                {kpi.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Layout mapa + panel lateral */}
                <div style={{ display: 'grid', gridTemplateColumns: seleccionado ? '1fr 320px' : '1fr', gap: 'var(--space-5)', alignItems: 'start' }}>

                    {/* SVG mapa */}
                    <div className="card" style={{ overflowX: 'auto', padding: 'var(--space-5)' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>● PLANO INTERACTIVO DEL ALMACÉN</span>
                            <span style={{ color: 'var(--accent-primary)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <span style={{ width: 10, height: 10, background: 'var(--accent-primary)', display: 'inline-block', borderRadius: 2 }} /> Alto stock
                            </span>
                            <span style={{ color: 'var(--accent-cyan)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <span style={{ width: 10, height: 10, background: 'var(--accent-cyan)', display: 'inline-block', borderRadius: 2 }} /> Stock medio
                            </span>
                            <span style={{ color: 'var(--accent-gold)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <span style={{ width: 10, height: 10, background: 'var(--accent-gold)', display: 'inline-block', borderRadius: 2 }} /> Retro
                            </span>
                            <span style={{ color: 'var(--accent-danger)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <span style={{ width: 10, height: 10, background: 'var(--accent-danger)', display: 'inline-block', borderRadius: 2 }} /> Stock crítico
                            </span>
                        </div>

                        <svg
                            width={svgWidth}
                            height={svgHeight}
                            style={{ display: 'block', minWidth: '100%' }}
                        >
                            {/* Etiquetas de estanterías (eje Y) */}
                            {ESTANTERIAS.map((est, iEst) => (
                                <text
                                    key={est}
                                    x={PADDING + 12}
                                    y={PADDING + 24 + iEst * (RACK_H + GAP_Y) + RACK_H / 2}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="var(--text-muted)"
                                    fontSize={11}
                                    fontFamily="var(--font-mono)"
                                    fontWeight={600}
                                >
                                    {est}
                                </text>
                            ))}

                            {/* Pasillos */}
                            {pasillosPresentes.map((pasillo, iPasillo) => {
                                const xBase = xDePasillo(iPasillo);
                                const estanterias = estanteriasDePassillo(pasillo);

                                return (
                                    <g key={pasillo}>
                                        {/* Etiqueta pasillo */}
                                        <text
                                            x={xBase + (RACK_W / 2)}
                                            y={PADDING + 10}
                                            textAnchor="middle"
                                            fill="var(--text-secondary)"
                                            fontSize={11}
                                            fontFamily="var(--font-display)"
                                            fontWeight={700}
                                            letterSpacing={2}
                                        >
                                            {pasillo}
                                        </text>

                                        {/* Estanterías dentro del pasillo */}
                                        {ESTANTERIAS.map((est, iEst) => {
                                            const nivelMap = mapaData?.mapa[pasillo]?.[est];
                                            const racks = nivelMap ? racksDeEstanteria(nivelMap) : [];
                                            const xRack = xBase + estanterias.indexOf(est) * (RACK_W + GAP_X);
                                            const yRack = PADDING + 24 + iEst * (RACK_H + GAP_Y);
                                            const estaSeleccionado = seleccionado?.pasillo === pasillo && seleccionado?.estanteria === est;
                                            const tieneSkuBuscado = skuResaltado && racks.some(r => r.sku === skuResaltado);

                                            return (
                                                <g key={est}>
                                                    {/* Halo de resaltado para búsqueda */}
                                                    {tieneSkuBuscado && (
                                                        <rect
                                                            x={xRack - 4} y={yRack - 4}
                                                            width={RACK_W + 8} height={RACK_H + 8}
                                                            rx={6}
                                                            fill="none"
                                                            stroke="var(--accent-gold)"
                                                            strokeWidth={2}
                                                            strokeDasharray="4 2"
                                                        />
                                                    )}
                                                    <RackSVG
                                                        x={xRack} y={yRack}
                                                        w={RACK_W} h={RACK_H}
                                                        label={racks.length > 0 ? `${est}` : '—'}
                                                        racks={racks}
                                                        seleccionado={estaSeleccionado}
                                                        onClick={() => {
                                                            if (racks.length === 0) return;
                                                            setSeleccionado(estaSeleccionado ? null : { pasillo, estanteria: est, racks });
                                                        }}
                                                    />
                                                </g>
                                            );
                                        })}
                                    </g>
                                );
                            })}

                            {/* Línea ENTRADA / SALIDA */}
                            <text
                                x={svgWidth / 2}
                                y={svgHeight - 6}
                                textAnchor="middle"
                                fill="var(--text-muted)"
                                fontSize={10}
                                fontFamily="var(--font-mono)"
                                letterSpacing={3}
                            >
                                ↑ ENTRADA / SALIDA ↑
                            </text>
                            <line
                                x1={PADDING} y1={svgHeight - 16}
                                x2={svgWidth - PADDING} y2={svgHeight - 16}
                                stroke="var(--border-default)"
                                strokeWidth={1}
                                strokeDasharray="4 4"
                            />
                        </svg>
                    </div>

                    {/* Panel lateral de detalle */}
                    {seleccionado && (
                        <div className="card" style={{ position: 'sticky', top: '80px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-3)' }}>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                                        {seleccionado.pasillo} — {seleccionado.estanteria}
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {seleccionado.racks.filter(r => r.id_producto).length} producto{seleccionado.racks.filter(r => r.id_producto).length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSeleccionado(null)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                                >✕</button>
                            </div>

                            {/* Lista de productos en el rack */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {seleccionado.racks
                                    .filter(r => r.id_producto !== null)
                                    .sort((a, b) => a.nivel - b.nivel)
                                    .map(rack => {
                                        const esResaltado = skuResaltado && rack.sku === skuResaltado;
                                        return (
                                            <div
                                                key={rack.nivel}
                                                style={{
                                                    background: esResaltado ? 'var(--accent-gold-glow)' : 'var(--bg-elevated)',
                                                    border: `1px solid ${esResaltado ? 'var(--accent-gold)' : rack.bajo_minimo ? 'var(--accent-danger)' : 'var(--border-subtle)'}`,
                                                    borderRadius: 'var(--radius-base)',
                                                    padding: 'var(--space-3)',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-1)' }}>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-cyan)', letterSpacing: '0.06em' }}>
                                                        Nivel {rack.nivel} · {rack.sku}
                                                    </span>
                                                    {rack.tipo_producto === 'RETRO' && (
                                                        <span className="badge badge-gold" style={{ fontSize: '9px' }}>RETRO</span>
                                                    )}
                                                    {rack.bajo_minimo && (
                                                        <span className="badge badge-danger" style={{ fontSize: '9px' }}>⚠ CRÍTICO</span>
                                                    )}
                                                </div>
                                                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
                                                    {rack.nombre}
                                                </div>
                                                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                                    <div>
                                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>STOCK</div>
                                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: rack.bajo_minimo ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                                                            {rack.stock_actual}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>MÍNIMO</div>
                                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                            {rack.stock_minimo}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                {seleccionado.racks.filter(r => r.id_producto !== null).length === 0 && (
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)', letterSpacing: '0.06em' }}>
                                        RACK VACÍO
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
