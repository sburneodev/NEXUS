/**
 * components/ai/AsistenteRecompraPanel.tsx — UI-07
 *
 * Panel de asistente IA para análisis de recompra de piezas retro.
 * Estética terminal de comandos: fondo void, texto cyan, fuente mono.
 * Skeleton loaders con efecto glitch/pulse mientras la IA procesa.
 * Formulario tipado de confirmación cuando la IA responde.
 *
 * Endpoint: POST /api/ai/recompra  { descripcion: string }
 */

import { useState, FormEvent } from 'react';
import api from '../../services/api';

// ── Interfaces tipadas ────────────────────────────────────────────────

interface RecompraFormData {
    nombreProducto: string;
    plataforma: string;
    estadoConservacion: string;
    precioOfrecido: string;
    precioRecomendado: string;
    decision: 'ACEPTAR' | 'NEGOCIAR' | 'RECHAZAR';
    notas: string;
}

interface RecompraIAResponse {
    recomendacion: string;
    precioSugerido: number;
    decision: 'ACEPTAR' | 'NEGOCIAR' | 'RECHAZAR';
    razonamiento: string;
    factoresValor: string[];
    riesgos: string[];
}

type PanelState = 'idle' | 'loading' | 'ready' | 'confirmed' | 'error';

// ── Skeleton loader con efecto pulso ─────────────────────────────────
function SkeletonBlock({ width = '100%', height = '14px' }: { width?: string; height?: string }): JSX.Element {
    return (
        <div style={{
            width,
            height,
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            animation: 'skeletonGlitch 1.6s ease-in-out infinite',
        }} />
    );
}

// ── Badge de decisión IA ──────────────────────────────────────────────
function DecisionBadge({ decision }: { decision: 'ACEPTAR' | 'NEGOCIAR' | 'RECHAZAR' }): JSX.Element {
    const map = {
        ACEPTAR: { cls: 'badge badge-green', icon: '✓' },
        NEGOCIAR: { cls: 'badge badge-gold', icon: '↕' },
        RECHAZAR: { cls: 'badge badge-danger', icon: '✗' },
    };
    const { cls, icon } = map[decision];
    return <span className={cls} style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>{icon} {decision}</span>;
}

// ── Ejemplos de consulta ──────────────────────────────────────────────
const EJEMPLOS = [
    'Me ofrecen un cartucho de Super Metroid SNES en buen estado por 45€',
    'Tengo una Game Boy original con Tetris y funda por 30€',
    'Mega Drive con 5 juegos y cables completos, piden 80€',
    'PlayStation 1 slim con 10 juegos, algunos sin caja, por 60€',
];

