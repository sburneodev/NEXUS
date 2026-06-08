import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpaceInvaders } from '../components/game/SpaceInvaders';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { LoginResponse } from '../types/auth';
import { AxiosError } from 'axios';

type LoginState = 'idle' | 'loading' | 'error';

export function LoginPage(): JSX.Element {
    const { login }    = useAuth();
    const navigate     = useNavigate();

    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [status,   setStatus]   = useState<LoginState>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        if (!email.trim() || !password) {
            setStatus('error');
            setErrorMsg('Introduce email y contraseña.');
            return;
        }
        setStatus('loading');
        setErrorMsg('');
        try {
            const { data } = await api.post<LoginResponse>('/auth/login', {
                email:    email.trim().toLowerCase(),
                password,
            });
            if (data.token) {
                login(data.token);
                navigate('/dashboard', { replace: true });
            } else {
                setStatus('error');
                setErrorMsg('El servidor no devolvió un token. Inténtalo de nuevo.');
            }
        } catch (err) {
            const axiosErr = err as AxiosError<{ message?: string }>;
            if (axiosErr.response?.status === 401 || axiosErr.response?.status === 403) {
                setErrorMsg('Credenciales incorrectas o cuenta no verificada.');
            } else if (axiosErr.response?.data?.message) {
                setErrorMsg(axiosErr.response.data.message);
            } else if (axiosErr.code === 'ERR_NETWORK') {
                setErrorMsg('No se puede conectar con el servidor. Comprueba tu conexión.');
            } else {
                setErrorMsg('Error inesperado. Inténtalo de nuevo.');
            }
            setStatus('error');
        }
    }

    /* ── Colores del nuevo sistema ───────────────────────────────── */
    const C = {
        primary:   '#F0F6FC',   // casi blanco — textos principales
        secondary: '#C9D1D9',   // gris claro  — labels, subtítulos
        muted:     '#8B949E',   // gris medio  — hints, placeholders
        accent:    '#3B82F6',   // azul primario
        surface:   '#1C2128',   // fondo tarjeta
        border:    'rgba(240,246,252,0.12)',
        inputBg:   'rgba(240,246,252,0.05)',
    } as const;

    /* ── Focus / Blur helpers para inputs ───────────────────────── */
    const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.15)';
        e.currentTarget.style.background  = 'rgba(240,246,252,0.07)';
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow   = 'none';
        e.currentTarget.style.background  = C.inputBg;
    };

    return (
        <>
            <style>{`
                @keyframes lp-fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes lp-shake {
                    0%,100% { transform: translateX(0); }
                    20%     { transform: translateX(-5px); }
                    40%     { transform: translateX(5px); }
                    60%     { transform: translateX(-3px); }
                    80%     { transform: translateX(3px); }
                }
                /* Retícula de puntos igual que el resto de la app */
                .lp-bg {
                    background-color: #0D1117;
                    background-image:
                        radial-gradient(ellipse 140% 70% at 50% -10%, rgba(59,130,246,0.20) 0%, transparent 55%),
                        radial-gradient(ellipse 60% 40% at 95% 92%,   rgba(56,189,248,0.10) 0%, transparent 50%),
                        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0);
                    background-size: 100% 100%, 100% 100%, 26px 26px;
                    background-attachment: fixed;
                }
                /* Botón submit */
                .lp-btn {
                    width: 100%; padding: 13px 0;
                    font-family: var(--font-display);
                    font-size: 13px; font-weight: 700;
                    letter-spacing: 0.12em; text-transform: uppercase;
                    color: #fff; border: none; border-radius: 8px;
                    cursor: pointer;
                    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
                    box-shadow: 0 2px 12px rgba(37,99,235,0.35), 0 1px 0 rgba(255,255,255,0.10) inset;
                    transition: opacity 180ms ease, transform 120ms ease, box-shadow 180ms ease;
                }
                .lp-btn:hover:not(:disabled) {
                    opacity: .92;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(37,99,235,0.45), 0 1px 0 rgba(255,255,255,0.12) inset;
                }
                .lp-btn:active:not(:disabled) { transform: translateY(0); opacity: 1; }
                .lp-btn:disabled { background: rgba(240,246,252,0.06); color: #8B949E; cursor: not-allowed; box-shadow: none; }
            `}</style>

            {/* Fondo con juego + overlay + retícula */}
            <div className="lp-bg" style={{
                minHeight: '100dvh', colorScheme: 'dark',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* SpaceInvaders */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                    <SpaceInvaders />
                </div>

                {/* Overlay semitransparente */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                    background: 'rgba(13,17,23,0.62)',
                }} />

                {/* Contenido */}
                <div style={{
                    position: 'relative', zIndex: 2,
                    width: '100%', maxWidth: '400px', padding: '20px',
                    animation: 'lp-fadeUp 0.5s ease both',
                }}>

                    {/* ── Cabecera con wordmark ────────────────────── */}
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>

                        {/* Eyebrow LEVELUP ARCADE */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '12px', marginBottom: '14px',
                        }}>
                            <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.60))' }} />
                            <span style={{
                                fontFamily: "var(--font-display)",
                                fontSize: '10px', fontWeight: 600,
                                color: C.muted, letterSpacing: '0.24em', textTransform: 'uppercase',
                            }}>LEVELUP ARCADE</span>
                            <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, rgba(56,189,248,0.60), transparent)' }} />
                        </div>

                        {/* NEXUS — NEX casi blanco, US en gradiente brillante */}
                        <h1 style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 'clamp(3.2rem, 10vw, 5.2rem)',
                            fontWeight: 800, letterSpacing: '0.06em',
                            textTransform: 'uppercase', lineHeight: 1, margin: 0,
                        }}>
                            <span style={{ color: C.primary }}>NEX</span>
                            <span style={{
                                background: 'linear-gradient(90deg, #7DD3FC 0%, #38BDF8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>US</span>
                        </h1>

                        {/* Tagline */}
                        <p style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: '10px', letterSpacing: '0.18em',
                            color: C.muted, marginTop: '6px', textTransform: 'uppercase',
                        }}>ERP SYSTEM</p>
                    </div>

                    {/* ── Tarjeta de login ─────────────────────────── */}
                    <div style={{
                        background:   C.surface,
                        borderTop:    '2px solid #3B82F6',
                        borderLeft:   '1px solid rgba(255,255,255,0.10)',
                        borderRight:  '1px solid rgba(255,255,255,0.06)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '14px',
                        padding:      '28px 26px 24px',
                        boxShadow:    [
                            '0 32px 80px rgba(0,0,0,0.65)',
                            '0 0 0 1px rgba(255,255,255,0.05)',
                            '0 1px 0 rgba(255,255,255,0.08) inset',
                        ].join(', '),
                    }}>

                        <h2 style={{
                            fontFamily: "var(--font-display)",
                            fontSize: '11px', fontWeight: 700,
                            letterSpacing: '0.20em', textTransform: 'uppercase',
                            color: C.secondary, textAlign: 'center', margin: '0 0 24px',
                        }}>
                            ACCESO AL SISTEMA
                        </h2>

                        <div style={{ animation: status === 'error' ? 'lp-shake 0.4s ease' : 'none' }}>
                            <form onSubmit={handleSubmit} noValidate>

                                {/* Email */}
                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontFamily: "var(--font-display)",
                                        fontSize: '10px', fontWeight: 700,
                                        letterSpacing: '0.14em', textTransform: 'uppercase',
                                        color: C.secondary, marginBottom: '7px',
                                    }}>Email</label>
                                    <input
                                        type="email" autoComplete="email"
                                        placeholder="usuario@levelupnexus.es"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        disabled={status === 'loading'}
                                        onFocus={onFocus} onBlur={onBlur}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            fontFamily: "var(--font-mono)",
                                            fontSize: '13px', color: C.primary,
                                            background: C.inputBg,
                                            border: `1px solid ${C.border}`,
                                            borderRadius: '8px', padding: '11px 14px',
                                            outline: 'none', caretColor: C.accent,
                                            transition: 'border-color 160ms ease, box-shadow 160ms ease, background 160ms ease',
                                        }}
                                    />
                                </div>

                                {/* Contraseña */}
                                <div style={{ marginBottom: '22px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontFamily: "var(--font-display)",
                                        fontSize: '10px', fontWeight: 700,
                                        letterSpacing: '0.14em', textTransform: 'uppercase',
                                        color: C.secondary, marginBottom: '7px',
                                    }}>Contraseña</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            disabled={status === 'loading'}
                                            onFocus={onFocus} onBlur={onBlur}
                                            style={{
                                                width: '100%', boxSizing: 'border-box',
                                                fontFamily: "var(--font-mono)",
                                                fontSize: '13px', color: C.primary,
                                                background: C.inputBg,
                                                border: `1px solid ${C.border}`,
                                                borderRadius: '8px',
                                                padding: '11px 52px 11px 14px',
                                                outline: 'none', caretColor: C.accent,
                                                transition: 'border-color 160ms ease, box-shadow 160ms ease, background 160ms ease',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(p => !p)}
                                            tabIndex={-1}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                fontFamily: "var(--font-display)",
                                                fontSize: '9px', fontWeight: 700,
                                                letterSpacing: '0.12em', textTransform: 'uppercase',
                                                color: C.muted, padding: '4px 2px', lineHeight: 1,
                                                transition: 'color 160ms ease',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.color = C.secondary)}
                                            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                                        >{showPass ? 'Ocultar' : 'Ver'}</button>
                                    </div>
                                </div>

                                {/* Error */}
                                {status === 'error' && (
                                    <div style={{
                                        background: 'rgba(248,113,113,0.09)',
                                        border: '1px solid rgba(248,113,113,0.35)',
                                        borderRadius: '7px', padding: '10px 13px',
                                        marginBottom: '16px',
                                        fontFamily: "var(--font-mono)",
                                        fontSize: '11px', color: '#F87171', letterSpacing: '0.02em',
                                    }}>
                                        ⚠ {errorMsg}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="lp-btn"
                                >
                                    {status === 'loading' ? 'Autenticando...' : 'Iniciar Sesión'}
                                </button>

                            </form>
                        </div>
                    </div>

                    {/* Pie de página */}
                    <p style={{
                        textAlign: 'center', marginTop: '20px',
                        fontFamily: "var(--font-mono)",
                        fontSize: '10px', color: C.muted, letterSpacing: '0.06em',
                    }}>
                        NEXUS ERP — LevelUp Arcade © 2025
                    </p>
                </div>
            </div>
        </>
    );
}
