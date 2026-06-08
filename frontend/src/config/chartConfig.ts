/**
 * config/chartConfig.ts
 *
 * Registro global de Chart.js y configuración compartida.
 * Importar UNA SOLA VEZ en main.tsx o App.tsx para que
 * todos los gráficos de la app usen los mismos estilos.
 *
 * ⚠️ Sin este registro Chart.js v4 no renderiza nada.
 */

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

// Registro de todos los módulos necesarios
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// ── Paleta corporativa NEXUS ────────────────────────────────────────
export const CHART_COLORS = {
    green: '#3B82F6',
    greenAlpha: 'rgba(59, 130, 246, 0.15)',
    cyan: '#38BDF8',
    cyanAlpha: 'rgba(56, 189, 248, 0.15)',
    gold: '#FBBF24',
    goldAlpha: 'rgba(251, 191, 36, 0.15)',
    danger: '#F87171',
    dangerAlpha: 'rgba(248, 113, 113, 0.15)',
    purple: '#A78BFA',
    purpleAlpha: 'rgba(167, 139, 250, 0.15)',
} as const;

// ── Opciones base compartidas (modo oscuro) ─────────────────────────
export const BASE_CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#8888aa',
                font: { family: "'JetBrains Mono', monospace", size: 13 },
                boxWidth: 12,
                padding: 16,
            },
        },
        tooltip: {
            backgroundColor: '#22272E',
            borderColor: 'rgba(240,246,252,0.12)',
            borderWidth: 1,
            titleColor: '#E6EDF3',
            bodyColor: '#8B949E',
            titleFont: { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", size: 14, weight: 700 },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 13 },
            padding: 12,
            cornerRadius: 6,
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#7777aa', font: { family: "'JetBrains Mono', monospace", size: 12 } },
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#7777aa', font: { family: "'JetBrains Mono', monospace", size: 12 } },
        },
    },
} as const;

// ── Factory de opciones según tema ──────────────────────────────────
// Devuelve las opciones base adaptadas al tema activo.
// isLight = !isDark desde useTheme().
export function getBaseChartOptions(isLight: boolean) {
    const tickColor  = isLight ? '#6B7280' : '#6E7681';
    const gridColor  = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(240,246,252,0.05)';
    const labelColor = isLight ? '#6B7280' : '#8B949E';
    const ttBg       = isLight ? '#FFFFFF' : '#22272E';
    const ttBorder   = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(240,246,252,0.12)';
    const ttTitle    = isLight ? '#111827' : '#E6EDF3';
    const ttBody     = isLight ? '#6B7280' : '#8B949E';

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color:    labelColor,
                    font:     BASE_CHART_OPTIONS.plugins.legend.labels.font,
                    boxWidth: 12,
                    padding:  16,
                },
            },
            tooltip: {
                backgroundColor: ttBg,
                borderColor:     ttBorder,
                borderWidth:     1,
                titleColor:      ttTitle,
                bodyColor:       ttBody,
                titleFont: BASE_CHART_OPTIONS.plugins.tooltip.titleFont,
                bodyFont:  BASE_CHART_OPTIONS.plugins.tooltip.bodyFont,
                padding:      12,
                cornerRadius: 6,
            },
        },
        scales: {
            x: {
                grid:  { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, font: BASE_CHART_OPTIONS.scales.x.ticks.font },
            },
            y: {
                grid:  { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, font: BASE_CHART_OPTIONS.scales.y.ticks.font },
            },
        },
    };
}