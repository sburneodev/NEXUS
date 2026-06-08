/**
 * components/cookies/CookieBanner.tsx  v2
 *
 * Banner de consentimiento RGPD / LSSI:
 *   - No escapable: el backdrop NO cierra el banner (pointerEvents bloqueados)
 *   - Persiste 12 meses en cookie JSON con timestamp + versión de política
 *   - Una vez decidido, nunca vuelve a aparecer hasta que expire
 *   - Usa useCookieConsent hook para sincronizar con CookiePreferences
 *   - Design system NEXUS nativo (CSS vars, clases .btn globales)
 */

import { useState, useEffect } from 'react';
import { useCookieConsent }    from '../../hooks/useCookieConsent';
import { CookiePreferences }   from './CookiePreferences';

export function CookieBanner(): JSX.Element | null {
    const { status, accept, reject } = useCookieConsent();
    const [visible,    setVisible]    = useState(false);
    const [exiting,    setExiting]    = useState(false);
    const [showPrefs,  setShowPrefs]  = useState(false);

    useEffect(() => {
        // Solo muestra si no hay decisión previa
        if (status === null) {
            const t = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(t);
        }
    }, [status]);

    // Si el usuario ya decidió (p.ej. desde CookiePreferences), ocultamos el banner
    useEffect(() => {
        if (status !== null && visible) {
            setExiting(true);
            setTimeout(() => setVisible(false), 320);
        }
    }, [status, visible]);

    const dismiss = (fn: () => void): void => {
        fn();
        setExiting(true);
        setTimeout(() => setVisible(false), 320);
    };

    if (!visible) return null;

    return (
        <>
            {/* ── Backdrop — NO cierra el banner al hacer clic ── */}
            <div
                aria-hidden="true"
                style={{
                    position:      'fixed',
                    inset:         0,
                    zIndex:        9998,
                    background:    'rgba(0,0,0,0.40)',
                    backdropFilter:'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                    opacity:       exiting ? 0 : 1,
                    transition:    'opacity 320ms ease',
                    // ⚠️ pointerEvents: none → el backdrop no intercepta clicks
                    // El usuario DEBE elegir una opción, no puede cerrar haciendo clic fuera
                    pointerEvents: 'none',
                }}
            />

            {/* ── Banner principal ── */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Gestión de cookies — decisión requerida"
                style={{
                    position:  'fixed',
                    bottom:    '24px',
                    left:      '50%',
                    transform: `translateX(-50%) translateY(${exiting ? '130%' : '0'})`,
                    opacity:   exiting ? 0 : 1,
                    transition:'transform 320ms cubic-bezier(0.32, 0.72, 0, 1), opacity 320ms ease',
                    zIndex:    9999,
                    width:     'min(600px, calc(100vw - 32px))',
                    background:   'var(--bg-surface)',
                    borderTop:    '2px solid var(--accent-primary)',
                    borderLeft:   '1px solid var(--border-default)',
                    borderRight:  '1px solid var(--border-default)',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    boxShadow:    'var(--shadow-xl)',
                    padding:      '22px 24px 20px',
                    animation:    exiting ? 'none' : 'fadeInUp 0.38s cubic-bezier(0.23, 1, 0.32, 1) both',
                }}
            >
                {/* Cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'var(--accent-primary-glow)',
                        border: '1px solid var(--border-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', flexShrink: 0,
                    }}>
                        🍪
                    </div>
                    <div>
                        <div style={{
                            fontFamily: 'var(--font-display)', fontSize: '13px',
                            fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                            color: 'var(--text-primary)', lineHeight: 1,
                        }}>
                            Política de Cookies
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: '10px',
                            color: 'var(--text-muted)', letterSpacing: '0.05em', marginTop: '3px',
                        }}>
                            NEXUS ERP · Cumplimiento RGPD / LSSI-CE
                        </div>
                    </div>
                    <span style={{
                        marginLeft: 'auto', flexShrink: 0,
                        fontFamily: 'var(--font-mono)', fontSize: '9px',
                        color: 'var(--accent-primary)', border: '1px solid var(--border-accent)',
                        borderRadius: '3px', padding: '2px 7px', letterSpacing: '0.08em',
                        background: 'var(--accent-primary-glow)',
                    }}>
                        DECISIÓN REQUERIDA
                    </span>
                </div>

                {/* Texto */}
                <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.65,
                    color: 'var(--text-secondary)', margin: '0 0 16px',
                }}>
                    Usamos <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>cookies técnicas</strong> imprescindibles para el funcionamiento de la plataforma (sesión, preferencias de UI) y, con tu consentimiento,{' '}
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>cookies analíticas</strong> para mejorar el servicio.
                    Rechazar las no esenciales no afecta al acceso ni a ninguna funcionalidad.
                </p>

                {/* Categorías */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                    {([
                        {
                            label: 'Técnicas',
                            items: ['Sesión de usuario', 'Preferencia de tema', 'Configuración de UI'],
                            badge: 'SIEMPRE ACTIVAS',
                            accent: 'var(--accent-primary)',
                            accentGlow: 'var(--accent-primary-glow)',
                            accentBorder: 'var(--border-accent)',
                        },
                        {
                            label: 'Analíticas',
                            items: ['Métricas de uso', 'Navegación en la app', 'Rendimiento'],
                            badge: 'REQUIEREN CONSENTIMIENTO',
                            accent: 'var(--text-muted)',
                            accentGlow: 'transparent',
                            accentBorder: 'var(--border-subtle)',
                        },
                    ] as const).map(cat => (
                        <div key={cat.label} style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px', padding: '12px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <span style={{
                                    fontFamily: 'var(--font-display)', fontSize: '11px',
                                    fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                                    color: 'var(--text-primary)',
                                }}>
                                    {cat.label}
                                </span>
                                <span style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '8px',
                                    color: cat.accent,
                                    border: `1px solid ${cat.accentBorder}`,
                                    borderRadius: '3px', padding: '1px 5px', letterSpacing: '0.05em',
                                    background: cat.accentGlow,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {cat.badge}
                                </span>
                            </div>
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {cat.items.map(item => (
                                    <li key={item} style={{
                                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                                        color: 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                    }}>
                                        <span style={{ color: 'var(--border-default)', fontSize: '8px' }}>▸</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Botones — igual jerarquía visual */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => dismiss(accept)}>
                        ✓ Aceptar todo
                    </button>
                    <button className="btn btn-ghost"   style={{ flex: 1 }} onClick={() => dismiss(reject)}>
                        Solo necesarias
                    </button>
                </div>

                {/* Nota legal con enlace funcional */}
                <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', lineHeight: 1.5,
                    color: 'var(--text-muted)', margin: '12px 0 0', textAlign: 'center',
                }}>
                    Tu decisión se almacena durante 12 meses ·{' '}
                    <button
                        onClick={() => setShowPrefs(true)}
                        style={{
                            background: 'none', border: 'none', padding: 0,
                            fontFamily: 'var(--font-mono)', fontSize: '10px',
                            color: 'var(--accent-primary)', cursor: 'pointer',
                            textDecoration: 'underline', textUnderlineOffset: '2px',
                        }}
                    >
                        Gestionar preferencias
                    </button>
                </p>
            </div>

            {/* Modal de preferencias — abierto desde el banner */}
            {showPrefs && (
                <CookiePreferences onClose={() => setShowPrefs(false)} />
            )}
        </>
    );
}
