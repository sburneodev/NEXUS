/**
 * components/dashboard/KpiCard.tsx — UI-03
 *
 * Tarjeta de KPI reutilizable.
 * Recibe title, value, sub, trend e icon.
 * El trend (positivo/negativo) cambia el color del indicador.
 */

interface KpiCardProps {
    /** Etiqueta superior — ej. "VENTAS HOY" */
    title: string;
    /** Valor principal — ej. "€4.280" */
    value: string;
    /** Texto secundario — ej. "+12% vs ayer" */
    sub: string;
    /** Icono o símbolo — ej. "◈" o "€" */
    icon: string;
    /** Color del acento — usa variables CSS del sistema */
    accent: string;
    /** Color del glow para el text-shadow */
    glow: string;
    /** Tendencia: positiva (verde) | negativa (rojo) | neutral */
    trend?: 'up' | 'down' | 'neutral';
    /** Delay de animación en ms */
    delay?: number;
}

export function KpiCard({
    title, value, sub, icon, accent, glow,
    trend = 'neutral',
    delay = 0,
}: KpiCardProps): JSX.Element {

    const trendColor =
        trend === 'up' ? 'var(--accent-primary)' :
            trend === 'down' ? 'var(--accent-danger)' :
                'var(--text-muted)';

    const trendIcon =
        trend === 'up' ? '▲' :
            trend === 'down' ? '▼' :
                '—';

    return (
        <div
            className="card animate-fade-up"
            style={{
                borderTop: `2px solid ${accent}`,
                animationDelay: `${delay}ms`,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Glow de fondo sutil */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '2px',
                background: `linear-gradient(90deg, ${accent}, transparent)`,
                opacity: 0.4,
            }} />

            {/* Cabecera: icono + label */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
            }}>
                <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                }}>
                    {title}
                </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '18px',
                    color: accent,
                    opacity: 0.7,
                    textShadow: `0 0 10px ${glow}`,
                }}>
                    {icon}
                </span>
            </div>

            {/* Valor principal */}
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2rem',
                fontWeight: 700,
                color: accent,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                marginBottom: '8px',
                textShadow: `0 0 20px ${glow}`,
            }}>
                {value}
            </div>

            {/* Subtexto con trend */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
            }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: trendColor,
                    fontWeight: 600,
                }}>
                    {trendIcon}
                </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                }}>
                    {sub}
                </span>
            </div>
        </div>
    );
}
