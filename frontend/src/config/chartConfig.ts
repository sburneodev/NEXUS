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
    green: '#00ff88',
    greenAlpha: 'rgba(0, 255, 136, 0.15)',
    cyan: '#00d4ff',
    cyanAlpha: 'rgba(0, 212, 255, 0.15)',
    gold: '#ffc845',
    goldAlpha: 'rgba(255, 200, 69, 0.15)',
    danger: '#ff4466',
    dangerAlpha: 'rgba(255, 68, 102, 0.15)',
    purple: '#a855f7',
    purpleAlpha: 'rgba(168, 85, 247, 0.15)',
} as const;

// ── Opciones base compartidas (modo oscuro) ─────────────────────────
export const BASE_CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#8888aa',
                font: { family: "'JetBrains Mono', monospace", size: 11 },
                boxWidth: 12,
                padding: 16,
            },
        },
        tooltip: {
            backgroundColor: '#0f0f1a',
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            titleColor: '#e8e8f0',
            bodyColor: '#8888aa',
            titleFont: { family: "'Rajdhani', sans-serif", size: 13, weight: 700 },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
            padding: 12,
            cornerRadius: 6,
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#7777aa', font: { family: "'JetBrains Mono', monospace", size: 10 } },
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#7777aa', font: { family: "'JetBrains Mono', monospace", size: 10 } },
        },
    },
} as const;

// ── Factory de opciones según tema ──────────────────────────────────
// Devuelve las opciones base adaptadas al tema activo.
// isLight = !isDark desde useTheme().
export function getBaseChartOptions(isLight: boolean) {
    const tickColor  = isLight ? '#64748B' : '#7777aa';
    const gridColor  = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.04)';
    const labelColor = isLight ? '#64748B' : '#8888aa';
    const ttBg       = isLight ? '#FFFFFF' : '#0f0f1a';
    const ttBorder   = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.10)';
    const ttTitle    = isLight ? '#0F172A' : '#e8e8f0';
    const ttBody     = isLight ? '#64748B' : '#8888aa';

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