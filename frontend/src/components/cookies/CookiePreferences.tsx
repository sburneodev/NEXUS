/**
 * components/cookies/CookiePreferences.tsx
 *
 * Panel informativo de privacidad — compacto y discreto.
 * No es un formulario de consentimiento: NEXUS es una app interna
 * sin cookies de seguimiento ni analíticas de terceros.
 */

import { createPortal } from 'react-dom';

interface CookiePreferencesProps {
    onClose: () => void;
}

export function CookiePreferences({ onClose }: CookiePreferencesProps): JSX.Element {
    return createPortal(
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position:             'fixed',
                    inset:                0,
                    zIndex:               9998,
                    background:           'rgba(0,0,0,0.45)',
                    backdropFilter:       'blur(3px)',
                    WebkitBackdropFilter: 'blur(3px)',
                }}
            />

            {/* Panel */}
            <div style={{
                position:       'fixed',
                inset:          0,
                zIndex:         9999,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '16px',
                pointerEvents:  'none',
            }}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Privacidad y cookies"
                    onClick={e => e.stopPropagation()}
                    style={{
                        pointerEvents: 'auto',
                        width:         'min(400px, 100%)',
                        background:    'var(--bg-surface)',
                        borderTop:     '2px solid var(--accent-primary)',
                        border:        '1px solid var(--border-default)',
                        borderRadius:  '12px',
                        boxShadow:     'var(--shadow-xl)',
                        padding:       '20px',
                        animation:     'fadeInUp 0.22s cubic-bezier(0.23, 1, 0.32, 1) both',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>🔒</span>
                            <span style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '12px',
                                fontWeight:    700,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                color:         'var(--text-primary)',
                            }}>
                                Privacidad y Cookies
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Cerrar"
                            style={{
                                background: 'transparent', border: '1px solid var(--border-subtle)',
                                borderRadius: '5px', color: 'var(--text-muted)',
                                cursor: 'pointer', padding: '3px 8px', fontSize: '13px',
                                transition: 'all 160ms ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'; }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Texto breve */}
                    <p style={{
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '11px',
                        color:        'var(--text-secondary)',
                        lineHeight:   1.6,
                        margin:       '0 0 14px',
                    }}>
                        NEXUS es una aplicación interna. Solo usamos almacenamiento técnico imprescindible — sin rastreo, publicidad ni analíticas externas.
                    </p>

                    {/* Lista compacta */}
                    <div style={{
                        background:   'var(--bg-elevated)',
                        border:       '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        overflow:     'hidden',
                        marginBottom: '16px',
                    }}>
                        {([
                            { key: 'nexus_token',          where: 'localStorage', desc: 'Sesión JWT' },
                            { key: 'nexus_theme',          where: 'localStorage', desc: 'Tema UI' },
                            { key: 'nexus_avatar_*',       where: 'localStorage', desc: 'Foto de perfil' },
                            { key: 'nexus_cookie_consent', where: 'Cookie · SameSite=Strict · Secure', desc: 'Aviso visto' },
                        ] as const).map((item, i, arr) => (
                            <div
                                key={item.key}
                                style={{
                                    display:       'grid',
                                    gridTemplateColumns: '1fr auto',
                                    alignItems:    'center',
                                    gap:           '10px',
                                    padding:       '8px 12px',
                                    borderBottom:  i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                }}
                            >
                                <div>
                                    <code style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '10px',
                                        fontWeight: 700,
                                        color:      'var(--accent-primary)',
                                        display:    'block',
                                        marginBottom: '1px',
                                    }}>
                                        {item.key}
                                    </code>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '9px',
                                        color:      'var(--text-muted)',
                                    }}>
                                        {item.desc} · <span style={{ color: 'var(--accent-cyan)', opacity: 0.8 }}>{item.where}</span>
                                    </span>
                                </div>
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '8px',
                                    color:         'var(--accent-primary)',
                                    border:        '1px solid var(--border-accent)',
                                    borderRadius:  '3px',
                                    padding:       '1px 5px',
                                    background:    'var(--accent-primary-glow)',
                                    whiteSpace:    'nowrap',
                                    letterSpacing: '0.05em',
                                    flexShrink:    0,
                                }}>
                                    NECESARIA
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Botón */}
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={onClose}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
}
