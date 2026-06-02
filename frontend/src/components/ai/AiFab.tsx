/**
 * AiFab — Widget flotante NEXUS AI
 *
 * AVT-07 · Conecta IAAvatar con el fetch al backend:
 *           procesando() antes del await → hablando() al recibir respuesta → idle() al terminar
 * AVT-08 · Panel completo: historial, Copiar por mensaje, Limpiar, bottom-sheet en móvil
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAiPanel }  from '../../context/AiPanelContext';
import { IAAvatar }    from './IAAvatar';
import type { IAvatarHandle } from './IAAvatar';
import api             from '../../services/api';
import { DynamicTable } from './DynamicTable';
import type { TableRow } from './DynamicTable';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Nl2SqlResponse {
    sql:        string;
    resultados: TableRow[];
    error?:     string;
}

interface Message {
    id:       number;
    role:     'user' | 'ai';
    text:     string;
    sql?:     string;
    results?: TableRow[];
    isError?: boolean;
    loading?: boolean;
}

type HeaderStatus = 'online' | 'thinking' | 'responding' | 'error';

const STATUS_META: Record<HeaderStatus, { color: string; label: string }> = {
    online:     { color: 'var(--accent-primary)',          label: 'En línea'      },
    thinking:   { color: 'var(--accent-warning, #ff8800)', label: 'Pensando…'     },
    responding: { color: 'var(--accent-success, #00ff88)', label: 'Respondiendo…' },
    error:      { color: 'var(--accent-danger,  #ff3355)', label: 'Error'         },
};

// ── Datos estáticos ────────────────────────────────────────────────────────────

const WELCOME: Message = {
    id:   0,
    role: 'ai',
    text: 'Hola. Soy NEXUS AI. Pregúntame sobre ventas, clientes, stock o cualquier dato del sistema.',
};

const EXAMPLES = [
    '¿Cuáles son los 5 productos más vendidos?',
    '¿Clientes con más de 500 puntos?',
    '¿Qué piezas retro quedan disponibles?',
    '¿Productos por debajo del stock mínimo?',
];

// ── Burbuja de mensaje ─────────────────────────────────────────────────────────

interface BubbleProps {
    msg:      Message;
    copiedId: number | null;
    onCopy:   (msg: Message) => void;
}

function Bubble({ msg, copiedId, onCopy }: BubbleProps): JSX.Element {
    const isUser  = msg.role === 'user';
    const [hov, setHov] = useState(false);

    if (isUser) {
        return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <div style={{
                    maxWidth:     '78%',
                    background:   'rgba(0,255,136,0.08)',
                    border:       '1px solid rgba(0,255,136,0.2)',
                    borderRadius: '16px 16px 3px 16px',
                    padding:      '10px 14px',
                    fontFamily:   'var(--font-body)',
                    fontSize:     '13px',
                    color:        'var(--text-primary)',
                    lineHeight:   1.5,
                    wordBreak:    'break-word',
                }}>
                    {msg.text}
                </div>
            </div>
        );
    }

    // ── Burbuja IA ───────────────────────────────────────────────────
    return (
        <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
        >
            {/* Icono IA mini (estático en la burbuja, el avatar real está en el header) */}
            <div style={{
                width:          '28px',
                height:         '28px',
                borderRadius:   'var(--radius-base)',
                background:     'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,212,255,0.15))',
                border:         '1px solid rgba(0,255,136,0.2)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '12px',
                color:          'var(--accent-primary)',
                flexShrink:     0,
                marginTop:      '2px',
            }}>◇</div>

            {/* Contenido burbuja */}
            <div style={{
                flex:         1,
                background:   'var(--bg-elevated)',
                border:       '1px solid var(--border-subtle)',
                borderRadius: '3px 16px 16px 16px',
                padding:      '12px 14px',
                boxShadow:    '0 2px 12px rgba(0,0,0,0.3)',
                minWidth:     0,
                position:     'relative',
            }}>
                {/* Botón Copiar (AVT-08) — aparece en hover, solo en mensajes completos */}
                {!msg.loading && !msg.isError && hov && (
                    <button
                        onClick={() => onCopy(msg)}
                        title="Copiar respuesta"
                        style={{
                            position:      'absolute',
                            top:           '8px',
                            right:         '8px',
                            background:    copiedId === msg.id
                                ? 'rgba(0,255,136,0.12)'
                                : 'var(--bg-overlay)',
                            border:        `1px solid ${copiedId === msg.id ? 'rgba(0,255,136,0.35)' : 'var(--border-default)'}`,
                            borderRadius:  'var(--radius-base)',
                            color:         copiedId === msg.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '9px',
                            letterSpacing: '0.06em',
                            padding:       '3px 7px',
                            cursor:        'pointer',
                            transition:    'all 160ms',
                            whiteSpace:    'nowrap',
                            lineHeight:    1.4,
                        }}
                    >
                        {copiedId === msg.id ? '✓ copiado' : '⎘ copiar'}
                    </button>
                )}

                {/* Skeleton de carga */}
                {msg.loading && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '16px' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width:          '6px',
                                height:         '6px',
                                borderRadius:   '50%',
                                background:     'var(--accent-primary)',
                                animation:      'ai-dot-bounce 1.2s ease-in-out infinite',
                                animationDelay: `${i * 0.2}s`,
                            }} />
                        ))}
                    </div>
                )}

                {/* Error */}
                {msg.isError && (
                    <div style={{
                        display:    'flex',
                        gap:        '8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '12px',
                        color:      'var(--accent-danger)',
                        lineHeight: 1.5,
                    }}>
                        <span>▲</span>
                        <span>{msg.text}</span>
                    </div>
                )}

                {/* Texto normal */}
                {!msg.loading && !msg.isError && (
                    <div>
                        <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize:   '13px',
                            color:      'var(--text-primary)',
                            lineHeight: 1.55,
                            margin:     hov ? '0 48px 0 0' : 0,   // espacio para el botón copiar
                            wordBreak:  'break-word',
                            transition: 'margin 120ms ease',
                        }}>
                            {msg.text}
                        </p>

                        {/* SQL generado */}
                        {msg.sql && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{
                                    fontFamily:    'var(--font-display)',
                                    fontSize:      '9px',
                                    fontWeight:    600,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    color:         'var(--text-muted)',
                                    marginBottom:  '5px',
                                }}>SQL generado</div>
                                <code style={{
                                    display:      'block',
                                    fontFamily:   'var(--font-mono)',
                                    fontSize:     '11px',
                                    color:        'var(--accent-gold)',
                                    background:   'var(--bg-overlay)',
                                    border:       '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-base)',
                                    padding:      '8px 10px',
                                    whiteSpace:   'pre-wrap',
                                    wordBreak:    'break-word',
                                    lineHeight:   1.6,
                                }}>
                                    {msg.sql}
                                </code>
                            </div>
                        )}

                        {/* Resultados */}
                        {msg.results && msg.results.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{
                                    fontFamily:    'var(--font-display)',
                                    fontSize:      '9px',
                                    fontWeight:    600,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    color:         'var(--text-muted)',
                                    marginBottom:  '6px',
                                }}>
                                    {msg.results.length} resultado{msg.results.length !== 1 ? 's' : ''}
                                </div>
                                <DynamicTable rows={msg.results} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Componente principal ───────────────────────────────────────────────────────

