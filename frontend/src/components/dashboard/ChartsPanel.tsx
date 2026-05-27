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
        // Colores sólidos para ejes y líneas
        line:       '#059669',
        lineGrad0:  'rgba(5,150,105,0.22)',
        lineGrad1:  'rgba(5,150,105,0.01)',
        barTop:     'rgba(2,132,199,0.80)',
        barBot:     'rgba(5,150,105,0.55)',
        // Doughnut — versiones más oscuras para contraste sobre fondo blanco
        dBg:    ['rgba(5,150,105,0.14)', 'rgba(2,132,199,0.14)', 'rgba(220,38,38,0.14)', 'rgba(180,83,9,0.14)'],
        dBorder:['#059669',              '#0284c7',              '#dc2626',              '#b45309'            ],
        dHover: ['rgba(5,150,105,0.28)', 'rgba(2,132,199,0.28)', 'rgba(220,38,38,0.28)', 'rgba(180,83,9,0.28)'],
        // Etiquetas
        titleColor: '#64748B',
        labelColor: '#334155',
    } : {
        line:       CHART_COLORS.green,
        lineGrad0:  'rgba(0,255,136,0.30)',
        lineGrad1:  'rgba(0,255,136,0.01)',
        barTop:     'rgba(0,212,255,0.85)',
        barBot:     'rgba(0,255,136,0.55)',
        dBg:    ['rgba(0,255,136,0.20)', 'rgba(0,212,255,0.20)', 'rgba(255,68,102,0.20)', 'rgba(255,200,69,0.20)'],
        dBorder:[CHART_COLORS.green,     CHART_COLORS.cyan,      CHART_COLORS.danger,     CHART_COLORS.gold    ],
        dHover: ['rgba(0,255,136,0.35)', 'rgba(0,212,255,0.35)', 'rgba(255,68,102,0.35)', 'rgba(255,200,69,0.35)'],
        titleColor: '#aaaacc',
        labelColor: '#8888aa',
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
                font:    { family: "'Rajdhani', sans-serif", size: 13, weight: 700 },
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
                font:    { family: "'Rajdhani', sans-serif", size: 12, weight: 700 },
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
                    font:         { family: "'JetBrains Mono', monospace", size: 11 },
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
                font:    { family: "'Rajdhani', sans-serif", size: 12, weight: 700 },
                padding: { bottom: 16 },
            },
        },
    };

    // Card usa var CSS para que la sombra cambie automáticamente con el tema
    const card: React.CSSProperties = {
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding:      '20px 24px',
        boxShadow:    'var(--shadow-base)',
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
