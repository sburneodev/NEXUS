import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface KpiCardProps {
    title:   string;
    value:   string;
    sub:     string;
    icon:    string;
    accent:  string;
    glow?:   string;
    trend?:  'up' | 'down' | 'neutral';
    delay?:  number;
}

// ── Hook: count-up rápido y sutil ────────────────────────────────────────────
//
// Parsea el número del string de value, anima de 0 → target con ease-out cúbico,
// respeta el delay de entrada de la card.
// Si el string no contiene número (ej. "—") devuelve el valor sin tocar.
//
function useCountUp(targetStr: string, startDelay: number): string {
    const [display, setDisplay] = useState<string>('0');
    const rafRef               = useRef<number | null>(null);

    useEffect(() => {
        // Extrae: prefix (ej. "€"), número, suffix (ej. "%")
        const match = targetStr.match(/^([^\d\-]*)(-?\d+(?:[.,]\d+)?)(.*)$/);
        if (!match) {
            setDisplay(targetStr);
            return;
        }

        const prefix   = match[1];
        const numStr   = match[2].replace(',', '.');
        const suffix   = match[3];
        const target   = parseFloat(numStr);

        if (isNaN(target)) {
            setDisplay(targetStr);
            return;
        }

        // Número 0 → muestra directamente sin animar
        if (target === 0) {
            setDisplay(targetStr);
            return;
        }

        const isInt    = !numStr.includes('.');
        const decimals = isInt ? 0 : (numStr.split('.')[1]?.length ?? 2);

        // Empieza coincidiendo con la aparición de la card (+50ms de gracia)
        const DURATION = 700;
        let startTime: number | null = null;

        setDisplay(prefix + (isInt ? '0' : (0).toFixed(decimals)) + suffix);

        const timer = window.setTimeout(() => {
            const tick = (ts: number) => {
                if (startTime === null) startTime = ts;
                const elapsed  = ts - startTime;
                const progress = Math.min(elapsed / DURATION, 1);
                // ease-out cubic: arranque rápido, frenazo suave al final
                const eased    = 1 - Math.pow(1 - progress, 3);
                const current  = isInt
                    ? Math.round(eased * target)
                    : parseFloat((eased * target).toFixed(decimals));

                setDisplay(prefix + (isInt ? current.toString() : current.toFixed(decimals)) + suffix);

                if (progress < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    setDisplay(targetStr);   // snap final exacto
                }
            };
            rafRef.current = requestAnimationFrame(tick);
        }, startDelay + 50);

        return () => {
            window.clearTimeout(timer);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [targetStr, startDelay]);

    return display;
}

// ── KpiCard ──────────────────────────────────────────────────────────────────

export function KpiCard({
    title, value, sub, icon, accent,
    trend = 'neutral',
    delay = 0,
}: KpiCardProps): JSX.Element {

    const { isDark }    = useTheme();
    const animatedValue = useCountUp(value, delay);

    // ── Estilos dependientes del tema ────────────────────────────────
    const borderL  = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.07)';
    const borderR  = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.04)';
    const borderB  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.03)';
    const shadow   = isDark
        ? '0 4px 24px rgba(0,0,0,0.60), 0 1px 0 rgba(255,255,255,0.10) inset'
        : '0 2px 10px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)';
    const hoverShadow = isDark
        ? '0 10px 36px rgba(0,0,0,0.68), 0 0 0 1px rgba(255,255,255,0.14), 0 1px 0 rgba(255,255,255,0.10) inset'
        : '0 6px 18px rgba(0,0,0,0.09), 0 0 0 1px rgba(37,99,235,0.12)';

    const trendColor =
        trend === 'up'   ? 'var(--accent-primary)' :
        trend === 'down' ? 'var(--accent-danger)'  :
        'var(--text-muted)';

    const trendIcon =
        trend === 'up'   ? '▲' :
        trend === 'down' ? '▼' :
        '—';

    return (
        <div
            style={{
                background:    'var(--bg-surface)',
                borderTop:     `2px solid ${accent}`,
                borderLeft:    `1px solid ${borderL}`,
                borderRight:   `1px solid ${borderR}`,
                borderBottom:  `1px solid ${borderB}`,
                borderRadius:  '10px',
                padding:       'clamp(14px, 2.5vw, 22px)',
                position:      'relative',
                overflow:      'hidden',
                animationDelay:`${delay}ms`,
                animation:     `fadeInUp 0.30s ${delay}ms ease both`,
                transition:    'transform 200ms ease, box-shadow 200ms ease',
                boxShadow:     shadow,
            }}
            onMouseEnter={e => {
                if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(-2px)';
                el.style.boxShadow = hoverShadow;
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = shadow;
            }}
        >
            {/* Cabecera: label + icono badge */}
            <div style={{
                display:        'flex',
                alignItems:     'flex-start',
                justifyContent: 'space-between',
                marginBottom:   'clamp(10px, 2vw, 16px)',
                gap:            '8px',
            }}>
                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(9px, 1.8vw, 11px)',
                    fontWeight:    700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         'var(--text-muted)',
                    whiteSpace:    'nowrap',
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                    minWidth:      0,
                    lineHeight:    1.3,
                }}>
                    {title}
                </span>

                {/* Icono */}
                <div style={{
                    width:          '30px',
                    height:         '30px',
                    borderRadius:   '7px',
                    background:     'var(--bg-elevated)',
                    border:         '1px solid var(--border-subtle)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                    fontSize:       '14px',
                    color:          accent,
                }}>
                    {icon}
                </div>
            </div>

            {/* Valor principal — animado */}
            <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(1.6rem, 5vw, 2.2rem)',
                fontWeight:    700,
                color:         accent,
                letterSpacing: '-0.03em',
                lineHeight:    1,
                marginBottom:  'clamp(8px, 1.5vw, 12px)',
                // Evita saltos de layout mientras el número crece
                fontVariantNumeric: 'tabular-nums',
            }}>
                {animatedValue}
            </div>

            {/* Subtexto con trend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   'clamp(9px, 1.8vw, 11px)',
                    color:      trendColor,
                    fontWeight: 700,
                    flexShrink: 0,
                }}>
                    {trendIcon}
                </span>
                <span style={{
                    fontFamily:      'var(--font-mono)',
                    fontSize:        'clamp(10px, 2vw, 12px)',
                    color:           'var(--text-muted)',
                    letterSpacing:   '0.02em',
                    lineHeight:      1.4,
                    display:         '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow:        'hidden',
                }}>
                    {sub}
                </span>
            </div>
        </div>
    );
}
