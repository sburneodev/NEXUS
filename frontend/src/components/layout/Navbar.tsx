import { useTheme } from '../../hooks/useTheme';

interface NavbarProps {
    title?: string;
}

export function Navbar({ title = 'DASHBOARD' }: NavbarProps): JSX.Element {
    const { theme, toggle } = useTheme();

    const timeStr = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    return (
        <header style={{
            height: '56px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: '16px',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }}>
            <div style={{ flex: 1 }}>
                <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--text-primary)',
                    textTransform: 'uppercase',
                    margin: 0,
                }}>
                    {title}
                </h2>
            </div>

            {/* Estado online */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px',
                background: 'var(--accent-primary-glow)',
                border: '1px solid var(--border-accent)',
                borderRadius: '4px',
            }}>
                <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    boxShadow: '0 0 6px var(--accent-primary)',
                    animation: 'pulse-green 2s infinite',
                }} />
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px',
                    color: 'var(--accent-primary)', letterSpacing: '0.08em',
                }}>
                    ONLINE
                </span>
            </div>

            {/* Reloj */}
            <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                color: 'var(--text-muted)', letterSpacing: '0.06em', minWidth: '72px',
            }}>
                {timeStr}
            </div>

            {/* Separador */}
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

            {/* Toggle tema */}
            <button
                onClick={toggle}
                title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
                style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                    transition: 'all 160ms ease',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
            >
                {theme === 'dark' ? '☀' : '◑'}
            </button>

            {/* Usuario placeholder */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 12px 4px 8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px', cursor: 'pointer',
                transition: 'border-color 160ms ease',
            }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '10px',
                    fontWeight: 700, color: 'var(--bg-void)', flexShrink: 0,
                }}>
                    AD
                </div>
                <div>
                    <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600,
                        letterSpacing: '0.06em', color: 'var(--text-primary)',
                        textTransform: 'uppercase', lineHeight: 1.2,
                    }}>Admin</div>
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '9px',
                        color: 'var(--accent-primary)', letterSpacing: '0.04em',
                    }}>ADMIN</div>
                </div>
            </div>
        </header>
    );
}
