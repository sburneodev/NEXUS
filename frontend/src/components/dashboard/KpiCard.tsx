/**
 * components/dashboard/KpiCard.tsx v3
 *
 * Responsive: fuentes con clamp(), título en una línea (ellipsis),
 * subtexto limitado a 2 líneas para no desbordarse en mobile.
 */

interface KpiCardProps {
    title:   string;
    value:   string;
    sub:     string;
    icon:    string;
    accent:  string;
    glow:    string;
    trend?:  'up' | 'down' | 'neutral';
    delay?:  number;
}

export function KpiCard({
    title, value, sub, icon, accent, glow,
    trend = 'neutral',
    delay = 0,
}: KpiCardProps): JSX.Element {

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
            className="card no-theme-transition"
            style={{
                borderTop:      `2px solid ${accent}`,
                animationDelay: `${delay}ms`,
                position:       'relative',
                overflow:       'hidden',
                padding:        'clamp(10px, 2.5vw, 20px)',
                ['--kpi-glow' as string]: glow,
                animation:      `fadeInUp 0.4s ${delay}ms ease both, borderPulse 3s ${delay}ms ease infinite`,
            }}
        >
            {/* Glow line superior */}
            <div style={{
                position:   'absolute',
                top:        0, left: 0, right: 0,
                height:     '2px',
                background: `linear-gradient(90deg, ${accent}, transparent)`,
                opacity:    0.5,
            }} />

            {/* Cabecera: label + icono */}
            <div style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent:'space-between',
                marginBottom:  'clamp(6px, 1.5vw, 12px)',
                gap:           '4px',
            }}>
                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(9px, 1.8vw, 0.6875rem)',
                    fontWeight:    700,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color:         'var(--text-secondary)',
                    // Siempre en una línea: si no cabe, se corta con puntos suspensivos
                    whiteSpace:    'nowrap',
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                    minWidth:      0,
                }}>
                    {title}
                </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   'clamp(14px, 3vw, 18px)',
                    color:      accent,
                    opacity:    0.75,
                    textShadow: `0 0 10px ${glow}`,
                    flexShrink: 0,
                }}>
                    {icon}
                </span>
            </div>

            {/* Valor principal */}
            <div style={{
                fontFamily:   'var(--font-mono)',
                fontSize:     'clamp(1.25rem, 4vw, 1.75rem)',
                fontWeight:   700,
                color:        accent,
                letterSpacing:'-0.02em',
                lineHeight:   1,
                marginBottom: 'clamp(4px, 1vw, 8px)',
                textShadow:   `0 0 16px ${glow}`,
            }}>
                {value}
            </div>

            {/* Subtexto con trend — máximo 2 líneas */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   'clamp(9px, 1.8vw, var(--text-xs))',
                    color:      trendColor,
                    fontWeight: 600,
                    flexShrink: 0,
                    lineHeight: '1.4',
                }}>
                    {trendIcon}
                </span>
                <span style={{
                    fontFamily:        'var(--font-mono)',
                    fontSize:          'clamp(10px, 2vw, 12px)',
                    color:             'var(--text-muted)',
                    letterSpacing:     '0.03em',
                    lineHeight:        '1.4',
                    // Limita a 2 líneas con ellipsis
                    display:           '-webkit-box',
                    WebkitLineClamp:   2,
                    WebkitBoxOrient:   'vertical',
                    overflow:          'hidden',
                }}>
                    {sub}
                </span>
            </div>
        </div>
    );
}
