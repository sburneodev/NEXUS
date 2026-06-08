/**
 * components/layout/Navbar.tsx v4
 *
 * Responsive con fade suave:
 *   El reloj y el badge ONLINE se desvanecen en lugar de aparecer/desaparecer
 *   bruscamente. El hamburger hace lo propio.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth }             from '../../hooks/useAuth';
import { useTheme }            from '../../hooks/useTheme';
import { CookiePreferences }   from '../cookies/CookiePreferences';
import type { Role }           from '../../types/auth';

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
    badge?:        string;
    onMenuToggle?: () => void;
    isMobile?:     boolean;
}

export function Navbar({ title = 'DASHBOARD', badge, onMenuToggle, isMobile = false }: NavbarProps): JSX.Element {
    const { user, logout }        = useAuth();
    const { theme, toggle }       = useTheme();
    const [time, setTime]         = useState('');
    const [showMenu,        setShowMenu]        = useState(false);
    const [showCookiePrefs, setShowCookiePrefs] = useState(false);

    useEffect(() => {
        const tick = (): void => setTime(new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => { setShowMenu(false); }, [user]);

    const isDark      = theme === 'dark';
    const email       = user?.email ?? '';
    const initials    = email ? email.slice(0, 2).toUpperCase() : '';
    const username    = email ? email.split('@')[0].toUpperCase() : '';
    const primaryRole = user ? getPrimaryRole(user.roles) : '—';

    // ── Avatar de perfil ─────────────────────────────────────────────
    const AVATAR_KEY              = email ? `nexus_avatar_${email}` : null;
    const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
        AVATAR_KEY ? localStorage.getItem(AVATAR_KEY) : null
    );
    const [avatarHover, setAvatarHover] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !AVATAR_KEY) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            localStorage.setItem(AVATAR_KEY, result);
            setAvatarUrl(result);
        };
        reader.readAsDataURL(file);
        // Resetea el input para permitir seleccionar el mismo archivo otra vez
        e.target.value = '';
    }, [AVATAR_KEY]);

    return (
    <>
        <header style={{
            height:              '56px',
            background:          isDark ? 'rgba(22,27,34,0.90)' : 'rgba(255,255,255,0.92)',
            backdropFilter:      'blur(16px)',
            WebkitBackdropFilter:'blur(16px)',
            borderBottom:        `1px solid ${isDark ? 'rgba(240,246,252,0.16)' : 'rgba(15,23,42,0.12)'}`,
            display:             'flex',
            alignItems:          'center',
            padding:             '0 16px',
            gap:                 '10px',
            flexShrink:          0,
            position:            'sticky',
            top:                 0,
            zIndex:              10,
            transition:          `padding ${TRANSITION}, background 260ms ease, border-color 260ms ease`,
            boxShadow:           isDark
                ? '0 1px 0 rgba(59,130,246,0.12), 0 6px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)'
                : '0 1px 0 rgba(15,23,42,0.06), 0 2px 8px rgba(0,0,0,0.04)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                    {badge && (
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '9px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            color:         'var(--accent-gold)',
                            border:        '1px solid rgba(251,191,36,0.40)',
                            borderRadius:  '3px',
                            padding:       '1px 7px',
                            background:    'rgba(251,191,36,0.07)',
                            whiteSpace:    'nowrap',
                            flexShrink:    0,
                        }}>
                            {badge}
                        </span>
                    )}
                </div>
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
                    boxShadow: 'none',
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
                            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontSize: '11px',
                            fontWeight: 700, color: 'var(--text-inverse)', flexShrink: 0,
                            overflow: 'hidden',
                        }}>
                            {avatarUrl
                                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : initials
                            }
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
                                padding:      '6px', minWidth: '260px',
                                boxShadow:    'var(--shadow-lg)',
                                zIndex:       99,
                                animation:    'fadeInUp 0.15s ease both',
                            }}>
                                {/* Cabecera del dropdown con avatar */}
                                <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        {/* Avatar clicable */}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onMouseEnter={() => setAvatarHover(true)}
                                            onMouseLeave={() => setAvatarHover(false)}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden', flexShrink: 0,
                                                cursor: 'pointer', position: 'relative',
                                                border: `2px solid ${avatarHover ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                                                transition: 'border-color 160ms ease',
                                            }}
                                        >
                                            {avatarUrl
                                                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--text-inverse)' }}>{initials}</span>
                                            }
                                            {/* Overlay de cámara al hover */}
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                background: 'rgba(0,0,0,0.45)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                opacity: avatarHover ? 1 : 0,
                                                transition: 'opacity 160ms ease',
                                                fontSize: '14px',
                                            }}>
                                                📷
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{
                                                fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600,
                                                letterSpacing: '0.06em', color: 'var(--text-primary)',
                                                textTransform: 'uppercase', marginBottom: '2px',
                                            }}>
                                                {username}
                                            </div>
                                            <div style={{
                                                fontFamily: 'var(--font-mono)', fontSize: '10px',
                                                color: 'var(--text-muted)', letterSpacing: '0.04em',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {email}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Botón cambiar foto */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: '100%', textAlign: 'center',
                                            background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-base)', padding: '5px 10px',
                                            fontFamily: 'var(--font-display)', fontSize: '10px',
                                            fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                                            color: 'var(--text-muted)', cursor: 'pointer',
                                            transition: 'all 160ms ease',
                                        }}
                                        onMouseEnter={e => {
                                            const b = e.currentTarget;
                                            b.style.borderColor = 'var(--accent-primary)';
                                            b.style.color = 'var(--accent-primary)';
                                        }}
                                        onMouseLeave={e => {
                                            const b = e.currentTarget;
                                            b.style.borderColor = 'var(--border-subtle)';
                                            b.style.color = 'var(--text-muted)';
                                        }}
                                    >
                                        📷 CAMBIAR FOTO
                                    </button>
                                    {/* Input oculto */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                                {/* Privacidad / Cookies */}
                                <button
                                    onClick={() => { setShowMenu(false); setShowCookiePrefs(true); }}
                                    style={{
                                        width: '100%', textAlign: 'left',
                                        background: 'transparent', border: 'none',
                                        borderRadius: 'var(--radius-base)', padding: '8px 12px',
                                        fontFamily: 'var(--font-display)', fontSize: '12px',
                                        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                                        color: 'var(--text-secondary)', cursor: 'pointer',
                                        transition: 'background 120ms ease, color 120ms ease',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                    }}
                                    onMouseEnter={e => {
                                        const b = e.currentTarget as HTMLButtonElement;
                                        b.style.background = 'var(--bg-overlay)';
                                        b.style.color = 'var(--text-primary)';
                                    }}
                                    onMouseLeave={e => {
                                        const b = e.currentTarget as HTMLButtonElement;
                                        b.style.background = 'transparent';
                                        b.style.color = 'var(--text-secondary)';
                                    }}
                                >
                                    🔒 PRIVACIDAD
                                </button>

                                {/* Separador */}
                                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

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

        {/* Modal de preferencias de privacidad */}
        {showCookiePrefs && (
            <CookiePreferences onClose={() => setShowCookiePrefs(false)} />
        )}
    </>
    );
}