interface AiFabProps { mobileMenuOpen?: boolean; }

export function AiFab({ mobileMenuOpen = false }: AiFabProps): JSX.Element {
    const { isOpen, toggle, close } = useAiPanel();

    const [messages,     setMessages]     = useState<Message[]>([WELCOME]);
    const [input,        setInput]        = useState('');
    const [loading,      setLoading]      = useState(false);
    const [headerStatus, setHeaderStatus] = useState<HeaderStatus>('online');
    const [copiedId,     setCopiedId]     = useState<number | null>(null);
    // Detectar móvil para bottom-sheet (AVT-08)
    const [isMobile,     setIsMobile]     = useState(
        () => typeof window !== 'undefined' && window.innerWidth < 640
    );

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLInputElement>(null);
    // AVT-07 — ref imperativo al avatar real
    const avatarRef = useRef<IAvatarHandle>(null);
    const nextId    = useRef(1);

    // Escuchar cambios de tamaño para switch desktop ↔ bottom-sheet
    useEffect(() => {
        const onResize = (): void => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', onResize, { passive: true });
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Scroll al último mensaje
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus al input cuando se abre el panel
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 320);
    }, [isOpen]);

    // ── Copiar al portapapeles (AVT-08) ───────────────────────────────
    const handleCopy = useCallback((msg: Message): void => {
        let text = msg.text;
        if (msg.sql) text += `\n\nSQL:\n${msg.sql}`;
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopiedId(msg.id);
                setTimeout(() => setCopiedId(null), 1500);
            })
            .catch(() => { /* silencioso — clipboard puede estar bloqueado */ });
    }, []);

    // ── Enviar mensaje al backend (AVT-07) ────────────────────────────
    async function sendMessage(text: string): Promise<void> {
        const q = text.trim();
        if (!q || loading) return;

        setInput('');
        setLoading(true);

        // — AVT-07: PROCESSING antes del await —
        avatarRef.current?.procesando();
        setHeaderStatus('thinking');

        const userId = nextId.current++;
        setMessages(prev => [...prev, { id: userId, role: 'user', text: q }]);

        const aiId = nextId.current++;
        setMessages(prev => [...prev, { id: aiId, role: 'ai', text: '', loading: true }]);

        try {
            const { data } = await api.post<Nl2SqlResponse>('/ai/nl2sql', { pregunta: q });

            if (data.error) {
                // La IA respondió pero con un error lógico
                setMessages(prev => prev.map(m =>
                    m.id === aiId
                        ? { ...m, loading: false, isError: true, text: data.error! }
                        : m
                ));
                avatarRef.current?.alerta(data.error);
                setHeaderStatus('error');
                setTimeout(() => {
                    avatarRef.current?.idle();
                    setHeaderStatus('online');
                }, 2500);

            } else {
                const hasResults  = data.resultados && data.resultados.length > 0;
                const responseText = hasResults
                    ? `He encontrado ${data.resultados.length} resultado${data.resultados.length !== 1 ? 's' : ''}.`
                    : 'La consulta no devolvió resultados.';

                setMessages(prev => prev.map(m =>
                    m.id === aiId
                        ? { ...m, loading: false, text: responseText, sql: data.sql, results: data.resultados }
                        : m
                ));

                // — AVT-07: TALKING al llegar la respuesta —
                setHeaderStatus('responding');
                avatarRef.current?.hablando(responseText, 8, () => {
                    setHeaderStatus('online');
                });
            }

        } catch {
            setMessages(prev => prev.map(m =>
                m.id === aiId
                    ? { ...m, loading: false, isError: true, text: 'No se pudo conectar con el asistente. Inténtalo de nuevo.' }
                    : m
            ));
            avatarRef.current?.alerta('Sin conexión');
            setHeaderStatus('error');
            setTimeout(() => {
                avatarRef.current?.idle();
                setHeaderStatus('online');
            }, 2500);

        } finally {
            setLoading(false);
        }
    }

    function handleKey(e: React.KeyboardEvent<HTMLInputElement>): void {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage(input);
        }
    }

    function handleLimpiar(): void {
        setMessages([WELCOME]);
        avatarRef.current?.idle();
        setHeaderStatus('online');
    }

    // ── Estilos adaptativos ───────────────────────────────────────────
    const status = STATUS_META[headerStatus];

    // AVT-08 — bottom-sheet en móvil, panel flotante en desktop
    const panelStyle: React.CSSProperties = isMobile
        ? {
            position:       'fixed',
            bottom:         0,
            left:           0,
            right:          0,
            width:          '100%',
            height:         'calc(100dvh - 72px)',
            zIndex:         400,
            display:        'flex',
            flexDirection:  'column',
            background:     'var(--bg-surface)',
            border:         '1px solid var(--border-default)',
            borderRadius:   '20px 20px 0 0',
            boxShadow:      '0 -8px 48px rgba(0,0,0,0.65)',
            overflow:       'hidden',
            opacity:        isOpen ? 1 : 0,
            transform:      isOpen ? 'translateY(0)' : 'translateY(100%)',
            transformOrigin:'bottom center',
            transition:     'opacity 280ms var(--ease-smooth), transform 300ms var(--ease-smooth)',
            pointerEvents:  isOpen && !mobileMenuOpen ? 'auto' : 'none',  // ← CAMBIO 1
        }
        : {
            position:       'fixed',
            bottom:         '100px',
            right:          '28px',
            width:          'min(390px, calc(100vw - 56px))',
            height:         'min(560px, calc(100dvh - 140px))',
            zIndex:         400,
            display:        'flex',
            flexDirection:  'column',
            background:     'var(--bg-surface)',
            border:         '1px solid var(--border-default)',
            borderRadius:   'var(--radius-xl)',
            boxShadow:      '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,255,136,0.06)',
            overflow:       'hidden',
            opacity:        isOpen ? 1 : 0,
            transform:      isOpen ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(16px)',
            transformOrigin:'bottom right',
            transition:     'opacity 250ms var(--ease-smooth), transform 250ms var(--ease-smooth)',
            pointerEvents:  isOpen ? 'auto' : 'none',
        };

    // ── Render ────────────────────────────────────────────────────────
    return (
        <>
            <style>{`
                @keyframes ai-dot-bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40%           { transform: scale(1);   opacity: 1;   }
                }
                /* Variante mini del avatar retro para el header del chat */
                .ia-avatar-mini .ia-avatar {
                    width:         36px !important;
                    height:        36px !important;
                    border-radius: 7px  !important;
                    border-width:  2px  !important;
                }
                .ia-avatar-mini .ia-avatar__eyes { gap: 5px !important; }
                .ia-avatar-mini .ia-avatar__eye  {
                    width:  8px !important;
                    height: 8px !important;
                }
            `}</style>

            {/* ── Panel de chat / bottom-sheet (AVT-08) ─────────────── */}
            <div
                role="dialog"
                aria-modal="false"
                aria-label="NEXUS AI"
                style={panelStyle}
            >
                {/* Línea de acento superior */}
                <div style={{
                    height:     '2px',
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan) 60%, transparent)',
                    flexShrink: 0,
                }} />

                {/* ── Cabecera ───────────────────────────────────────── */}
                <div style={{
                    padding:        '10px 14px',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    flexShrink:     0,
                    borderBottom:   '1px solid var(--border-subtle)',
                    background:     'var(--bg-elevated)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <IAAvatar
                            ref={avatarRef}
                            showOutput={false}
                            className="ia-avatar-mini"
                        />

                        <div>
                            <div style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '14px',
                                fontWeight:    700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color:         'var(--text-primary)',
                                lineHeight:    1.2,
                            }}>NEXUS AI</div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                                <span style={{
                                    display:      'inline-block',
                                    width:        '5px',
                                    height:       '5px',
                                    borderRadius: '50%',
                                    background:   status.color,
                                    boxShadow:    `0 0 6px ${status.color}`,
                                    transition:   'background 300ms ease, box-shadow 300ms ease',
                                    flexShrink:   0,
                                }} />
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '9px',
                                    color:         status.color,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    transition:    'color 300ms ease',
                                }}>{status.label}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={handleLimpiar}
                            title="Limpiar conversación"
                            style={{
                                background:     'transparent',
                                border:         '1px solid var(--border-subtle)',
                                borderRadius:   'var(--radius-base)',
                                color:          'var(--text-muted)',
                                fontFamily:     'var(--font-mono)',
                                fontSize:       '11px',
                                width:          '30px',
                                height:         '30px',
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                cursor:         'pointer',
                                transition:     'all 160ms',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)';  e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >↺</button>

                        <button
                            onClick={close}
                            aria-label="Cerrar NEXUS AI"
                            style={{
                                background:     'transparent',
                                border:         '1px solid var(--border-subtle)',
                                borderRadius:   'var(--radius-base)',
                                color:          'var(--text-muted)',
                                fontFamily:     'var(--font-mono)',
                                fontSize:       '13px',
                                width:          '30px',
                                height:         '30px',
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                cursor:         'pointer',
                                transition:     'all 160ms',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-danger)'; e.currentTarget.style.color = 'var(--accent-danger)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >✕</button>
                    </div>
                </div>

                {/* ── Área de mensajes ───────────────────────────────── */}
                <div style={{
                    flex:          1,
                    overflowY:     'auto',
                    padding:       '16px',
                    display:       'flex',
                    flexDirection: 'column',
                }}>
                    {messages.length === 1 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '10px',
                                color:         'var(--text-muted)',
                                letterSpacing: '0.06em',
                                marginBottom:  '8px',
                            }}>Sugerencias</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {EXAMPLES.map(ex => (
                                    <button
                                        key={ex}
                                        onClick={() => void sendMessage(ex)}
                                        style={{
                                            textAlign:    'left',
                                            fontFamily:   'var(--font-body)',
                                            fontSize:     '12px',
                                            color:        'var(--text-secondary)',
                                            background:   'var(--bg-elevated)',
                                            border:       '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-base)',
                                            padding:      '8px 12px',
                                            cursor:       'pointer',
                                            transition:   'all 160ms',
                                            lineHeight:   1.4,
                                            width:        '100%',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,136,0.3)';
                                            (e.currentTarget as HTMLButtonElement).style.color       = 'var(--text-primary)';
                                            (e.currentTarget as HTMLButtonElement).style.background  = 'var(--bg-overlay)';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                                            (e.currentTarget as HTMLButtonElement).style.color       = 'var(--text-secondary)';
                                            (e.currentTarget as HTMLButtonElement).style.background  = 'var(--bg-elevated)';
                                        }}
                                    >
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(msg => (
                        <Bubble key={msg.id} msg={msg} copiedId={copiedId} onCopy={handleCopy} />
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* ── Input — pie fijo ───────────────────────────────── */}
                <div style={{
                    flexShrink: 0,
                    padding:    '12px 14px',
                    borderTop:  '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    display:    'flex',
                    gap:        '8px',
                    alignItems: 'center',
                }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        disabled={loading}
                        placeholder={loading ? 'Esperando respuesta…' : 'Escribe una pregunta…'}
                        style={{
                            flex:         1,
                            fontFamily:   'var(--font-body)',
                            fontSize:     '13px',
                            color:        'var(--text-primary)',
                            background:   'var(--bg-surface)',
                            border:       '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-base)',
                            padding:      '9px 13px',
                            outline:      'none',
                            caretColor:   'var(--accent-primary)',
                            transition:   'border-color 160ms, box-shadow 160ms, opacity 160ms',
                            minWidth:     0,
                            opacity:      loading ? 0.55 : 1,
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

                    <button
                        onClick={() => void sendMessage(input)}
                        disabled={!input.trim() || loading}
                        aria-label="Enviar"
                        style={{
                            width:          '36px',
                            height:         '36px',
                            borderRadius:   'var(--radius-base)',
                            background:     input.trim() && !loading
                                ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))'
                                : 'var(--bg-overlay)',
                            border:         'none',
                            color:          input.trim() && !loading ? '#05050a' : 'var(--text-muted)',
                            cursor:         input.trim() && !loading ? 'pointer' : 'not-allowed',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            fontSize:       '15px',
                            flexShrink:     0,
                            transition:     'all 160ms',
                            boxShadow:      input.trim() && !loading
                                ? '0 0 14px rgba(0,255,136,0.28)'
                                : 'none',
                        }}
                    >▶</button>
                </div>
            </div>

            {/* ── FAB flotante ──────────────────────────────────────── */}
            <button
                onClick={toggle}
                aria-label={isOpen ? 'Cerrar NEXUS AI' : 'Abrir NEXUS AI'}
                aria-expanded={isOpen}
                style={{
                    position:      'fixed',
                    bottom:        '28px',
                    right:         '28px',
                    zIndex:        401,
                    display:       (isMobile && isOpen) || mobileMenuOpen ? 'none' : 'flex',  // ← CAMBIO 2
                    alignItems:    'center',
                    gap:           '9px',
                    padding:       '11px 22px 11px 18px',
                    borderRadius:  'var(--radius-full)',
                    background:    isOpen ? 'var(--fab-gradient-active)' : 'var(--fab-gradient)',
                    border:        'none',
                    cursor:        'pointer',
                    color:         'var(--fab-color)',
                    boxShadow:     isOpen ? 'var(--fab-shadow-active)' : 'var(--fab-shadow)',
                    transition:    'all 220ms var(--ease-smooth)',
                    userSelect:    'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
            >
                <span style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0 }}>
                    {isOpen ? '✕' : '◇'}
                </span>
                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '13px',
                    fontWeight:    700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    lineHeight:    1,
                    flexShrink:    0,
                }}>
                    NEXUS AI
                </span>
            </button>
        </>
    );
}