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

// ── Estilos del modal de cambiar contraseña ──────────────────────────
const cpLabelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'var(--font-display)', fontSize: '10px',
    fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-secondary)', marginBottom: '5px',
};

const cpInputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font-mono)', fontSize: '13px',
    color: 'var(--text-primary)', background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)', borderRadius: '6px',
    padding: '9px 12px', outline: 'none', caretColor: 'var(--accent-primary)',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
};

const cpEyeStyle: React.CSSProperties = {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-mono)', fontSize: '13px',
    color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1,
    transition: 'color 120ms ease',
};

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

    // ── Modal cambiar contraseña ──────────────────────────────────────
    const [showChangePwd,    setShowChangePwd]    = useState(false);
    const [changePwdLoading, setChangePwdLoading] = useState(false);
    const [changePwdSuccess, setChangePwdSuccess] = useState(false);
    const [oldPwdError,      setOldPwdError]      = useState('');
    const [showOldPwd,       setShowOldPwd]       = useState(false);
    const [showNewPwd,       setShowNewPwd]       = useState(false);
    const [showConfirmPwd,   setShowConfirmPwd]   = useState(false);
    const [changePwdForm,    setChangePwdForm]    = useState({ oldPwd: '', newPwd: '', confirmPwd: '' });

    function openChangePwd(): void {
        setShowMenu(false);
        setChangePwdForm({ oldPwd: '', newPwd: '', confirmPwd: '' });
        setOldPwdError('');
        setChangePwdSuccess(false);
        setShowOldPwd(false);
        setShowNewPwd(false);
        setShowConfirmPwd(false);
        setShowChangePwd(true);
    }

    const pwdStrength = {
        length:    changePwdForm.newPwd.length >= 8,
        uppercase: /[A-Z]/.test(changePwdForm.newPwd),
        number:    /[0-9]/.test(changePwdForm.newPwd),
        special:   /[^A-Za-z0-9]/.test(changePwdForm.newPwd),
    };
    const pwdValid   = Object.values(pwdStrength).every(Boolean);
    const confirmOk  = changePwdForm.newPwd === changePwdForm.confirmPwd && changePwdForm.confirmPwd !== '';
    const canSubmit  = changePwdForm.oldPwd.length > 0 && pwdValid && confirmOk && !changePwdLoading;

    async function submitChangePwd(): Promise<void> {
        if (!canSubmit) return;
        setChangePwdLoading(true);
        setOldPwdError('');
        try {
            const { default: api } = await import('../../services/api');
            await api.post('/auth/change-password', {
                oldPassword: changePwdForm.oldPwd,
                newPassword: changePwdForm.newPwd,
            });
            setChangePwdSuccess(true);
            setTimeout(() => setShowChangePwd(false), 1600);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
            setOldPwdError(msg || 'La contraseña actual es incorrecta');
        } finally {
            setChangePwdLoading(false);
        }
    }

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
                            width:          '30px',
                            height:         '30px',
                            borderRadius:   '9px',
                            background:     avatarUrl
                                ? 'transparent'
                                : 'linear-gradient(145deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.07) 100%)',
                            border:         avatarUrl
                                ? 'none'
                                : '1.5px solid rgba(245,158,11,0.40)',
                            boxShadow:      avatarUrl ? 'none' : '0 0 0 3px rgba(245,158,11,0.10)',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            fontFamily:     'var(--font-display)',
                            fontSize:       '11px',
                            fontWeight:     800,
                            letterSpacing:  '0.06em',
                            color:          '#F59E0B',
                            flexShrink:     0,
                            overflow:       'hidden',
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
                                                width:          '44px',
                                                height:         '44px',
                                                borderRadius:   '13px',
                                                background:     avatarUrl
                                                    ? 'transparent'
                                                    : 'linear-gradient(145deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.07) 100%)',
                                                border:         `1.5px solid ${avatarHover
                                                    ? 'rgba(245,158,11,0.70)'
                                                    : avatarUrl ? 'var(--border-subtle)' : 'rgba(245,158,11,0.40)'}`,
                                                boxShadow:      avatarHover
                                                    ? '0 0 0 3px rgba(245,158,11,0.18)'
                                                    : '0 0 0 3px rgba(245,158,11,0.10)',
                                                display:        'flex',
                                                alignItems:     'center',
                                                justifyContent: 'center',
                                                overflow:       'hidden',
                                                flexShrink:     0,
                                                cursor:         'pointer',
                                                position:       'relative',
                                                transition:     'border-color 160ms ease, box-shadow 160ms ease',
                                            }}
                                        >
                                            {avatarUrl
                                                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 800, letterSpacing: '0.06em', color: '#F59E0B' }}>{initials}</span>
                                            }
                                            {/* Overlay de cámara al hover */}
                                            <div style={{
                                                position:   'absolute', inset: 0,
                                                background: 'rgba(0,0,0,0.50)',
                                                display:    'flex', alignItems: 'center', justifyContent: 'center',
                                                opacity:    avatarHover ? 1 : 0,
                                                transition: 'opacity 160ms ease',
                                                fontSize:   '16px',
                                                borderRadius: '13px',
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
                                {/* Cambiar contraseña */}
                                <button
                                    onClick={openChangePwd}
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
                                    🔑 CAMBIAR CONTRASEÑA
                                </button>

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

        {/* ── Modal Cambiar Contraseña ── */}
        {showChangePwd && (
            <div
                onClick={() => { if (!changePwdLoading) setShowChangePwd(false); }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 400,
                    background: 'rgba(0,0,0,0.70)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', padding: '16px',
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: '420px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-accent)',
                        borderRadius: '14px',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                        animation: 'fadeInUp 0.18s cubic-bezier(0.23,1,0.32,1) both',
                    }}
                >
                    {/* Barra superior */}
                    <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))' }} />

                    {/* Cabecera */}
                    <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '5px' }}>
                                Seguridad de cuenta
                            </div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                                Cambiar Contraseña
                            </h2>
                        </div>
                        <button
                            onClick={() => setShowChangePwd(false)}
                            disabled={changePwdLoading}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px', opacity: changePwdLoading ? 0.4 : 1 }}
                        >✕</button>
                    </div>

                    {/* Estado de éxito */}
                    {changePwdSuccess ? (
                        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: '#22C55E' }}>
                                CONTRASEÑA ACTUALIZADA
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Contraseña actual */}
                            <div>
                                <label style={cpLabelStyle}>Contraseña actual *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showOldPwd ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={changePwdForm.oldPwd}
                                        onChange={e => { setChangePwdForm(f => ({ ...f, oldPwd: e.target.value })); setOldPwdError(''); }}
                                        style={{ ...cpInputStyle, paddingRight: '64px', borderColor: oldPwdError ? 'var(--accent-danger)' : undefined }}
                                        onFocus={e  => { if (!oldPwdError) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-primary-glow)'; } }}
                                        onBlur={e   => { e.currentTarget.style.borderColor = oldPwdError ? 'var(--accent-danger)' : 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <button type="button" onClick={() => setShowOldPwd(v => !v)} style={cpEyeStyle}>
                                        {showOldPwd ? '○' : '●'}
                                    </button>
                                </div>
                                {oldPwdError && (
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', margin: '4px 0 0', letterSpacing: '0.02em' }}>
                                        ▲ {oldPwdError}
                                    </p>
                                )}
                            </div>

                            {/* Nueva contraseña */}
                            <div>
                                <label style={cpLabelStyle}>Nueva contraseña *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPwd ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={changePwdForm.newPwd}
                                        onChange={e => setChangePwdForm(f => ({ ...f, newPwd: e.target.value }))}
                                        style={{ ...cpInputStyle, paddingRight: '64px' }}
                                        onFocus={e  => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-primary-glow)'; }}
                                        onBlur={e   => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <button type="button" onClick={() => setShowNewPwd(v => !v)} style={cpEyeStyle}>
                                        {showNewPwd ? '○' : '●'}
                                    </button>
                                </div>
                                {/* Requisitos en vivo */}
                                {changePwdForm.newPwd.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '7px' }}>
                                        {([
                                            ['length',    '8+ caracteres'],
                                            ['uppercase', '1 mayúscula'],
                                            ['number',    '1 número'],
                                            ['special',   '1 especial'],
                                        ] as [keyof typeof pwdStrength, string][]).map(([key, label]) => (
                                            <span key={key} style={{
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '10px',
                                                letterSpacing: '0.04em',
                                                padding:       '2px 7px',
                                                borderRadius:  '3px',
                                                transition:    'all 160ms ease',
                                                background:    pwdStrength[key] ? 'rgba(34,197,94,0.10)' : 'var(--bg-elevated)',
                                                color:         pwdStrength[key] ? '#22C55E'               : 'var(--text-muted)',
                                                border:        `1px solid ${pwdStrength[key] ? 'rgba(34,197,94,0.30)' : 'var(--border-subtle)'}`,
                                            }}>
                                                {pwdStrength[key] ? '✓' : '·'} {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Confirmar contraseña */}
                            <div>
                                <label style={cpLabelStyle}>Confirmar contraseña *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPwd ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={changePwdForm.confirmPwd}
                                        onChange={e => setChangePwdForm(f => ({ ...f, confirmPwd: e.target.value }))}
                                        style={{
                                            ...cpInputStyle,
                                            paddingRight: '64px',
                                            borderColor: changePwdForm.confirmPwd && !confirmOk ? 'var(--accent-danger)' : undefined,
                                        }}
                                        onFocus={e  => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-primary-glow)'; }}
                                        onBlur={e   => { e.currentTarget.style.borderColor = (changePwdForm.confirmPwd && !confirmOk) ? 'var(--accent-danger)' : 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPwd(v => !v)} style={cpEyeStyle}>
                                        {showConfirmPwd ? '○' : '●'}
                                    </button>
                                </div>
                                {changePwdForm.confirmPwd && !confirmOk && (
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', margin: '4px 0 0', letterSpacing: '0.02em' }}>
                                        ▲ Las contraseñas no coinciden
                                    </p>
                                )}
                            </div>

                            {/* Botones */}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowChangePwd(false)}
                                    disabled={changePwdLoading}
                                    style={{
                                        background: 'transparent', border: '1px solid var(--border-default)',
                                        borderRadius: '7px', padding: '9px 18px', cursor: 'pointer',
                                        fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.10em', textTransform: 'uppercase',
                                        color: 'var(--text-secondary)', opacity: changePwdLoading ? 0.4 : 1,
                                        transition: 'opacity 120ms',
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { void submitChangePwd(); }}
                                    disabled={!canSubmit}
                                    style={{
                                        background:    'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                                        color:         'var(--text-inverse)',
                                        border:        'none',
                                        borderRadius:  '7px',
                                        padding:       '9px 20px',
                                        cursor:        canSubmit ? 'pointer' : 'not-allowed',
                                        fontFamily:    'var(--font-display)',
                                        fontSize:      '11px', fontWeight: 700,
                                        letterSpacing: '0.10em', textTransform: 'uppercase',
                                        opacity:       canSubmit ? 1 : 0.45,
                                        boxShadow:     'var(--fab-shadow)',
                                        transition:    'opacity 160ms',
                                    }}
                                >
                                    {changePwdLoading ? '···' : 'Guardar cambios'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </>
    );
}
