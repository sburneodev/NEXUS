/**
 * components/ai/Nl2SqlPanel.tsx — UI-04
 *
 * Panel de consulta NL2SQL.
 * El usuario escribe una pregunta en lenguaje natural y la IA
 * la convierte en SQL, la ejecuta y devuelve los resultados.
 *
 * Endpoint: POST /api/ai/nl2sql  { pregunta: string }
 * Respuesta: { sql: string, resultados: TableRow[], error?: string }
 *
 * Estados:
 *   idle    → formulario vacío esperando input
 *   loading → skeleton mientras la IA procesa
 *   success → tabla con resultados
 *   error   → mensaje de error sin romper el layout
 */

import { useState, FormEvent } from 'react';
import api from '../../services/api';
import { DynamicTable, type TableRow } from './DynamicTable';

// ── Tipos de la respuesta del backend ────────────────────────────────
interface Nl2SqlResponse {
    sql: string;
    resultados: TableRow[];
    mensaje?: string;
    error?: string;
}

type PanelState = 'idle' | 'loading' | 'success' | 'error';

// ── Skeleton loader ───────────────────────────────────────────────────
function SkeletonRow(): JSX.Element {
    return (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {[40, 25, 35].map((w, i) => (
                <div key={i} style={{
                    height: '14px',
                    width: `${w}%`,
                    borderRadius: '3px',
                    background: 'var(--bg-overlay)',
                    animation: 'skeletonPulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 120}ms`,
                }} />
            ))}
        </div>
    );
}

// ── Ejemplos de consultas ─────────────────────────────────────────────
const EXAMPLES = [
    '¿Cuáles son los 5 productos más vendidos este mes?',
    '¿Qué clientes tienen más de 500 puntos de fidelidad?',
    '¿Cuántas piezas retro quedan en La Bóveda?',
    '¿Qué productos están por debajo del stock mínimo?',
];

export function Nl2SqlPanel(): JSX.Element {
    const [pregunta, setPregunta] = useState('');
    const [state, setState] = useState<PanelState>('idle');
    const [result, setResult] = useState<Nl2SqlResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        if (!pregunta.trim()) return;

        setState('loading');
        setResult(null);
        setErrorMsg('');

        try {
            const { data } = await api.post<Nl2SqlResponse>('/ai/nl2sql', {
                pregunta: pregunta.trim(),
            });

            if (data.error) {
                setErrorMsg(data.error);
                setState('error');
            } else {
                setResult(data);
                setState('success');
            }
        } catch {
            setErrorMsg('No se pudo conectar con el asistente IA. Inténtalo de nuevo.');
            setState('error');
        }
    }

    return (
        <>
            <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>

            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                overflow: 'hidden',
            }}>

                {/* Cabecera */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '16px',
                        color: 'var(--accent-cyan)',
                        textShadow: '0 0 10px rgba(0,212,255,0.4)',
                    }}>◇</span>
                    <div>
                        <div style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '13px',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--text-primary)',
                        }}>
                            ASISTENTE IA — NL2SQL
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.04em',
                        }}>
                            Pregunta en lenguaje natural · Gemini + PostgreSQL
                        </div>
                    </div>
                </div>

                {/* Formulario */}
                <div style={{ padding: '20px' }}>
                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={pregunta}
                            onChange={e => setPregunta(e.target.value)}
                            placeholder="Ej: ¿Cuáles son los 5 productos más vendidos este mes?"
                            disabled={state === 'loading'}
                            rows={3}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '7px',
                                padding: '12px 14px',
                                outline: 'none',
                                resize: 'vertical',
                                caretColor: 'var(--accent-cyan)',
                                lineHeight: 1.6,
                                transition: 'border-color 160ms ease, box-shadow 160ms ease',
                                marginBottom: '12px',
                            }}
                            onFocus={e => {
                                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.10)';
                            }}
                            onBlur={e => {
                                e.currentTarget.style.borderColor = 'var(--border-default)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />

                        {/* Ejemplos rápidos */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginBottom: '14px',
                        }}>
                            {EXAMPLES.map(ex => (
                                <button
                                    key={ex}
                                    type="button"
                                    onClick={() => setPregunta(ex)}
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        color: 'var(--text-muted)',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '4px',
                                        padding: '3px 8px',
                                        cursor: 'pointer',
                                        transition: 'all 160ms ease',
                                        letterSpacing: '0.02em',
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
                                    {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
                                </button>
                            ))}
                        </div>

                        {/* Botón Analizar */}
                        <button
                            type="submit"
                            disabled={state === 'loading' || !pregunta.trim()}
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '13px',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                padding: '10px 24px',
                                background: state === 'loading' || !pregunta.trim()
                                    ? 'rgba(255,255,255,0.04)'
                                    : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-primary))',
                                color: state === 'loading' || !pregunta.trim()
                                    ? 'var(--text-muted)'
                                    : '#05050a',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: state === 'loading' || !pregunta.trim() ? 'not-allowed' : 'pointer',
                                transition: 'all 200ms ease',
                                boxShadow: state === 'loading' || !pregunta.trim()
                                    ? 'none'
                                    : '0 0 20px rgba(0,212,255,0.25)',
                            }}
                        >
                            {state === 'loading' ? '⏳ ANALIZANDO...' : '⚡ ANALIZAR'}
                        </button>
                    </form>
                </div>

                {/* ── Área de resultados ──────────────────────────────────────── */}

                {/* Skeleton loader */}
                {state === 'loading' && (
                    <div style={{ padding: '0 20px 20px' }}>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--accent-cyan)',
                            letterSpacing: '0.08em',
                            marginBottom: '12px',
                        }}>
                            GENERANDO SQL · EJECUTANDO CONSULTA...
                        </div>
                        {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                    </div>
                )}

                {/* Error */}
                {state === 'error' && (
                    <div style={{
                        margin: '0 20px 20px',
                        padding: '12px 14px',
                        background: 'rgba(255,68,102,0.08)',
                        border: '1px solid var(--accent-danger)',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--accent-danger)',
                        letterSpacing: '0.02em',
                    }}>
                        ⚠ {errorMsg}
                    </div>
                )}

                {/* Resultados */}
                {state === 'success' && result && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>

                        {/* SQL generado */}
                        <div style={{
                            padding: '12px 20px',
                            background: 'var(--bg-elevated)',
                        }}>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '10px',
                                fontWeight: 600,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '6px',
                            }}>
                                SQL GENERADO
                            </div>
                            <code style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                color: 'var(--accent-gold)',
                                display: 'block',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}>
                                {result.sql}
                            </code>
                        </div>

                        {/* Tabla de resultados */}
                        <div style={{ padding: '0 0 4px' }}>
                            <div style={{
                                padding: '10px 20px 6px',
                                fontFamily: 'var(--font-display)',
                                fontSize: '10px',
                                fontWeight: 600,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                            }}>
                                {result.resultados.length} RESULTADO{result.resultados.length !== 1 ? 'S' : ''}
                            </div>
                            <DynamicTable rows={result.resultados} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
