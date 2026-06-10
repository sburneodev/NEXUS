import { useState } from 'react';
import type { FormEvent } from 'react';
import api from '../../services/api';
import { DynamicTable, type TableRow } from './DynamicTable';

interface Nl2SqlResponse {
    sql:         string;
    filas:       TableRow[];
    columnas:    string[];
    total_filas: number;
    descripcion?: string;
    error?:      string;
}

type PanelState = 'idle' | 'loading' | 'success' | 'error';

const EXAMPLES = [
    '¿Cuáles son los 5 productos más vendidos?',
    '¿Clientes con más de 500 puntos de fidelidad?',
    '¿Piezas retro disponibles en La Bóveda?',
    '¿Productos por debajo del stock mínimo?',
];

function SkeletonRow(): JSX.Element {
    return (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {[45, 30, 25].map((w, i) => (
                <div key={i} style={{
                    height:          '12px',
                    width:           `${w}%`,
                    borderRadius:    '3px',
                    background:      'var(--bg-overlay)',
                    animation:       'skeletonPulse 1.4s ease-in-out infinite',
                    animationDelay:  `${i * 110}ms`,
                }} />
            ))}
        </div>
    );
}

export function Nl2SqlPanel(): JSX.Element {
    const [pregunta,   setPregunta]   = useState('');
    const [lastQuery,  setLastQuery]  = useState('');
    const [state,      setState]      = useState<PanelState>('idle');
    const [result,     setResult]     = useState<Nl2SqlResponse | null>(null);
    const [errorMsg,   setErrorMsg]   = useState('');

    async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const q = pregunta.trim();
        if (!q) return;

        setLastQuery(q);
        setState('loading');
        setResult(null);
        setErrorMsg('');

        try {
            const { data } = await api.post<Nl2SqlResponse>('/ai/nl2sql', { pregunta: q });
            if (data.error) { setErrorMsg(data.error); setState('error'); }
            else            { setResult(data);           setState('success'); }
        } catch {
            setErrorMsg('No se pudo conectar con el asistente. Inténtalo de nuevo.');
            setState('error');
        }
    }

    const canSubmit = state !== 'loading' && pregunta.trim().length > 0;

    return (
        <>
            <style>{`
                @keyframes skeletonPulse {
                    0%, 100% { opacity: 0.3; }
                    50%      { opacity: 0.7; }
                }
            `}</style>

            {/* ── Formulario ────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                <textarea
                    value={pregunta}
                    onChange={e => setPregunta(e.target.value)}
                    placeholder="¿Qué datos necesitas consultar?"
                    disabled={state === 'loading'}
                    rows={3}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            if (canSubmit) e.currentTarget.form?.requestSubmit();
                        }
                    }}
                    style={{
                        width:        '100%',
                        boxSizing:    'border-box',
                        fontFamily:   'var(--font-body)',
                        fontSize:     '14px',
                        lineHeight:   1.6,
                        color:        'var(--text-primary)',
                        background:   'var(--bg-elevated)',
                        border:       '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)',
                        padding:      '14px 16px',
                        outline:      'none',
                        resize:       'vertical',
                        caretColor:   'var(--accent-primary)',
                        transition:   'border-color 160ms, box-shadow 160ms',
                    }}
                    onFocus={e => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.boxShadow  = '0 0 0 3px var(--accent-primary-glow)';
                    }}
                    onBlur={e => {
                        e.currentTarget.style.borderColor = 'var(--border-default)';
                        e.currentTarget.style.boxShadow  = 'none';
                    }}
                />

                {/* Ejemplos rápidos */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {EXAMPLES.map(ex => (
                        <button
                            key={ex}
                            type="button"
                            onClick={() => setPregunta(ex)}
                            style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '10px',
                                color:         'var(--text-muted)',
                                background:    'var(--bg-elevated)',
                                border:        '1px solid var(--border-subtle)',
                                borderRadius:  'var(--radius-full)',
                                padding:       '4px 10px',
                                cursor:        'pointer',
                                transition:    'all 160ms',
                                letterSpacing: '0.02em',
                                lineHeight:    1.4,
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                                (e.currentTarget as HTMLButtonElement).style.color       = 'var(--text-secondary)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                                (e.currentTarget as HTMLButtonElement).style.color       = 'var(--text-muted)';
                            }}
                        >
                            {ex.length > 38 ? ex.slice(0, 38) + '…' : ex}
                        </button>
                    ))}
                </div>

                {/* Botón analizar — estilo corporativo primario */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        color:         'var(--text-muted)',
                        letterSpacing: '0.04em',
                    }}>
                        {state === 'loading' ? 'Procesando consulta...' : 'Ctrl+Enter para enviar'}
                    </span>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="btn btn-primary"
                        style={{ flexShrink: 0, opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
                    >
                        {state === 'loading' ? 'ANALIZANDO' : 'ANALIZAR'}
                    </button>
                </div>
            </form>

            {/* ── Área de respuesta (estilo chat) ──────────────────────── */}
            {(state === 'loading' || state === 'success' || state === 'error') && (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* Separador */}
                    <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

                    {/* Burbuja de usuario (derecha) */}
                    {lastQuery && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{
                                maxWidth:     '85%',
                                background:   'rgba(59,130,246,0.08)',
                                border:       '1px solid rgba(59,130,246,0.20)',
                                borderRadius: '16px 16px 4px 16px',
                                padding:      '11px 15px',
                                fontFamily:   'var(--font-body)',
                                fontSize:     '13px',
                                color:        'var(--text-primary)',
                                lineHeight:   1.55,
                            }}>
                                {lastQuery}
                            </div>
                        </div>
                    )}

                    {/* Burbuja de IA (izquierda) — skeleton / success / error */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            width:        '100%',
                            background:   'var(--bg-elevated)',
                            border:       '1px solid var(--border-subtle)',
                            borderRadius: '4px 16px 16px 16px',
                            padding:      '16px',
                            boxShadow:    '0 2px 16px rgba(0,0,0,0.35)',
                        }}>

                            {/* ── Skeleton ── */}
                            {state === 'loading' && (
                                <div>
                                    <div style={{
                                        fontFamily:    'var(--font-mono)',
                                        fontSize:      '10px',
                                        color:         'var(--accent-primary)',
                                        letterSpacing: '0.08em',
                                        marginBottom:  '12px',
                                        display:       'flex',
                                        alignItems:    'center',
                                        gap:           '6px',
                                    }}>
                                        <span style={{
                                            display:    'inline-block',
                                            width:      '6px',
                                            height:     '6px',
                                            borderRadius: '50%',
                                            background: 'var(--accent-primary)',
                                            animation:  'pulse-blue 1s infinite',
                                        }} />
                                        GENERANDO CONSULTA
                                    </div>
                                    {[1,2,3,4].map(i => <SkeletonRow key={i} />)}
                                </div>
                            )}

                            {/* ── Error ── */}
                            {state === 'error' && (
                                <div style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '12px',
                                    color:         'var(--accent-danger)',
                                    letterSpacing: '0.02em',
                                    lineHeight:    1.5,
                                    display:       'flex',
                                    gap:           '8px',
                                }}>
                                    <span style={{ flexShrink: 0 }}>▲</span>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* ── Resultado ── */}
                            {state === 'success' && result && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                    {/* SQL generado */}
                                    <div>
                                        <div style={{
                                            fontFamily:    'var(--font-display)',
                                            fontSize:      '9px',
                                            fontWeight:    600,
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color:         'var(--text-muted)',
                                            marginBottom:  '6px',
                                        }}>
                                            SQL generado
                                        </div>
                                        <code style={{
                                            display:      'block',
                                            fontFamily:   'var(--font-mono)',
                                            fontSize:     '11px',
                                            color:        'var(--accent-gold)',
                                            background:   'var(--bg-overlay)',
                                            border:       '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-base)',
                                            padding:      '10px 12px',
                                            whiteSpace:   'pre-wrap',
                                            wordBreak:    'break-word',
                                            lineHeight:   1.6,
                                        }}>
                                            {result.sql}
                                        </code>
                                    </div>

                                    {/* Tabla de resultados */}
                                    {(result.filas ?? []).length > 0 && (
                                        <div>
                                            <div style={{
                                                fontFamily:    'var(--font-display)',
                                                fontSize:      '9px',
                                                fontWeight:    600,
                                                letterSpacing: '0.16em',
                                                textTransform: 'uppercase',
                                                color:         'var(--text-muted)',
                                                marginBottom:  '8px',
                                            }}>
                                                {result.filas.length} resultado{result.filas.length !== 1 ? 's' : ''}
                                            </div>
                                            <DynamicTable rows={result.filas} />
                                        </div>
                                    )}

                                    {(result.filas ?? []).length === 0 && (
                                        <div style={{
                                            fontFamily:    'var(--font-mono)',
                                            fontSize:      '11px',
                                            color:         'var(--text-muted)',
                                            letterSpacing: '0.04em',
                                        }}>
                                            La consulta no devolvió resultados.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
