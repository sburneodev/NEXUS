/**
 * components/cookies/CookiePreferences.tsx
 *
 * Modal de reconfiguración de cookies accesible desde el perfil de usuario.
 * Permite cambiar la decisión en cualquier momento sin tener que esperar
 * a que expire el consentimiento (12 meses).
 */

import { useState }          from 'react';
import { useCookieConsent }  from '../../hooks/useCookieConsent';
import { COOKIE_POLICY_VERSION } from '../../services/cookieService';

interface CookiePreferencesProps {
    onClose: () => void;
}

export function CookiePreferences({ onClose }: CookiePreferencesProps): JSX.Element {
    const { status, record, accept, reject } = useCookieConsent();
    const [saved, setSaved] = useState(false);

    const analyticsOn = status === 'granted';

    const handleSave = (newStatus: 'granted' | 'denied'): void => {
        if (newStatus === 'granted') accept();
        else                         reject();
        setSaved(true);
        setTimeout(() => { setSaved(false); onClose(); }, 1200);
    };

    const formatDate = (iso: string): string =>
        new Date(iso).toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric',
        });

    return (
        <>
            {/* Backdrop — cierra al hacer clic fuera */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.50)',
                    backdropFilter: 'blur(3px)',
                    WebkitBackdropFilter: 'blur(3px)',
                    animation: 'fadeInUp 0.15s ease both',
                }}
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Preferencias de privacidad"
                style={{
                    position:   'fixed',
                    top:        '50%',
                    left:       '50%',
                    transform:  'translate(-50%, -50%)',
                    zIndex:     9999,
                    width:      'min(500px, calc(100vw - 32px))',
                    background: 'var(--bg-surface)',
                    borderTop:  '2px solid var(--accent-primary)',
                    border:     '1px solid var(--border-default)',
                    borderRadius:'14px',
                    boxShadow:  'var(--shadow-xl)',
                    padding:    '24px',
                    animation:  'fadeInUp 0.25s cubic-bezier(0.23, 1, 0.32, 1) both',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>🔒</span>
                        <div>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                                letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-primary)',
                            }}>
                                Preferencias de Privacidad
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-mono)', fontSize: '10px',
                                color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '2px',
                            }}>
                                Política v{COOKIE_POLICY_VERSION} · Modifica tu consentimiento en cualquier momento
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: '1px solid var(--border-subtle)',
                            borderRadius: '6px', color: 'var(--text-muted)',
                            cursor: 'pointer', padding: '4px 8px', fontSize: '14px',
                            transition: 'all 160ms ease', flexShrink: 0,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'; }}
                    >
                        ✕
                    </button>
                </div>

                {/* Estado actual */}
                {record && (
                    <div style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '12px' }}>📋</span>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                            Última decisión:{' '}
                            <strong style={{ color: status === 'granted' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                                {status === 'granted' ? 'Todo aceptado' : 'Solo necesarias'}
                            </strong>
                            {' '}· {formatDate(record.timestamp)}
                        </div>
                    </div>
                )}

                {/* Categorías con toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>

                    {/* Técnicas — siempre activas, no modificable */}
                    <div style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        borderRadius: '10px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.10em', textTransform: 'uppercase',
                                color: 'var(--text-primary)', marginBottom: '3px',
                            }}>
                                Cookies Técnicas
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                                Sesión · Tema · Preferencias de UI — siempre necesarias
                            </div>
                        </div>
                        {/* Toggle desactivado — siempre ON */}
                        <div style={{
                            width: '40px', height: '22px', borderRadius: '11px',
                            background: 'var(--accent-primary)',
                            display: 'flex', alignItems: 'center',
                            padding: '2px', flexShrink: 0,
                            cursor: 'not-allowed', opacity: 0.7,
                        }}>
                            <div style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: '#fff', marginLeft: 'auto',
                                transition: 'margin 200ms ease',
                            }} />
                        </div>
                    </div>

                    {/* Analíticas — modificable */}
                    <div style={{
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${analyticsOn ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                        borderRadius: '10px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                        transition: 'border-color 200ms ease',
                    }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.10em', textTransform: 'uppercase',
                                color: 'var(--text-primary)', marginBottom: '3px',
                            }}>
                                Cookies Analíticas
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                                Métricas de uso · Navegación · Rendimiento
                            </div>
                        </div>
                        {/* Toggle interactivo */}
                        <button
                            onClick={() => handleSave(analyticsOn ? 'denied' : 'granted')}
                            aria-label={analyticsOn ? 'Desactivar analíticas' : 'Activar analíticas'}
                            aria-checked={analyticsOn}
                            role="switch"
                            style={{
                                width: '40px', height: '22px', borderRadius: '11px',
                                background: analyticsOn ? 'var(--accent-primary)' : 'var(--bg-overlay)',
                                border: `1px solid ${analyticsOn ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                                display: 'flex', alignItems: 'center',
                                padding: '2px', flexShrink: 0,
                                cursor: 'pointer',
                                transition: 'background 200ms ease, border-color 200ms ease',
                            }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: '#fff',
                                marginLeft: analyticsOn ? 'auto' : '0',
                                transition: 'margin 200ms ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.30)',
                            }} />
                        </button>
                    </div>
                </div>

                {/* Feedback guardado */}
                {saved && (
                    <div style={{
                        background: 'var(--accent-primary-glow)', border: '1px solid var(--border-accent)',
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
                        fontFamily: 'var(--font-mono)', fontSize: '11px',
                        color: 'var(--accent-primary)', letterSpacing: '0.06em', textAlign: 'center',
                        animation: 'fadeInUp 0.2s ease both',
                    }}>
                        ✓ Preferencias guardadas
                    </div>
                )}

                {/* Botones */}
                {!saved && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSave(analyticsOn ? 'granted' : 'denied')}>
                            Guardar preferencias
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
