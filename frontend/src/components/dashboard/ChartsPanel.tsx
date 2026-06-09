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

// ── Control de Almacén — barras de salud de stock ────────────────────
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
        const t = setTimeout(() => setAnimated(true), 70);
        return () => clearTimeout(t);
    }, [critico, bajo, ok, retro]);

    // Badge de ocupación del almacén físico
    // Si no se ha cargado aún (undefined), no mostramos badge
    const hasBadge    = pctOcupado !== undefined;
    const badgeColor  = !hasBadge ? 'transparent'
        : pctOcupado > 85 ? (isDark ? '#F87171' : '#DC2626')
        : pctOcupado > 60 ? (isDark ? '#FBBF24' : '#D97706')
        :                    (isDark ? '#4ADE80' : '#16A34A');

    const maxVal    = Math.max(critico, bajo, ok, retro, 1);
    const mutedText  = isDark ? '#8B949E' : '#6B7280';
    const valueColor = isDark ? '#C9D1D9' : '#374151';
    const trackColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const rows = [
        {
            label: 'CRÍTICO',
            count:  critico,
            color: isDark ? '#F87171' : '#DC2626',
            glow:  isDark ? '#F8717155' : '#DC262633',
        },
        {
            label: 'BAJO',
            count:  bajo,
            color: isDark ? '#FBBF24' : '#D97706',
            glow:  isDark ? '#FBBF2455' : '#D9770633',
        },
        {
            label: 'OK',
            count:  ok,
            color: isDark ? '#38BDF8' : '#0891B2',
            glow:  isDark ? '#38BDF855' : '#0891B233',
        },
        {
            label: 'RETRO',
            count:  retro,
            color: isDark ? '#3B82F6' : '#2563EB',
            glow:  isDark ? '#3B82F655' : '#2563EB33',
        },
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Cabecera: título + badge de salud */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{
                    margin:        0,
                    fontFamily:    "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
                    fontSize:      '14px',
                    fontWeight:    700,
                    letterSpacing: '0.04em',
                    color:         titleColor,
                }}>CONTROL DE ALMACÉN</p>

                {/* Badge de ocupación — solo cuando ya tenemos el dato */}
                {hasBadge && (
                    <div style={{
                        display:       'flex',
                        flexDirection: 'column',
                        alignItems:    'flex-end',
                        gap:           '1px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '3px 9px', borderRadius: '20px',
                            background: `${badgeColor}18`, border: `1px solid ${badgeColor}44`,
                        }}>
                            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'10px', color: mutedText, letterSpacing:'0.06em' }}>
                                OCUPADO
                            </span>
                            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', fontWeight:700, color: badgeColor }}>
                                {pctOcupado}%
                            </span>
                        </div>
                        {libres !== undefined && (
                            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'9px', color: mutedText, opacity: 0.65, paddingRight: '4px' }}>
                                {libres} libres
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Filas de stock */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                {rows.map(row => {
                    const pct = (row.count / maxVal) * 100;
                    return (
                        <div key={row.label}>
                            {/* Etiqueta + contador */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                                <span style={{
                                    fontFamily:    "'JetBrains Mono', monospace",
                                    fontSize:      '11px',
                                    fontWeight:    700,
                                    letterSpacing: '0.07em',
                                    color:         row.color,
                                }}>{row.label}</span>

                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize:   '11px',
                                }}>
                                    <span style={{ fontWeight: 600, color: valueColor }}>{row.count}</span>
                                    <span style={{ marginLeft: '3px', color: mutedText, opacity: 0.6, fontSize: '10px' }}>uds</span>
                                </span>
                            </div>

                            {/* Track + fill */}
                            <div style={{
                                height:       '6px',
                                borderRadius: '4px',
                                background:   trackColor,
                                overflow:     'hidden',
                            }}>
                                <div style={{
                                    height:       '100%',
                                    borderRadius: '4px',
                                    background:   row.color,
                                    width:        animated ? `${pct}%` : '0%',
                                    transition:   'width 700ms cubic-bezier(0.23,1,0.32,1)',
                                    boxShadow:    `0 0 8px ${row.glow}`,
                                }} />
                            </div>
                        </div>
                    );
                })}
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
