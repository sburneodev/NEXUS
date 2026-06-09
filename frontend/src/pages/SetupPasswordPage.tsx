/**
 * SetupPasswordPage.tsx
 * Primer acceso: el usuario establecer su contraseña definitiva.
 * Solo se muestra cuando el backend devuelve mustChangePassword: true en el login.
 * Llama a POST /auth/change-password con oldPassword=NEXUS2026! y el nuevo valor.
 */

import { useState, FormEvent } from 'react';
import { useNavigate }         from 'react-router-dom';
import api                     from '../services/api';
import { AxiosError }          from 'axios';

type PageState = 'idle' | 'loading' | 'error' | 'success';

const TEMP_PASSWORD = 'NEXUS2026!';

export function SetupPasswordPage(): JSX.Element {
    const navigate = useNavigate();

    const [newPassword,     setNewPassword]     = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew,         setShowNew]         = useState(false);
    const [showConfirm,     setShowConfirm]     = useState(false);
    const [status,          setStatus]          = useState<PageState>('idle');
    const [errorMsg,        setErrorMsg]        = useState('');

    async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();

        if (!newPassword || newPassword.length < 8) {
            setStatus('error');
            setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setStatus('error');
            setErrorMsg('Las contraseñas no coinciden.');
            return;
        }
        if (newPassword === TEMP_PASSWORD) {
            setStatus('error');
            setErrorMsg('No puedes usar la contraseña temporal como definitiva.');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            await api.post('/auth/change-password', {
                oldPassword: TEMP_PASSWORD,
                newPassword,
            });
            setStatus('success');
            setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
        } catch (err) {
            const axiosErr = err as AxiosError<{ message?: string }>;
            if (axiosErr.response?.data?.message) {
                setErrorMsg(axiosErr.response.data.message);
            } else {
                setErrorMsg('Error al actualizar la contraseña. Inténtalo de nuevo.');
            }
            setStatus('error');
        }
    }

    const C = {
        primary:  '#F1F5F9',
        secondary:'#E6EDF3',
        muted:    '#B0C4D8',
        accent:   '#3B82F6',
        surface:  '#0C1017',
        border:   'rgba(59,130,246,0.20)',
        inputBg:  'rgba(240,246,252,0.04)',
        bg:       '#050810',
    } as const;

    const onFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.12)';
        e.currentTarget.style.background  = 'rgba(59,130,246,0.06)';
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow   = 'none';
        e.currentTarget.style.background  = C.inputBg;
    };

    return (
        <>
            <style>{`
                @keyframes sp-fadeUp {
                    from { opacity:0; transform:translateY(18px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                @keyframes sp-shake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-5px)}
                    40%{transform:translateX(5px)}
                    60%{transform:translateX(-3px)}
                    80%{transform:translateX(3px)}
                }
                @keyframes sp-success {
                    0%   { transform:scale(0.92); opacity:0; }
                    60%  { transform:scale(1.04); }
                    100% { transform:scale(1);    opacity:1; }
                }
                .sp-btn {
                    width:100%; padding:13px 0;
                    font-family:var(--font-display);
                    font-size:13px; font-weight:700;
                    letter-spacing:0.12em; text-transform:uppercase;
                    color:#fff; border:none; border-radius:8px; cursor:pointer;
                    background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);
                    box-shadow:0 2px 16px rgba(37,99,235,0.42),0 1px 0 rgba(255,255,255,0.08) inset;
                    transition:opacity 180ms ease,transform 120ms ease;
                }
                .sp-btn:hover:not(:disabled){ opacity:.88; transform:translateY(-1px); }
                .sp-btn:active:not(:disabled){ transform:translateY(0); }
                .sp-btn:disabled{ background:rgba(240,246,252,0.06); color:#8B949E; cursor:not-allowed; box-shadow:none; }
            `}</style>

            <div style={{
                minHeight:      '100dvh',
                colorScheme:    'dark',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                background:     C.bg,
                padding:        '20px',
            }}>
                {/* Halo de fondo sutil */}
                <div style={{
                    position:       'fixed',
                    inset:          0,
                    pointerEvents:  'none',
                    background:     'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.09) 0%, transparent 70%)',
                }} />

                <div style={{
                    position:  'relative',
                    zIndex:    1,
                    width:     '100%',
                    maxWidth:  '420px',
                    animation: 'sp-fadeUp 0.40s cubic-bezier(0.23,1,0.32,1) both',
                }}>

                    {/* Wordmark mínimo */}
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <h1 style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      'clamp(2.4rem,8vw,3.6rem)',
                            fontWeight:    800,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            lineHeight:    1,
                            margin:        0,
                        }}>
                            <span style={{ color: C.primary }}>NEX</span>
                            <span style={{
                                background:           'linear-gradient(90deg,#60A5FA 0%,#38BDF8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor:  'transparent',
                                backgroundClip:       'text',
                                filter:               'drop-shadow(0 0 18px rgba(56,189,248,0.35))',
                            }}>US</span>
                        </h1>
                        <p style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '10px',
                            letterSpacing: '0.20em',
                            color:         C.muted,
                            textTransform: 'uppercase',
                            margin:        '8px 0 0',
                        }}>
                            ERP SYSTEM
                        </p>
                    </div>

                    {/* Card */}
                    <div style={{
                        background:     C.surface,
                        border:         '1px solid rgba(59,130,246,0.18)',
                        borderTop:      '2px solid rgba(59,130,246,0.55)',
                        borderRadius:   '14px',
                        padding:        '28px 26px 26px',
                        boxShadow:      '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.75)',
                    }}>

                        {/* Cabecera */}
                        <div style={{ marginBottom: '22px' }}>
                            <h2 style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '11px',
                                fontWeight:    700,
                                letterSpacing: '0.20em',
                                textTransform: 'uppercase',
                                color:         C.muted,
                                textAlign:     'center',
                                margin:        '0 0 12px',
                            }}>
                                PRIMER ACCESO
                            </h2>
                            <p style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   '11px',
                                color:      C.muted,
                                margin:     0,
                                textAlign:  'center',
                                lineHeight: 1.6,
                                letterSpacing: '0.02em',
                            }}>
                                Bienvenido/a a NEXUS. Para proteger tu cuenta establece una contraseña definitiva antes de continuar.
                            </p>
                        </div>

                        {/* Éxito */}
                        {status === 'success' && (
                            <div style={{
                                animation:    'sp-success 0.35s cubic-bezier(0.23,1,0.32,1) both',
                                background:   'rgba(34,197,94,0.08)',
                                border:       '1px solid rgba(34,197,94,0.30)',
                                borderRadius: '8px',
                                padding:      '16px',
                                textAlign:    'center',
                                marginBottom: '16px',
                            }}>
                                <div style={{ fontSize: '22px', marginBottom: '6px' }}>✓</div>
                                <p style={{
                                    fontFamily:    'var(--font-display)',
                                    fontSize:      '11px',
                                    fontWeight:    700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color:         '#22C55E',
                                    margin:        0,
                                }}>
                                    Contraseña establecida
                                </p>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: C.muted, margin: '4px 0 0' }}>
                                    Redirigiendo al dashboard…
                                </p>
                            </div>
                        )}

                        {/* Formulario */}
                        {status !== 'success' && (
                            <div style={{ animation: status === 'error' ? 'sp-shake 0.4s ease' : 'none' }}>
                                <form onSubmit={handleSubmit} noValidate>

                                    {/* Nueva contraseña */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{
                                            display:       'block',
                                            fontFamily:    'var(--font-display)',
                                            fontSize:      '10px',
                                            fontWeight:    700,
                                            letterSpacing: '0.14em',
                                            textTransform: 'uppercase',
                                            color:         C.secondary,
                                            marginBottom:  '7px',
                                        }}>
                                            Nueva contraseña
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showNew ? 'text' : 'password'}
                                                placeholder="Mín. 8 caracteres"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                disabled={status === 'loading'}
                                                autoComplete="new-password"
                                                onFocus={onFocus}
                                                onBlur={onBlur}
                                                style={{
                                                    width:         '100%',
                                                    boxSizing:     'border-box',
                                                    fontFamily:    'var(--font-mono)',
                                                    fontSize:      '13px',
                                                    color:         C.primary,
                                                    background:    C.inputBg,
                                                    border:        `1px solid ${C.border}`,
                                                    borderRadius:  '8px',
                                                    padding:       '11px 52px 11px 14px',
                                                    outline:       'none',
                                                    caretColor:    C.accent,
                                                    transition:    'border-color 160ms ease,box-shadow 160ms ease,background 160ms ease',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNew(p => !p)}
                                                tabIndex={-1}
                                                style={{
                                                    position:      'absolute',
                                                    right:         '10px',
                                                    top:           '50%',
                                                    transform:     'translateY(-50%)',
                                                    background:    'transparent',
                                                    border:        'none',
                                                    cursor:        'pointer',
                                                    fontFamily:    'var(--font-display)',
                                                    fontSize:      '9px',
                                                    fontWeight:    700,
                                                    letterSpacing: '0.12em',
                                                    textTransform: 'uppercase',
                                                    color:         C.muted,
                                                    padding:       '4px 2px',
                                                    lineHeight:    1,
                                                }}
                                            >
                                                {showNew ? 'Ocultar' : 'Ver'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirmar contraseña */}
                                    <div style={{ marginBottom: '22px' }}>
                                        <label style={{
                                            display:       'block',
                                            fontFamily:    'var(--font-display)',
                                            fontSize:      '10px',
                                            fontWeight:    700,
                                            letterSpacing: '0.14em',
                                            textTransform: 'uppercase',
                                            color:         C.secondary,
                                            marginBottom:  '7px',
                                        }}>
                                            Confirmar contraseña
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                placeholder="Repite la contraseña"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                disabled={status === 'loading'}
                                                autoComplete="new-password"
                                                onFocus={onFocus}
                                                onBlur={onBlur}
                                                style={{
                                                    width:         '100%',
                                                    boxSizing:     'border-box',
                                                    fontFamily:    'var(--font-mono)',
                                                    fontSize:      '13px',
                                                    color:         C.primary,
                                                    background:    C.inputBg,
                                                    border:        `1px solid ${C.border}`,
                                                    borderRadius:  '8px',
                                                    padding:       '11px 52px 11px 14px',
                                                    outline:       'none',
                                                    caretColor:    C.accent,
                                                    transition:    'border-color 160ms ease,box-shadow 160ms ease,background 160ms ease',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(p => !p)}
                                                tabIndex={-1}
                                                style={{
                                                    position:      'absolute',
                                                    right:         '10px',
                                                    top:           '50%',
                                                    transform:     'translateY(-50%)',
                                                    background:    'transparent',
                                                    border:        'none',
                                                    cursor:        'pointer',
                                                    fontFamily:    'var(--font-display)',
                                                    fontSize:      '9px',
                                                    fontWeight:    700,
                                                    letterSpacing: '0.12em',
                                                    textTransform: 'uppercase',
                                                    color:         C.muted,
                                                    padding:       '4px 2px',
                                                    lineHeight:    1,
                                                }}
                                            >
                                                {showConfirm ? 'Ocultar' : 'Ver'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Error */}
                                    {status === 'error' && (
                                        <div style={{
                                            background:   'rgba(248,113,113,0.08)',
                                            border:       '1px solid rgba(248,113,113,0.28)',
                                            borderRadius: '7px',
                                            padding:      '10px 13px',
                                            marginBottom: '16px',
                                            fontFamily:   'var(--font-mono)',
                                            fontSize:     '11px',
                                            color:        '#F87171',
                                            letterSpacing:'0.02em',
                                        }}>
                                            ⚠ {errorMsg}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className="sp-btn"
                                    >
                                        {status === 'loading' ? 'Guardando...' : 'Establecer contraseña'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    <p style={{
                        textAlign:     'center',
                        marginTop:     '18px',
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        color:         C.muted,
                        letterSpacing: '0.06em',
                        opacity:       0.45,
                    }}>
                        NEXUS ERP — LevelUp Arcade © 2025
                    </p>
                </div>
            </div>
        </>
    );
}
