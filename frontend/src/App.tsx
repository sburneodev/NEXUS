import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/* ──────────────────────────────────────────────────────────────────
   Splash screen — se ve mientras se carga la app.
   Efecto terminal: el texto aparece carácter a carácter.
   En FE-03 se sustituye por el layout real con Sidebar + Navbar.
────────────────────────────────────────────────────────────────── */

const BOOT_LINES: string[] = [
    '> NEXUS ERP v1.1.0 — INITIALIZING...',
    '> CONNECTING TO POSTGRESQL://NEXUS_DB:5432',
    '> LOADING SECURITY MODULES [JWT / RBAC]',
    '> MOUNTING INVENTORY ENGINE',
    '> AI SUBSYSTEMS ONLINE [GEMINI + GROQ]',
    '> ALL SYSTEMS NOMINAL',
    '> WELCOME TO LEVELUP NEXUS',
];

function BootLine({ text, delay }: { text: string; delay: number }): JSX.Element {
    const [visible, setVisible] = useState(false);
    const [chars, setChars] = useState('');

    useEffect(() => {
        const showTimer = setTimeout(() => {
            setVisible(true);
            let i = 0;
            const typeTimer = setInterval(() => {
                setChars(text.slice(0, i + 1));
                i++;
                if (i >= text.length) clearInterval(typeTimer);
            }, 22);
            return () => clearInterval(typeTimer);
        }, delay);
        return () => clearTimeout(showTimer);
    }, [text, delay]);

    if (!visible) return <div style={{ height: '1.5em' }} />;

    const isLast = text.includes('WELCOME');
    return (
        <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.8,
            color: isLast ? 'var(--accent-primary)' : 'var(--text-secondary)',
            letterSpacing: '0.04em',
            textShadow: isLast ? '0 0 12px rgba(0,255,136,0.6)' : 'none',
        }}>
            {chars}
            <span style={{
                display: 'inline-block',
                width: '8px',
                height: '1em',
                background: 'var(--accent-primary)',
                marginLeft: '2px',
                verticalAlign: 'text-bottom',
                animation: 'flicker 1s step-end infinite',
                opacity: chars.length === text.length ? 0 : 1,
            }} />
        </div>
    );
}

function SplashScreen(): JSX.Element {
    const [ready, setReady] = useState(false);
    const totalDuration = BOOT_LINES.length * 320 + 800;

    useEffect(() => {
        const t = setTimeout(() => setReady(true), totalDuration);
        return () => clearTimeout(t);
    }, [totalDuration]);

    return (
        <div style={{
            minHeight: '100dvh',
            background: 'var(--bg-void)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-8)',
            position: 'relative',
            overflow: 'hidden',
        }}>

            {/* Grid de fondo */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
        linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
        `,
                backgroundSize: '48px 48px',
                pointerEvents: 'none',
            }} />

            {/* Resplandor central */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(ellipse, rgba(0,255,136,0.05) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Logo */}
            <div style={{
                textAlign: 'center',
                marginBottom: 'var(--space-12)',
                animation: 'fadeInUp 0.6s var(--ease-smooth) both',
            }}>
                {/* Línea decorativa superior */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-4)',
                    justifyContent: 'center',
                }}>
                    <div style={{ height: '1px', width: '80px', background: 'linear-gradient(90deg, transparent, var(--accent-primary))' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', letterSpacing: '0.2em' }}>
                        LEVELUP ARCADE
                    </span>
                    <div style={{ height: '1px', width: '80px', background: 'linear-gradient(90deg, var(--accent-primary), transparent)' }} />
                </div>

                {/* Logotipo principal */}
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    marginBottom: 'var(--space-2)',
                }}>
                    <span style={{
                        background: 'linear-gradient(135deg, #e8e8f0 0%, #8888aa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        NEX
                    </span>
                    <span style={{
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.5))',
                    }}>
                        US
                    </span>
                </h1>

                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                }}>
                    Enterprise Resource Planning
                </div>
            </div>

            {/* Terminal de boot */}
            <div style={{
                width: '100%',
                maxWidth: '560px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                animation: 'fadeInUp 0.6s 0.2s var(--ease-smooth) both',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}>

                {/* Barra de título del terminal */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        marginLeft: 'auto',
                        letterSpacing: '0.06em',
                    }}>
                        nexus-boot — bash
                    </span>
                </div>

                {/* Líneas de boot */}
                <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
                    {BOOT_LINES.map((line, i) => (
                        <BootLine key={i} text={line} delay={i * 320} />
                    ))}
                </div>
            </div>

            {/* CTA — aparece cuando el boot termina */}
            {ready && (
                <div style={{
                    marginTop: 'var(--space-8)',
                    animation: 'fadeInUp 0.5s var(--ease-smooth) both',
                    textAlign: 'center',
                }}>
                    <button
                        className="btn btn-primary"
                        style={{ fontSize: 'var(--text-base)', padding: '14px 48px' }}
                        onClick={() => alert('FE-03 → aquí irá el login')}
                    >
                        ⚡ ACCEDER AL SISTEMA
                    </button>
                    <div style={{
                        marginTop: 'var(--space-3)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.06em',
                    }}>
                        FE-01 ✓ &nbsp;|&nbsp; FE-02 ✓ &nbsp;|&nbsp; FE-03 PENDING
                    </div>
                </div>
            )}

            {/* Versión */}
            <div style={{
                position: 'absolute',
                bottom: 'var(--space-6)',
                right: 'var(--space-6)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
            }}>
                v1.1.0 · {new Date().getFullYear()}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────
   App — Router principal
   FE-03 añadirá las rutas reales (Dashboard, Clientes, etc.)
────────────────────────────────────────────────────────────────── */
function App(): JSX.Element {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SplashScreen />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
