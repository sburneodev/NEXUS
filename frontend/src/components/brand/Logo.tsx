/**
 * components/brand/Logo.tsx
 *
 * Sistema de logotipo NEXUS ERP — LevelUp Arcade.
 *
 * Variantes:
 *   - "mark"        → solo isotipo (hex + N)              · cuadrado
 *   - "horizontal"  → isotipo + wordmark + tagline        · landscape
 *   - "stacked"     → isotipo arriba, wordmark debajo     · vertical
 *
 * Tema:
 *   - "brand" (default) → gradiente verde→cian (dark/light theme)
 *   - "mono"            → currentColor (para footers, badges, prints)
 *
 * El SVG es 100% vectorial e inline (sin <img>) para que herede color,
 * accesibilidad y filtros del DOM circundante.
 */

import type { CSSProperties } from 'react';

export type LogoVariant = 'mark' | 'horizontal' | 'stacked';
export type LogoTheme   = 'brand' | 'mono';

interface LogoProps {
    variant?:   LogoVariant;
    theme?:     LogoTheme;
    size?:      number;            // alto en px (el ancho se calcula)
    title?:     string;
    style?:     CSSProperties;
    className?: string;
}

// ── IDs únicos por instancia para evitar colisión de <defs> cuando hay
//    varios logos en la misma página (login + sidebar + footer, etc.)
let _instance = 0;
const nextId = () => `nx-${++_instance}`;

export function Logo({
    variant = 'horizontal',
    theme   = 'brand',
    size    = 40,
    title   = 'NEXUS ERP',
    style,
    className,
}: LogoProps): JSX.Element {
    const id = nextId();
    const useBrand = theme === 'brand';

    // Colores: gradiente o currentColor
    const brandFill   = useBrand ? `url(#${id}-brand)`     : 'currentColor';
    const brandSoft   = useBrand ? `url(#${id}-brand-soft)`: 'currentColor';
    const innerFill   = useBrand ? `url(#${id}-inner)`     : 'transparent';
    const textFill    = useBrand ? `url(#${id}-text)`      : 'currentColor';
    const accentDot   = useBrand ? '#00ff88'               : 'currentColor';
    const scanline    = useBrand ? '#00d4ff'               : 'currentColor';
    const subtleText  = useBrand ? 'var(--text-muted)'     : 'currentColor';

    // ── ISOTIPO ── reutilizable en todas las variantes
    const Mark = (
        <g>
            <path d="M32 3 L58.5 17.5 L58.5 46.5 L32 61 L5.5 46.5 L5.5 17.5 Z"
                  fill={innerFill}
                  stroke={brandFill}
                  strokeWidth="2"
                  strokeLinejoin="round"/>
            <path d="M32 7 L55 20 L55 44 L32 57 L9 44 L9 20 Z"
                  fill="none"
                  stroke={brandSoft}
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                  opacity="0.6"/>
            <g stroke={brandFill} strokeWidth="1.4" strokeLinecap="square" fill="none" opacity="0.85">
                <path d="M12 22 L12 17 L17 17"/>
                <path d="M52 17 L57 17 L57 22"/>
                <path d="M12 42 L12 47 L17 47"/>
                <path d="M52 47 L57 47 L57 42"/>
            </g>
            <path d="M18 46 L18 18 L24 18 L40 40 L40 18 L46 18 L46 46 L40 46 L24 24 L24 46 Z"
                  fill={brandFill}
                  filter={useBrand ? `url(#${id}-glow)` : undefined}/>
            <g fill={accentDot}>
                <rect x="48.5" y="29" width="2" height="2"/>
                <rect x="48.5" y="25" width="2" height="2" opacity="0.7"/>
                <rect x="48.5" y="21" width="2" height="2" opacity="0.4"/>
            </g>
            <line x1="18" y1="32" x2="46" y2="32" stroke={scanline} strokeWidth="0.4" opacity="0.35"/>
        </g>
    );

    const Defs = useBrand ? (
        <defs>
            <linearGradient id={`${id}-brand`} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#00ff88"/>
                <stop offset="1" stopColor="#00d4ff"/>
            </linearGradient>
            <linearGradient id={`${id}-brand-soft`} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#00ff88" stopOpacity="0.55"/>
                <stop offset="1" stopColor="#00d4ff" stopOpacity="0.55"/>
            </linearGradient>
            <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#10112a"/>
                <stop offset="1" stopColor="#05050a"/>
            </linearGradient>
            <linearGradient id={`${id}-text`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#00ff88"/>
                <stop offset="1" stopColor="#00d4ff"/>
            </linearGradient>
            <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.9" result="b"/>
                <feMerge>
                    <feMergeNode in="b"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
    ) : null;

    // ───────────────────────────────────────────── MARK only
    if (variant === 'mark') {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
                width={size}
                height={size}
                role="img"
                aria-label={title}
                style={style}
                className={className}>
                {Defs}
                {Mark}
            </svg>
        );
    }

    // ───────────────────────────────────────────── HORIZONTAL
    if (variant === 'horizontal') {
        // viewBox 280x64 → aspect ratio 4.375
        const w = Math.round(size * 4.375);
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 280 64"
                width={w}
                height={size}
                role="img"
                aria-label={title}
                style={style}
                className={className}>
                {Defs}
                {Mark}
                <line x1="72" y1="14" x2="72" y2="50" stroke={scanline} strokeWidth="0.6" opacity="0.25"/>
                <text x="82" y="36"
                      fontFamily="Rajdhani, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
                      fontSize="28"
                      fontWeight="700"
                      letterSpacing="3"
                      fill={textFill}>NEXUS</text>
                <text x="82" y="50"
                      fontFamily="'JetBrains Mono', 'Consolas', 'Courier New', monospace"
                      fontSize="8"
                      fontWeight="500"
                      letterSpacing="2.4"
                      fill={subtleText}>ERP SYSTEM · LEVELUP ARCADE</text>
            </svg>
        );
    }

    // ───────────────────────────────────────────── STACKED (vertical)
    // viewBox 200x220 → aspect ratio 0.909
    const w = Math.round(size * 0.909);
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 220"
            width={w}
            height={size}
            role="img"
            aria-label={title}
            style={style}
            className={className}>
            {Defs}
            <g transform="translate(36 16) scale(2)">
                {Mark}
            </g>
            <text x="100" y="186"
                  textAnchor="middle"
                  fontFamily="Rajdhani, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
                  fontSize="34"
                  fontWeight="700"
                  letterSpacing="6"
                  fill={textFill}>NEXUS</text>
            <line x1="60" y1="196" x2="140" y2="196" stroke={brandSoft} strokeWidth="0.8"/>
            <text x="100" y="210"
                  textAnchor="middle"
                  fontFamily="'JetBrains Mono', 'Consolas', 'Courier New', monospace"
                  fontSize="9"
                  fontWeight="500"
                  letterSpacing="3.5"
                  fill={subtleText}>ERP · LEVELUP ARCADE</text>
        </svg>
    );
}
