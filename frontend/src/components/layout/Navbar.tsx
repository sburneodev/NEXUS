/**
 * components/layout/Navbar.tsx v2
 *
 * Cambios respecto a v1:
 * - Usuario real desde useAuth (corrige bug que mostraba siempre "ADMIN")
 * - Botón logout funcional que limpia estado y localStorage
 * - Reloj con useState (se actualiza cada segundo)
 * - Iniciales del email en el avatar
 * - Toggle tema claro/oscuro (sin tocar el retro)
 */

import { useState, useEffect } from 'react';
import { useAuth }  from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

interface NavbarProps {
    title?: string;
}

export function Navbar({ title = 'DASHBOARD' }: NavbarProps): JSX.Element {
    const { user, logout }          = useAuth();
    const { theme, toggle } = useTheme();
    const [time, setTime]           = useState('');
    const [showMenu, setShowMenu]   = useState(false);

    // Reloj en tiempo real
    useEffect(() => {
        const tick = (): void => {
            setTime(new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Iniciales del email: admin@levelupnexus.es → "AD"
    const email     = user?.email ?? 'admin@levelupnexus.es';
    const initials  = email.slice(0, 2).toUpperCase();
    const username  = email.split('@')[0].toUpperCase();
    const role      = user?.roles[0] ?? '—';

    return (
        <header style={{
            height:       '56px',
            background:   'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display:      'flex',
            alignItems:   'center',
            padding:      '0 20px',
            gap:          '14px',
            flexShrink:   0,
            position:     'sticky',
            top:          0,
            zIndex:       10,
        }}>

            {/* Título de la ruta */}
            <div style={{ flex: 1 }}>
                <h2 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '14px',
                    fontWeight:    700,
                    letterSpacing: '0.16em',
                    color:         'var(--text-primary)',
                    textTransform: 'uppercase',
                    margin:        0,
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
                }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
                    ONLINE
                </span>
            </div>

            {/* Reloj */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.06em', minWidth: '72px' }}>
                {time}
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

            {/* Toggle tema */}
            {(
                <button
                    onClick={toggle}
                    title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
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
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-cyan)';
                        (e.currentTarget as HTMLButtonElement).style.color       = 'var(--accent-cyan)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                        (e.currentTarget as HTMLButtonElement).style.color       = 'var(--text-muted)';
                    }}
                >
                    {theme === 'dark' ? '☀' : '◑'}
                </button>
            )}

            {/* Menú de usuario — datos reales */}
            <div style={{ position: 'relative' }}>
                <div
                    onClick={() => setShowMenu(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '4px 12px 4px 8px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px', cursor: 'pointer',
                        transition: 'border-color 160ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'; }}
                >
                    {/* Avatar con iniciales reales */}
                    <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: '11px',
                        fontWeight: 700, color: 'var(--text-inverse)', flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-primary)', textTransform: 'uppercase', lineHeight: 1.2 }}>
                            {username}
                        </div>
                        {role.toUpperCase() !== username && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
                                {role}
                            </div>
                        )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>▾</span>
                </div>

                {/* Dropdown menú */}
                {showMenu && (
                    <>
                        <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '6px',
                            minWidth: '180px',
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 99,
                            animation: 'fadeInUp 0.15s ease both',
                        }}>
                            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                                    {email}
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowMenu(false); logout(); }}
                                style={{
                                    width: '100%', textAlign: 'left',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: 'var(--radius-base)',
                                    padding: '8px 10px',
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '12px', fontWeight: 600,
                                    letterSpacing: '0.08em', textTransform: 'uppercase',
                                    color: 'var(--accent-danger)',
                                    cursor: 'pointer',
                                    transition: 'background 120ms ease',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-danger-glow)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                            >
                                ⏻ CERRAR SESIÓN
                            </button>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}
