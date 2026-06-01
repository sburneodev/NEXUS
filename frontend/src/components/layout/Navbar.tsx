/**
 * components/layout/Navbar.tsx v4
 *
 * Responsive con fade suave:
 *   El reloj y el badge ONLINE se desvanecen en lugar de aparecer/desaparecer
 *   bruscamente. El hamburger hace lo propio.
 */

import { useState, useEffect } from 'react';
import { useAuth }  from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import type { Role } from '../../types/auth';

const ROLE_PRIORITY: Role[] = [
    'ADMIN', 'CONTABLE', 'MARKETING_ANALYST', 'GESTOR_INVENTARIO', 'CAJERO',
];

function getPrimaryRole(roles: Role[]): string {
    for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
    return roles[0] ?? '—';
}

const TRANSITION = '300ms cubic-bezier(0.4, 0, 0.2, 1)';

interface NavbarProps {
    title?:        string;
    onMenuToggle?: () => void;
    isMobile?:     boolean;
}

export function Navbar({ title = 'DASHBOARD', onMenuToggle, isMobile = false }: NavbarProps): JSX.Element {
    const { user, logout }        = useAuth();
    const { theme, toggle }       = useTheme();
    const [time, setTime]         = useState('');
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        const tick = (): void => setTime(new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => { setShowMenu(false); }, [user]);

    const email       = user?.email ?? '';
    const initials    = email ? email.slice(0, 2).toUpperCase() : '';
    const username    = email ? email.split('@')[0].toUpperCase() : '';
    const primaryRole = user ? getPrimaryRole(user.roles) : '—';

    return (
        <header style={{
            height:       '56px',
            background:   'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display:      'flex',
            alignItems:   'center',
            padding:      '0 16px',
            gap:          '10px',
            flexShrink:   0,
            position:     'sticky',
            top:          0,
            zIndex:       10,
            transition:   `padding ${TRANSITION}`,
        }}>

            {/* ── Hamburger — fade in/out suave ── */}
            <button
                onClick={onMenuToggle}
                aria-label="Abrir menú"
                style={{
                    background:   'transparent',
                    border:       '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color:        'var(--text-muted)',
                    cursor:       'pointer',
                    padding:           isMobile ? '6px 9px' : '0',
                    fontSize:     '15px',
                    lineHeight:   1,
                    flexShrink:   0,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    transition:   `opacity ${TRANSITION}, transform ${TRANSITION}, all 160ms ease`,
                    // Fade y escala: visible en mobile, invisible+sin espacio en desktop
                    opacity:           isMobile ? 1 : 0,
                    pointerEvents:     isMobile ? 'auto' : 'none',
                    width:             isMobile ? undefined : '0',                  
                    overflow:          'hidden',
                    marginRight:       isMobile ? '0' : '-10px',
                }}
                onMouseEnter={e => {
                    if (!isMobile) return;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-cyan)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-cyan)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
            >
                ☰
            </button>

            {/* ── Título ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '14px',
                    fontWeight:    700,
                    letterSpacing: '0.16em',
                    color:         'var(--text-primary)',
                    textTransform: 'uppercase',
                    margin:        0,
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                    whiteSpace:    'nowrap',
                }}>
                    {title}
                </h2>
            </div>

            {/* ── ONLINE — se desvanece en mobile ── */}
            <div style={{
                display:     'flex',
                alignItems:  'center',
                gap:         '6px',
                padding:     '4px 10px',
                background:  'var(--accent-primary-glow)',
                border:      '1px solid var(--border-accent)',
                borderRadius:'4px',
                opacity:     isMobile ? 0 : 1,
                maxWidth:    isMobile ? '0' : '120px',
                overflow:    'hidden',
                transition:  `opacity ${TRANSITION}, max-width ${TRANSITION}`,
                pointerEvents: 'none',
                flexShrink:  0,
            }}>
                <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    boxShadow: '0 0 6px var(--accent-primary)',
                    flexShrink: 0,
                }} />
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px',
                    color: 'var(--accent-primary)', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                }}>
                    ONLINE
                </span>
            </div>

            {/* ── Reloj — se desvanece en mobile ── */}
            <div style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '11px',
                color:       'var(--text-muted)',
                letterSpacing: '0.06em',
                minWidth:    '72px',
                opacity:     isMobile ? 0 : 1,
                maxWidth:    isMobile ? '0' : '80px',
                overflow:    'hidden',
                transition:  `opacity ${TRANSITION}, max-width ${TRANSITION}`,
                flexShrink:  0,
            }}>
                {time}
            </div>

            {/* Separador */}
            <div style={{
                width:      '1px',
                height:     '24px',
                background: 'var(--border-subtle)',
                opacity:    isMobile ? 0 : 1,
                transition: `opacity ${TRANSITION}`,
                flexShrink: 0,
            }} />

            {/* ── Toggle tema ── */}
            <button
                onClick={toggle}
                title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
                style={{
                    background:   'transparent',
                    border:       '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color:        'var(--text-muted)',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '12px',
                    padding:      '4px 10px',
                    cursor:       'pointer',
                    letterSpacing:'0.06em',
                    transition:   `all 160ms ease`,
                    flexShrink:   0,
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-cyan)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-cyan)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
            >
                {theme === 'dark' ? '☀' : '◑'}
            </button>

            {/* ── Usuario ── */}
            {user && (
                <div style={{ position: 'relative' }}>
                    <div
                        onClick={() => setShowMenu(v => !v)}
                        style={{
                            display:   'flex', alignItems: 'center', gap: '8px',
                            padding:   '4px 10px 4px 6px',
                            background:'var(--bg-elevated)',
                            border:    '1px solid var(--border-subtle)',
                            borderRadius: '6px', cursor: 'pointer',
                            transition:`border-color 160ms ease`,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'; }}
                    >
                        <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontSize: '11px',
                            fontWeight: 700, color: 'var(--text-inverse)', flexShrink: 0,
                        }}>
                            {initials}
                        </div>

                        {/* Nombre y rol: se desvanecen en mobile */}
                        <div style={{
                            display:  'flex', flexDirection: 'column', gap: '1px',
                            maxWidth: isMobile ? '0' : '120px',
                            overflow: 'hidden',
                            opacity:  isMobile ? 0 : 1,
                            transition: `opacity ${TRANSITION}, max-width ${TRANSITION}`,
                        }}>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600,
                                letterSpacing: '0.06em', color: 'var(--text-primary)',
                                textTransform: 'uppercase', lineHeight: 1.2, whiteSpace: 'nowrap',
                            }}>
                                {username}
                            </div>
                            {primaryRole.toUpperCase() !== username && (
                                <div style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                                    color: 'var(--accent-cyan)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                                }}>
                                    {primaryRole}
                                </div>
                            )}
                        </div>

                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '10px',
                            color: 'var(--text-muted)', flexShrink: 0,
                        }}>▾</span>
                    </div>

                    {/* Dropdown */}
                    {showMenu && (
                        <>
                            <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                            <div style={{
                                position:     'absolute', top: 'calc(100% + 6px)', right: 0,
                                background:   'var(--bg-elevated)',
                                border:       '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-lg)',
                                padding:      '6px', minWidth: '200px',
                                boxShadow:    'var(--shadow-lg)',
                                zIndex:       99,
                                animation:    'fadeInUp 0.15s ease both',
                            }}>
                                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600,
                                        letterSpacing: '0.06em', color: 'var(--text-primary)',
                                        textTransform: 'uppercase', marginBottom: '3px',
                                    }}>
                                        {username}
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                                        color: 'var(--text-muted)', letterSpacing: '0.04em', wordBreak: 'break-all',
                                    }}>
                                        {email}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowMenu(false); logout(); }}
                                    style={{
                                        width: '100%', textAlign: 'left',
                                        background: 'transparent', border: 'none',
                                        borderRadius: 'var(--radius-base)', padding: '8px 12px',
                                        fontFamily: 'var(--font-display)', fontSize: '12px',
                                        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                                        color: 'var(--accent-danger)', cursor: 'pointer',
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
            )}
        </header>
    );
}
