/**
 * components/dashboard/KpiCard.tsx v2
 *
 * Añade micro-interacción CSS animada al borde (borderPulse).
 * El CSS variable --kpi-glow se inyecta inline para que cada
 * tarjeta pulse con su propio color de acento.
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
                // Inyecta la variable CSS para la animación del borde
                ['--kpi-glow' as string]: glow,
                animation:      `fadeInUp 0.4s ${delay}ms ease both, borderPulse 3s ${delay}ms ease infinite`,
            }}
        >
            {/* Glow line superior */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, ${accent}, transparent)`,
                opacity: 0.5,
            }} />

            {/* Cabecera: icono + label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    {title}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: accent, opacity: 0.75, textShadow: `0 0 10px ${glow}` }}>
                    {icon}
                </span>
            </div>

            {/* Valor principal */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: accent, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 'var(--space-2)', textShadow: `0 0 16px ${glow}` }}>
                {value}
            </div>

            {/* Subtexto con trend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: trendColor, fontWeight: 600 }}>
                    {trendIcon}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    {sub}
                </span>
            </div>
        </div>
    );
}
