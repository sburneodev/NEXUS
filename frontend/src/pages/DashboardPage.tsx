/* ──────────────────────────────────────────────────────────────────
   DashboardPage — Placeholder hasta que la Épica 5 conecte la IA.
   Muestra KPI cards con datos estáticos de demostración.
────────────────────────────────────────────────────────────────── */

interface KpiCardProps {
    label: string;
    value: string;
    sub: string;
    accent: string;
    glow: string;
    delay: number;
}

function KpiCard({ label, value, sub, accent, glow, delay }: KpiCardProps): JSX.Element {
    return (
        <div
            className="card card--accent animate-fade-up"
            style={{
                borderTopColor: accent,
                animationDelay: `${delay}ms`,
            }}
        >
            <div className="data-label" style={{ marginBottom: '12px' }}>{label}</div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2rem',
                fontWeight: 700,
                color: accent,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                marginBottom: '6px',
                textShadow: `0 0 20px ${glow}`,
            }}>
                {value}
            </div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
            }}>
                {sub}
            </div>
        </div>
    );
}

const KPIS = [
    { label: 'VENTAS HOY', value: '€4.280', sub: '+12% vs ayer', accent: 'var(--accent-primary)', glow: 'rgba(0,255,136,0.4)', delay: 0 },
    { label: 'CLIENTES ACTIVOS', value: '1.847', sub: '8 nuevos esta semana', accent: 'var(--accent-cyan)', glow: 'rgba(0,212,255,0.4)', delay: 80 },
    { label: 'PIEZAS RETRO', value: '23', sub: 'La Bóveda disponible', accent: 'var(--accent-gold)', glow: 'rgba(255,200,69,0.4)', delay: 160 },
    { label: 'STOCK CRÍTICO', value: '7', sub: 'Productos bajo mínimo', accent: 'var(--accent-danger)', glow: 'rgba(255,68,102,0.4)', delay: 240 },
];

export function DashboardPage(): JSX.Element {
    return (
        <div>

            {/* Cabecera */}
            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.4s ease both' }}>
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                }}>
                    Bienvenido,{' '}
                    <span style={{
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        Administrador
                    </span>
                </h1>
                <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                }}>
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* KPI Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
            }}>
                {KPIS.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
            </div>

            {/* Placeholder epica 5 */}
            <div className="card animate-fade-up" style={{ animationDelay: '320ms' }}>
                <div className="data-label" style={{ marginBottom: '12px' }}>
                    ◇ IA & ANALYTICS
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '120px',
                    border: '1px dashed var(--border-default)',
                    borderRadius: '6px',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.06em',
                            marginBottom: '6px',
                        }}>
                            ÉPICA 5 — CHARTS & IA PENDIENTE
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--accent-cyan)',
                            letterSpacing: '0.04em',
                            opacity: 0.6,
                        }}>
                            Gemini · Groq · Chart.js
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
