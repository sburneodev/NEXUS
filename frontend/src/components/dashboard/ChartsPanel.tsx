import { Line, Bar, Doughnut } from 'react-chartjs-2';
import type { KpiData } from '../../types/models';
import { CHART_COLORS, getBaseChartOptions } from '../../config/chartConfig';
import { useTheme } from '../../hooks/useTheme';

interface ChartsPanelProps {
    kpiData: KpiData;
}

type ChartScriptContext = {
    chart: {
        ctx: CanvasRenderingContext2D;
        chartArea: { top: number; bottom: number; left: number; right: number } | null;
    };
};

export function ChartsPanel({ kpiData }: ChartsPanelProps): JSX.Element {
    const { isDark }  = useTheme();
    const isLight     = !isDark;

    const critico = kpiData.productosStockCritico ?? 0;
    const bajo    = kpiData.productosStockBajo ?? 0;
    const retro   = kpiData.piezasRetroDisponibles ?? 0;
    const normal  = Math.max(10, 60 - critico - bajo - retro);

    // ── Paleta de colores según tema ─────────────────────────────────
    const pal = isLight ? {
        line:       '#2563EB',
        lineGrad0:  'rgba(37,99,235,0.18)',
        lineGrad1:  'rgba(37,99,235,0.00)',
        barTop:     'rgba(37,99,235,0.78)',
        barBot:     'rgba(8,145,178,0.52)',
        dBg:    ['rgba(37,99,235,0.18)', 'rgba(8,145,178,0.18)', 'rgba(220,38,38,0.18)', 'rgba(217,119,6,0.18)'],
        dBorder:['#2563EB',              '#0891B2',              '#DC2626',              '#D97706'            ],
        dHover: ['rgba(37,99,235,0.36)', 'rgba(8,145,178,0.36)', 'rgba(220,38,38,0.36)', 'rgba(217,119,6,0.36)'],
        titleColor: '#111827',
        labelColor: '#6B7280',
    } : {
        line:       CHART_COLORS.green,
        lineGrad0:  'rgba(59,130,246,0.25)',
        lineGrad1:  'rgba(59,130,246,0.01)',
        barTop:     'rgba(59,130,246,0.85)',
        barBot:     'rgba(56,189,248,0.55)',
        dBg:    ['rgba(59,130,246,0.20)', 'rgba(56,189,248,0.20)', 'rgba(248,113,113,0.20)', 'rgba(251,191,36,0.20)'],
        dBorder:[CHART_COLORS.green,      CHART_COLORS.cyan,      CHART_COLORS.danger,      CHART_COLORS.gold    ],
        dHover: ['rgba(59,130,246,0.35)', 'rgba(56,189,248,0.35)', 'rgba(248,113,113,0.35)', 'rgba(251,191,36,0.35)'],
        titleColor: '#C9D1D9',
        labelColor: '#8B949E',
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
            borderColor:              pal.line,
            borderWidth:              2.5,
            pointRadius:              0,
            pointHoverRadius:         5,
            pointHoverBackgroundColor:pal.line,
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

    // ── Bar Chart ────────────────────────────────────────────────────
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

    // ── Doughnut — distribución real de inventario ───────────────────
    const doughnutData = {
        labels: ['Stock OK', 'Stock Bajo', 'Stock Crítico', 'Retro'],
        datasets: [{
            data:                [normal,     bajo,        critico,      retro      ],
            backgroundColor:     pal.dBg,
            borderColor:         pal.dBorder,
            borderWidth:         2,
            hoverBackgroundColor:pal.dHover,
            hoverBorderWidth:    3,
        }],
    };

    const doughnutOptions = {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '72%',
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color:        pal.labelColor,
                    font:         { family: "'JetBrains Mono', monospace", size: 13 },
                    boxWidth:     10,
                    padding:      16,
                    usePointStyle:true,
                    pointStyle:   'circle' as const,
                },
            },
            tooltip: baseOpts.plugins.tooltip,
            title: {
                display: true,
                text:    'DISTRIBUCIÓN DE INVENTARIO',
                color:   pal.titleColor,
                font:    { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", size: 14, weight: 700 },
                padding: { bottom: 16 },
            },
        },
    };

    const card: React.CSSProperties = isDark ? {
        background:   'var(--bg-surface)',
        borderRadius: '12px',
        padding:      '20px 24px',
        /* Bordes asimétricos: más luz arriba, se atenúa hacia abajo */
        borderTop:    '1px solid rgba(255,255,255,0.38)',
        borderLeft:   '1px solid rgba(255,255,255,0.22)',
        borderRight:  '1px solid rgba(255,255,255,0.14)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        /* Sombra exterior + anillo blanco tenue */
        boxShadow:    [
            '0 4px 28px rgba(0,0,0,0.60)',
            '0 1px 0 rgba(255,255,255,0.10) inset',
            '0 0 0 1px rgba(255,255,255,0.07)',
        ].join(', '),
    } : {
        background:   'var(--bg-surface)',
        border:       '1px solid rgba(15,23,42,0.10)',
        borderTop:    '1px solid rgba(15,23,42,0.14)',
        borderRadius: '12px',
        padding:      '20px 24px',
        /* Sombra ligeramente más suave que antes */
        boxShadow:    '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Line Chart — ancho completo */}
            <div style={{ ...card, height: '260px' }}>
                <Line data={lineData} options={lineOptions} />
            </div>

            {/* Bar + Doughnut — lado a lado */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap:                 '16px',
            }}>
                <div style={{ ...card, height: '250px' }}>
                    <Bar data={barData} options={barOptions} />
                </div>
                <div style={{ ...card, height: '250px' }}>
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
            </div>
        </div>
    );
}