// ── Componente principal ──────────────────────────────────────────────
export function AsistenteRecompraPanel(): JSX.Element {
    const [descripcion, setDescripcion] = useState('');
    const [state, setState] = useState<PanelState>('idle');
    const [iaResult, setIaResult] = useState<RecompraIAResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [form, setForm] = useState<RecompraFormData | null>(null);
    const [log, setLog] = useState<string[]>([]);

    function addLog(msg: string): void {
        setLog(prev => [...prev, `> ${msg}`]);
    }

    async function handleAnalizar(e: FormEvent): Promise<void> {
        e.preventDefault();
        if (!descripcion.trim()) return;

        setState('loading');
        setIaResult(null);
        setForm(null);
        setErrorMsg('');
        setLog([]);

        addLog('INICIALIZANDO NEXUS AI ENGINE...');
        addLog('CONECTANDO CON GEMINI FLASH 2.0...');
        addLog('CONSULTANDO BASE DE DATOS DE PRECIOS RETRO...');

        try {
            const { data } = await api.post<RecompraIAResponse>('/ai/recompra', {
                descripcion: descripcion.trim(),
            });

            addLog('ANÁLISIS COMPLETADO. PROCESANDO RESPUESTA...');

            setIaResult(data);
            setForm({
                nombreProducto: descripcion.trim(),
                plataforma: '',
                estadoConservacion: '',
                precioOfrecido: '',
                precioRecomendado: String(data.precioSugerido ?? ''),
                decision: data.decision ?? 'NEGOCIAR',
                notas: data.razonamiento ?? '',
            });
            setState('ready');

        } catch {
            addLog('ERROR: CONEXIÓN CON IA FALLIDA.');
            setErrorMsg('No se pudo conectar con el asistente IA. Verifica que el backend esté corriendo.');
            setState('error');
        }
    }

    function handleConfirm(e: FormEvent): void {
        e.preventDefault();
        addLog('RECOMPRA REGISTRADA EN EL SISTEMA.');
        setState('confirmed');
    }

    return (
        <>
            <style>{`
                @keyframes skeletonGlitch {
                    0%, 100% { opacity: 0.3; }
                    45%      { opacity: 0.7; }
                    50%      { opacity: 0.2; }
                    55%      { opacity: 0.8; }
                }
                @keyframes terminalBlink {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0; }
                }
                @keyframes scanIn {
                    from { opacity: 0; transform: translateX(-8px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>

            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
            }}>

                {/* ── Cabecera terminal ───────────────────────────── */}
                <div style={{
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-default)',
                    padding: 'var(--space-4) var(--space-5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                }}>
                    {/* Botones macOS fake */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['var(--accent-danger)', 'var(--accent-gold)', 'var(--accent-primary)'].map((c, i) => (
                            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                        ))}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.06em', flex: 1, textAlign: 'center' }}>
                        nexus-ai — asistente-recompra
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-gold)', letterSpacing: '0.06em' }}>
                        ◆ RETRO AI
                    </span>
                </div>

                {/* ── Log de terminal ─────────────────────────────── */}
                {log.length > 0 && (
                    <div style={{
                        background: 'var(--bg-void)',
                        padding: 'var(--space-4) var(--space-5)',
                        borderBottom: '1px solid var(--border-subtle)',
                        maxHeight: '100px',
                        overflowY: 'auto',
                    }}>
                        {log.map((line, i) => (
                            <div key={i} style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--accent-cyan)',
                                letterSpacing: '0.04em',
                                lineHeight: 1.8,
                                animation: 'scanIn 0.2s ease both',
                                animationDelay: `${i * 60}ms`,
                            }}>
                                {line}
                                {i === log.length - 1 && state === 'loading' && (
                                    <span style={{ animation: 'terminalBlink 0.8s step-end infinite', marginLeft: '4px' }}>█</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Formulario de entrada ───────────────────────── */}
                <div style={{ padding: 'var(--space-5)' }}>
                    <form onSubmit={handleAnalizar}>
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <label style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                display: 'block',
                                marginBottom: 'var(--space-2)',
                            }}>
                                DESCRIPCIÓN DE LA PIEZA
                            </label>
                            <textarea
                                rows={3}
                                value={descripcion}
                                onChange={e => setDescripcion(e.target.value)}
                                placeholder="Describe la pieza que te ofrecen para recompra..."
                                disabled={state === 'loading'}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--accent-cyan)',
                                    background: 'var(--bg-void)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 'var(--radius-base)',
                                    padding: 'var(--space-3) var(--space-4)',
                                    outline: 'none',
                                    resize: 'vertical',
                                    caretColor: 'var(--accent-gold)',
                                    lineHeight: 1.7,
                                    transition: 'border-color 160ms ease',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                            />
                        </div>

                        {/* Ejemplos */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                            {EJEMPLOS.map(ej => (
                                <button
                                    key={ej}
                                    type="button"
                                    onClick={() => setDescripcion(ej)}
                                    className="btn btn-ghost"
                                    style={{ fontSize: 'var(--text-xs)', padding: '2px var(--space-3)', letterSpacing: '0.02em' }}
                                >
                                    {ej.slice(0, 38)}…
                                </button>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={state === 'loading' || !descripcion.trim()}
                            className="btn"
                            style={{
                                background: state === 'loading' || !descripcion.trim() ? 'transparent' : 'var(--accent-gold)',
                                color: state === 'loading' || !descripcion.trim() ? 'var(--text-muted)' : 'var(--text-inverse)',
                                borderColor: 'var(--accent-gold)',
                                borderRadius: 'var(--radius-base)',
                                cursor: state === 'loading' || !descripcion.trim() ? 'not-allowed' : 'pointer',
                                opacity: state === 'loading' || !descripcion.trim() ? 0.5 : 1,
                                letterSpacing: '0.14em',
                            }}
                        >
                            {state === 'loading' ? '⏳ ANALIZANDO...' : '◇ EJECUTAR TASACIÓN'}
                        </button>
                    </form>
                </div>

                {/* ── Skeleton loader ─────────────────────────────── */}
                {state === 'loading' && (
                    <div style={{ padding: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-gold)', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>
                            PROCESANDO ANÁLISIS DE MERCADO RETRO...
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            <SkeletonBlock width="60%" />
                            <SkeletonBlock width="85%" />
                            <SkeletonBlock width="40%" />
                            <div style={{ height: 'var(--space-2)' }} />
                            <SkeletonBlock width="70%" height="12px" />
                            <SkeletonBlock width="55%" height="12px" />
                            <SkeletonBlock width="80%" height="12px" />
                        </div>
                    </div>
                )}

                {/* ── Error ───────────────────────────────────────── */}
                {state === 'error' && (
                    <div style={{
                        margin: 'var(--space-5)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--accent-danger-glow)',
                        border: '1px solid var(--accent-danger)',
                        borderRadius: 'var(--radius-base)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--accent-danger)',
                    }}>
                        ⚠ {errorMsg}
                    </div>
                )}

                {/* ── Resultado IA ────────────────────────────────── */}
                {(state === 'ready' || state === 'confirmed') && iaResult && (
                    <div style={{ borderTop: '1px solid var(--border-default)' }}>

                        {/* Análisis IA */}
                        <div style={{
                            padding: 'var(--space-5)',
                            background: 'var(--bg-elevated)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                    ANÁLISIS IA
                                </span>
                                <DecisionBadge decision={iaResult.decision} />
                            </div>

                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 'var(--space-3)', textShadow: '0 0 16px var(--accent-gold-glow)' }}>
                                €{iaResult.precioSugerido?.toFixed(2) ?? '—'}
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)', fontWeight: 400 }}>PRECIO SUGERIDO</span>
                            </div>

                            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                                {iaResult.razonamiento}
                            </p>

                            {iaResult.factoresValor?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                    {iaResult.factoresValor.map((f, i) => (
                                        <span key={i} className="badge badge-cyan">{f}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Formulario de confirmación */}
                        {state === 'ready' && form && (
                            <form onSubmit={handleConfirm} style={{ padding: 'var(--space-5)' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                                    CONFIRMAR RECOMPRA
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                                    {[
                                        { label: 'Precio ofrecido (€)', key: 'precioOfrecido' as const, type: 'number', placeholder: '0.00' },
                                        { label: 'Precio acordado (€)', key: 'precioRecomendado' as const, type: 'number', placeholder: String(iaResult.precioSugerido) },
                                    ].map(({ label, key, type, placeholder }) => (
                                        <div key={key}>
                                            <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                                                {label}
                                            </label>
                                            <input
                                                type={type}
                                                placeholder={placeholder}
                                                value={form[key]}
                                                onChange={e => setForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                                                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-base)', padding: 'var(--space-2) var(--space-3)', outline: 'none', caretColor: 'var(--accent-cyan)' }}
                                            />
                                        </div>
                                    ))}

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                                            Notas
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={form.notas}
                                            onChange={e => setForm(prev => prev ? { ...prev, notas: e.target.value } : prev)}
                                            style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-base)', padding: 'var(--space-2) var(--space-3)', outline: 'none', resize: 'vertical', caretColor: 'var(--accent-cyan)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => { setState('idle'); setLog([]); }}>
                                        CANCELAR
                                    </button>
                                    <button type="submit" className="btn" style={{ background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', color: 'var(--text-inverse)', letterSpacing: '0.12em' }}>
                                        ✓ CONFIRMAR RECOMPRA
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Confirmación */}
                        {state === 'confirmed' && (
                            <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', color: 'var(--accent-primary)', marginBottom: 'var(--space-3)' }}>✓</div>
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                                    RECOMPRA REGISTRADA
                                </p>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                    La pieza ha sido añadida al sistema.
                                </p>
                                <button className="btn btn-ghost" style={{ marginTop: 'var(--space-4)' }} onClick={() => { setState('idle'); setDescripcion(''); setLog([]); }}>
                                    NUEVA TASACIÓN
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
