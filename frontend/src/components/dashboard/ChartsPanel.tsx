/**
 * components/dashboard/ChartsPanel.tsx — UI-03
 *
 * Panel con 3 gráficos Chart.js:
 *   - Line Chart: tendencia de ventas 30 días
 *   - Bar Chart:  ventas por categoría
 *   - Doughnut:   distribución de stock por tipo
 *
 * Usa la configuración global de chartConfig.ts.
 * Los datos vienen tipados con KpiData de types/models.ts.
 */

import { Line, Bar, Doughnut } from 'react-chartjs-2';
import type { KpiData } from '../../types/models';
import { CHART_COLORS, BASE_CHART_OPTIONS } from '../../config/chartConfig';

interface ChartsPanelProps {
    kpiData: KpiData;
}

export function ChartsPanel({ kpiData }: ChartsPanelProps): JSX.Element {

    // ── Datos para Line Chart — ventas 30 días ───────────────────────
    const lineData = {
        labels: kpiData.ventasUltimos30Dias.map(v =>
            new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
        ),
        datasets: [{
            label: 'Ventas (€)',
            data: kpiData.ventasUltimos30Dias.map(v => v.total),
            borderColor: CHART_COLORS.green,
            backgroundColor: CHART_COLORS.greenAlpha,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: CHART_COLORS.green,
            tension: 0.4,
            fill: true,
        }],
    };

    const lineOptions = {
        ...BASE_CHART_OPTIONS,
        plugins: {
            ...BASE_CHART_OPTIONS.plugins,
            title: {
                display: true,
                text: 'TENDENCIA DE VENTAS — 30 DÍAS',
                color: '#8888aa',
                font: { family: "'Rajdhani', sans-serif", size: 11, weight: 600 },
                padding: { bottom: 16 },
            },
        },
    };

    // ── Datos para Bar Chart — unidades vendidas 30 días ────────────
    const barData = {
        labels: kpiData.ventasUltimos30Dias
            .filter((_, i) => i % 5 === 0) // Cada 5 días para no saturar
            .map(v => new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })),
        datasets: [{
            label: 'Unidades vendidas',
            data: kpiData.ventasUltimos30Dias
                .filter((_, i) => i % 5 === 0)
                .map(v => v.unidades),
            backgroundColor: CHART_COLORS.cyanAlpha,
            borderColor: CHART_COLORS.cyan,
            borderWidth: 1,
            borderRadius: 4,
        }],
    };

    const barOptions = {
        ...BASE_CHART_OPTIONS,
        plugins: {
            ...BASE_CHART_OPTIONS.plugins,
            title: {
                display: true,
                text: 'UNIDADES VENDIDAS',
                color: '#8888aa',
                font: { family: "'Rajdhani', sans-serif", size: 11, weight: 600 },
                padding: { bottom: 16 },
            },
        },
    };

    // ── Datos para Doughnut — distribución de stock ──────────────────
    const doughnutData = {
        labels: ['Disponible', 'Stock Crítico', 'Retro'],
        datasets: [{
            data: [
                kpiData.clientesActivos,
                kpiData.productosStockCritico,
                kpiData.piezasRetroDisponibles,
            ],
            backgroundColor: [
                CHART_COLORS.greenAlpha,
                CHART_COLORS.dangerAlpha,
                CHART_COLORS.goldAlpha,
            ],
            borderColor: [
                CHART_COLORS.green,
                CHART_COLORS.danger,
                CHART_COLORS.gold,
            ],
            borderWidth: 2,
        }],
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: '#8888aa',
                    font: { family: "'JetBrains Mono', monospace", size: 11 },
                    boxWidth: 12,
                    padding: 12,
                },
            },
            tooltip: BASE_CHART_OPTIONS.plugins.tooltip,
            title: {
                display: true,
                text: 'DISTRIBUCIÓN DE INVENTARIO',
                color: '#8888aa',
                font: { family: "'Rajdhani', sans-serif", size: 11, weight: 600 },
                padding: { bottom: 16 },
            },
        },
    };

    const cardStyle: React.CSSProperties = {
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        padding: '20px',
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: '16px',
        }}>

            {/* Line Chart — ancho completo */}
            <div style={{ ...cardStyle, gridColumn: '1 / -1', height: '220px' }}>
                <Line data={lineData} options={lineOptions} />
            </div>

            {/* Bar Chart */}
            <div style={{ ...cardStyle, height: '200px' }}>
                <Bar data={barData} options={barOptions} />
            </div>

            {/* Doughnut */}
            <div style={{ ...cardStyle, height: '200px' }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>

        </div>
    );
}
