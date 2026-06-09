import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import type { KpiData } from '../../types/models';
import { CHART_COLORS, getBaseChartOptions } from '../../config/chartConfig';
import { useTheme }      from '../../hooks/useTheme';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface ChartsPanelProps {
    kpiData: KpiData;
}

type ChartScriptContext = {
    chart: {
        ctx: CanvasRenderingContext2D;
        chartArea: { top: number; bottom: number; left: number; right: number } | null;
    };
};

// ── Control de Almacén — gráfica de barras verticales por % del catálogo ──
function ControlAlmacen({ critico, bajo, ok, retro, isDark, titleColor, pctOcupado, libres }: {
    critico:     number;
    bajo:        number;
    ok:          number;
    retro:       number;
    isDark:      boolean;
    titleColor:  string;
    pctOcupado?: number;
    libres?:     number;
}) {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        setAnimated(false);
        const t = setTimeout(() => setAnimated(true), 80);
        return () => clearTimeout(t);
    }, [critico, bajo, ok, retro]);

    const hasBadge   = pctOcupado !== undefined;
    const badgeColor = !hasBadge ? 'transparent'
        : pctOcupado! > 85 ? (isDark ? '#F87171' : '#DC2626')
        : pctOcupado! > 60 ? (isDark ? '#FBBF24' : '#D97706')
        :                     (isDark ? '#4ADE80' : '#16A34A');

    const mutedText = isDark ? '#8B949E' : '#6B7280';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const axisColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';

    // % de participación en el catálogo total (no relativo al máximo)
    const total = critico + bajo + ok + retro || 1;
    const bars = [
        {
            label:      'CRÍT.',
            pct:        Math.round((critico / total) * 100),
            colorDark:  '#C0645A',
            colorLight: '#B54B42',
            glow:       'rgba(192,100,90,0.25)',
        },
        {
            label:      'BAJO',
            pct:        Math.round((bajo / total) * 100),
            colorDark:  '#B8943A',
            colorLight: '#9A7B2E',
            glow:       'rgba(184,148,58,0.25)',
        },
        {
            label:      'OK',
            pct:        Math.round((ok / total) * 100),
            colorDark:  '#4A9EAB',
            colorLight: '#2E7D8A',
            glow:       'rgba(74,158,171,0.25)',
        },
        {
            label:      'RETRO',
            pct:        Math.round((retro / total) * 100),
            colorDark:  '#7B72B8',
            colorLight: '#5D56A0',
            glow:       'rgba(123,114,184,0.25)',
        },
    ];

    // Área de barras en píxeles fijos para calcular alturas sin depender de % en CSS
    const PLOT_H = 110;
    const Y_TICKS = [0, 25, 50, 75, 100];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
                <p style={{
                    margin:        0,
                    fontFamily:    "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
                    fontSize:      '14px',
                    fontWeight:    700,
                    letterSpacing: '0.04em',
                    color:         titleColor,
                }}>CONTROL DE ALMACÉN</p>

                {hasBadge && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '3px 9px', borderRadius: '20px',
                            background: `${badgeColor}18`, border: `1px solid ${badgeColor}44`,
                        }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: mutedText, letterSpacing: '0.06em' }}>OCUPADO</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: badgeColor }}>{pctOcupado}%</span>
                        </div>
                        {libres !== undefined && (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: mutedText, opacity: 0.65, paddingRight: '4px' }}>{libres} libres</span>
                        )}
                    </div>
                )}
            </div>

            {/* Cuerpo del gráfico */}
            <div style={{ flex: 1, display: 'flex', gap: '6px', minHeight: 0 }}>

                {/* Eje Y — etiquetas de % */}
                <div style={{
                    display:        'flex',
                    flexDirection:  'column',
                    justifyContent: 'space-between',
                    width:          '26px',
                    flexShrink:     0,
                    paddingBottom:  '22px', // alinea con el área de barras (X-axis label)
                }}>
                    {[...Y_TICKS].reverse().map(t => (
                        <span key={t} style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize:   '8px',
                            color:      mutedText,
                            textAlign:  'right',
                            lineHeight: 1,
                            opacity:    0.75,
                        }}>{t}%</span>
                    ))}
                </div>

                {/* Área de plot + etiquetas X */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                    {/* Plot: grid + barras */}
                    <div style={{ position: 'relative', height: `${PLOT_H}px`, flexShrink: 0 }}>

                        {/* Líneas de grid horizontales */}
                        {Y_TICKS.map(t => (
                            <div key={t} style={{
                                position:   'absolute',
                                left:       0,
                                right:      0,
                                bottom:     `${t}%`,
                                height:     '1px',
                                background: t === 0 ? axisColor : gridColor,
                                zIndex:     0,
                            }} />
                        ))}

                        {/* Barras — alineadas al fondo del plot */}
                        <div style={{
                            position:    'absolute',
                            inset:       0,
                            display:     'flex',
                            alignItems:  'flex-end',
                            gap:         '6px',
                            paddingBottom: '1px',
                            zIndex:      1,
                        }}>
                            {bars.map(bar => {
                                const col       = isDark ? bar.colorDark : bar.colorLight;
                                const barHeightPx = Math.round((bar.pct / 100) * PLOT_H);

                                return (
                                    <div key={bar.label} style={{
                                        flex:           1,
                                        display:        'flex',
                                        flexDirection:  'column',
                                        alignItems:     'center',
                                        justifyContent: 'flex-end',
                                        height:         '100%',
                                    }}>
                                        {/* % encima de la barra */}
                                        <span style={{
                                            fontFamily:  "'JetBrains Mono', monospace",
                                            fontSize:    '10px',
                                            fontWeight:  700,
                                            color:       col,
                                            marginBottom:'3px',
                                            lineHeight:  1,
                                            opacity:     animated ? 1 : 0,
                                            transition:  'opacity 250ms ease 650ms',
                                        }}>
                                            {bar.pct}%
                                        </span>

                                        {/* Barra */}
                                        <div style={{
                                            width:        '100%',
                                            height:       animated ? `${barHeightPx}px` : '0px',
                                            background:   `linear-gradient(180deg, ${col} 0%, ${col}99 100%)`,
                                            borderRadius: '4px 4px 0 0',
                                            transition:   'height 700ms cubic-bezier(0.23,1,0.32,1)',
                                            boxShadow:    animated ? `0 0 14px ${bar.glow}, 0 -2px 8px ${bar.glow}` : 'none',
                                            minHeight:    bar.pct > 0 && animated ? '2px' : '0px',
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Línea eje X */}
                    <div style={{ height: '1px', background: axisColor, flexShrink: 0 }} />

                    {/* Etiquetas eje X — categorías */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexShrink: 0 }}>
                        {bars.map(bar => {
                            const col = isDark ? bar.colorDark : bar.colorLight;
                            return (
                                <div key={bar.label} style={{ flex: 1, textAlign: 'center' }}>
                                    <span style={{
                                        fontFamily:    "'JetBrains Mono', monospace",
                                        fontSize:      '9px',
                                        fontWeight:    700,
                                        color:         col,
                                        letterSpacing: '0.04em',
                                    }}>{bar.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Título eje X */}
                    <div style={{ textAlign: 'center', marginTop: '3px', flexShrink: 0 }}>
                        <span style={{
                            fontFamily:    "'JetBrains Mono', monospace",
                            fontSize:      '8px',
                            color:         mutedText,
                            letterSpacing: '0.08em',
                            opacity:       0.65,
                            textTransform: 'uppercase',
                        }}>Categorías</span>
                    </div>
                </div>
            </div>

            {/* Título eje Y — rotado verticalmente */}
            <div style={{
                display:        'flex',
                justifyContent: 'flex-start',
                paddingLeft:    '2px',
                marginTop:      '2px',
                flexShrink:     0,
            }}>
                <span style={{
                    fontFamily:    "'JetBrains Mono', monospace",
                    fontSize:      '8px',
                    color:         mutedText,
                    letterSpacing: '0.07em',
                    opacity:       0.65,
                    textTransform: 'uppercase',
                }}>% participación en catálogo</span>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────
export function ChartsPanel({ kpiData }: ChartsPanelProps): JSX.Element {
    const { isDark } = useTheme();
    const isLight    = !isDark;

    const { isMobile, isTablet } = useBreakpoint();
    const isCompact = isMobile || isTablet;

    // Hover: sin movimiento, solo un tenue anillo en el borde
    const [hovered, setHovered] = useState<string | null>(null);

    // ── Paleta según tema ────────────────────────────────────────────
    const pal = isLight ? {
        line:       '#2563EB',
        lineGrad0:  'rgba(37,99,235,0.18)',
        lineGrad1:  'rgba(37,99,235,0.00)',
        barTop:     'rgba(37,99,235,0.78)',
        barBot:     'rgba(8,145,178,0.52)',
        titleColor: '#111827',
    } : {
        line:       CHART_COLORS.green,
        lineGrad0:  'rgba(59,130,246,0.25)',
        lineGrad1:  'rgba(59,130,246,0.01)',
        barTop:     'rgba(59,130,246,0.85)',
        barBot:     'rgba(56,189,248,0.55)',
        titleColor: '#C9D1D9',
    };

    const baseOpts = getBaseChartOptions(isLight);

    // ── Line Chart ───────────────────────────────────────────────────
    const lineData = {
        labels: kpiData.ventasUltimos30Dias.map(v =>
            new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
        ),
        datasets: [{
            label: 'Ventas (€)',
            data:  kpiData.ventasUltimos30Dias.map(v => v.total),
            borderColor:               pal.line,
            borderWidth:               2.5,
            pointRadius:               0,
            pointHoverRadius:          5,
            pointHoverBackgroundColor: pal.line,
            tension:    0.4,
            fill:       true,
            backgroundColor: (context: ChartScriptContext) => {
                const { ctx, chartArea } = context.chart;
                if (!chartArea) return 'transparent';
                const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, pal.lineGrad0);
                g.addColorStop(1, pal.lineGrad1);
                return g;
            },
        }],
    };

    const lineOptions = {
        ...baseOpts,
        plugins: {
            ...baseOpts.plugins,
            legend: { display: false },
            title: {
                display: true,
                text:    'TENDENCIA DE VENTAS — 30 DÍAS',
                color:   pal.titleColor,
                font:    { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", size: 15, weight: 700 },
                padding: { bottom: 20 },
            },
        },
    };

    // ── Bar Chart vertical ───────────────────────────────────────────
    const barLabels = kpiData.ventasUltimos30Dias
        .filter((_, i) => i % 5 === 0)
        .map(v => new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));

    const barValues = kpiData.ventasUltimos30Dias
        .filter((_, i) => i % 5 === 0)
        .map(v => v.unidades);

    const barData = {
        labels: barLabels,
        datasets: [{
            label: 'Unidades vendidas',
            data:  barValues,
            borderRadius:  8,
            borderSkipped: false as const,
            borderWidth:   0,
            backgroundColor: (context: ChartScriptContext) => {
                const { ctx, chartArea } = context.chart;
                if (!chartArea) return pal.barTop;
                const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, pal.barTop);
                g.addColorStop(1, pal.barBot);
                return g;
            },
        }],
    };

    const barOptions = {
        ...baseOpts,
        plugins: {
            ...baseOpts.plugins,
            legend: { display: false },
            title: {
                display: true,
                text:    'UNIDADES VENDIDAS — MUESTRA',
                color:   pal.titleColor,
                font:    { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", size: 14, weight: 700 },
                padding: { bottom: 16 },
            },
        },
    };

    // ── Estilos de card: sin movimiento, solo anillo de borde en hover ─
    const cardBase: React.CSSProperties = isDark ? {
        background:   'var(--bg-surface)',
        borderRadius: '12px',
        padding:      '20px 24px',
        borderTop:    '1px solid rgba(255,255,255,0.38)',
        borderLeft:   '1px solid rgba(255,255,255,0.22)',
        borderRight:  '1px solid rgba(255,255,255,0.14)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
    } : {
        background:   'var(--bg-surface)',
        border:       '1px solid rgba(15,23,42,0.10)',
        borderTop:    '1px solid rgba(15,23,42,0.14)',
        borderRadius: '12px',
        padding:      '20px 24px',
    };

    // Idle: sombra normal. Hover: misma sombra + anillo azul muy tenue
    const shadowIdle  = isDark
        ? '0 4px 28px rgba(0,0,0,0.60), 0 1px 0 rgba(255,255,255,0.10) inset, 0 0 0 1px rgba(255,255,255,0.07)'
        : '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)';
    const shadowHover = isDark
        ? '0 4px 28px rgba(0,0,0,0.60), 0 1px 0 rgba(255,255,255,0.10) inset, 0 0 0 1px rgba(59,130,246,0.28)'
        : '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(37,99,235,0.22)';

    const card = (id: string, extraH?: React.CSSProperties): React.CSSProperties => ({
        ...cardBase,
        ...(extraH ?? {}),
        boxShadow:  hovered === id ? shadowHover : shadowIdle,
        transition: 'box-shadow 180ms ease',
        cursor:     'default',
    });

    // Alturas adaptadas al breakpoint
    const lineH  = isMobile ? '200px' : isTablet ? '220px' : '260px';
    const smallH = isMobile ? '200px' : isTablet ? '210px' : '250px';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '16px' }}>

            {/* Line Chart — ancho completo */}
            <div
                style={{ ...card('line', { height: lineH }) }}
                onMouseEnter={() => setHovered('line')}
                onMouseLeave={() => setHovered(null)}
            >
                <Line data={lineData} options={lineOptions} />
            </div>

            {/* Bar vertical + Control de almacén */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, 1fr)',
                gap:                 isMobile ? '10px' : '16px',
            }}>
                <div
                    style={{ ...card('bar', { height: smallH }) }}
                    onMouseEnter={() => setHovered('bar')}
                    onMouseLeave={() => setHovered(null)}
                >
                    <Bar data={barData} options={barOptions} />
                </div>

                <div
                    style={{ ...card('stock', { height: smallH }) }}
                    onMouseEnter={() => setHovered('stock')}
                    onMouseLeave={() => setHovered(null)}
                >
                    <ControlAlmacen
                        critico={kpiData.productosStockCritico ?? 0}
                        bajo={kpiData.productosStockBajo ?? 0}
                        ok={kpiData.productosStockOk ?? 0}
                        retro={kpiData.piezasRetroDisponibles ?? 0}
                        isDark={isDark}
                        titleColor={pal.titleColor}
                        pctOcupado={kpiData.almacenPctOcupado}
                        libres={kpiData.almacenLibres}
                    />
                </div>
            </div>
        </div>
    );
}
