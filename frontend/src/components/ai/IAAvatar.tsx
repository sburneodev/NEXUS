/**
 * IAAvatar — Monitor retro pixelado con máquina de estados
 *
 * ── ISSUES CUBIERTOS ──────────────────────────────────────────────────
 *  AVT-05 · Módulo JS: idle() · procesando(msg) · alerta(msg) · hablando(text, speed, cb)
 *  AVT-06 · Efecto máquina de escribir: setInterval carácter a carácter + auto-scroll
 *
 * ── ESTADOS (las clases CSS las define ia-avatar.css) ─────────────────
 *  idle       → AVT-01 — flotar 3 s, borde cian, parpadeo lento
 *  processing → AVT-02 — girar ±4°, borde naranja, ojos oscilan
 *  alerta     → AVT-03 — vibrar horizontal, glow rojo pulsante
 *  talking    → AVT-04 — vibrar suave diagonal, guiños alternos, borde verde
 *
 * ── USO BÁSICO ────────────────────────────────────────────────────────
 *  const ref = useRef<IAvatarHandle>(null);
 *
 *  <IAAvatar ref={ref} />
 *
 *  ref.current?.procesando('Cargando datos…');
 *  ref.current?.hablando('Stock actualizado. Quedan 4 unidades.', 30, () => {
 *      console.log('Avatar ha terminado de hablar.');
 *  });
 */

import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
    useCallback,
    useEffect,
} from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────

type AvatarState = 'idle' | 'processing' | 'alerta' | 'talking';

/**
 * AVT-05 — Handle imperativo expuesto a los componentes padre vía ref.
 *
 * Permite controlar el avatar de forma programática sin prop drilling:
 *   const ref = useRef<IAvatarHandle>(null);
 *   ref.current?.hablando('Texto a mostrar', 30, () => console.log('fin'));
 */
export interface IAvatarHandle {
    /** AVT-01 — Vuelve al estado flotante azul. Cancela typewriter y limpia texto. */
    idle(): void;

    /** AVT-02 — Activa estado naranja+giratorio. Muestra msg opcional en etiqueta. */
    procesando(msg?: string): void;

    /** AVT-03 — Activa estado rojo pulsante. Muestra msg de alerta en etiqueta. */
    alerta(msg?: string): void;

    /**
     * AVT-04 + AVT-06 — Activa estado TALKING y escribe `text` carácter a carácter.
     *
     * @param text  Texto completo a mostrar con efecto máquina de escribir.
     * @param speed Milisegundos entre cada carácter. Por defecto: 30 ms.
     * @param cb    Callback ejecutado al terminar; el avatar vuelve a IDLE solo.
     */
    hablando(text: string, speed?: number, cb?: () => void): void;
}

interface IAvatarProps {
    /**
     * Muestra el área de texto con el efecto typewriter debajo del avatar.
     * Ponlo en `false` si el componente padre gestiona la salida de texto.
     * Por defecto: `true`.
     */
    showOutput?: boolean;
    /** Clase CSS adicional para el div raíz del componente. */
    className?: string;
}

// ── Constantes ─────────────────────────────────────────────────────────

/** Mapeo estado → clase CSS de ia-avatar.css */
const STATE_CLASS: Record<AvatarState, string> = {
    idle:       'ia-avatar--idle',
    processing: 'ia-avatar--processing',
    alerta:     'ia-avatar--alerta',
    talking:    'ia-avatar--talking',
};

/** Colores de etiqueta según estado */
const STATUS_COLOR: Partial<Record<AvatarState, string>> = {
    processing: 'var(--accent-warning, #ff8800)',
    alerta:     'var(--accent-danger,  #ff3355)',
};

// ── Componente ─────────────────────────────────────────────────────────

export const IAAvatar = forwardRef<IAvatarHandle, IAvatarProps>(
    function IAAvatar({ showOutput = true, className = '' }, ref) {

        const [state,       setState]       = useState<AvatarState>('idle');
        const [displayText, setDisplayText] = useState('');
        const [statusMsg,   setStatusMsg]   = useState('');
        const [typing,      setTyping]      = useState(false);

        /** Referencia al intervalo activo del typewriter. */
        const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
        /** Referencia al div de salida de texto para el auto-scroll. */
        const outputRef   = useRef<HTMLDivElement>(null);

        // ── Utilidades internas ───────────────────────────────────────

        /**
         * Cancela el typewriter en curso y marca el cursor como inactivo.
         * Seguro de llamar aunque no haya ningún intervalo activo.
         */
        const clearTypewriter = useCallback((): void => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setTyping(false);
        }, []);

        /**
         * AVT-06 — Fuerza el scroll del área de texto hasta el último carácter.
         * Se invoca en cada tick del setInterval para seguir al texto mientras crece.
         */
        const scrollBottom = useCallback((): void => {
            const el = outputRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        }, []);

        // Limpiar el intervalo al desmontar (evita memory leak y warning de React)
        useEffect(() => (): void => { clearTypewriter(); }, [clearTypewriter]);

        // ── Handle imperativo (AVT-05) ────────────────────────────────

        useImperativeHandle(ref, () => ({

            idle(): void {
                clearTypewriter();
                setState('idle');
                setStatusMsg('');
                setDisplayText('');
            },

            procesando(msg = 'Procesando…'): void {
                clearTypewriter();
                setState('processing');
                setStatusMsg(msg);
                setDisplayText('');
            },

            alerta(msg = '¡Stock bajo mínimo!'): void {
                clearTypewriter();
                setState('alerta');
                setStatusMsg(msg);
                setDisplayText('');
            },

            hablando(text: string, speed = 30, cb?: () => void): void {
                // Cancela cualquier typewriter anterior
                clearTypewriter();

                setState('talking');
                setStatusMsg('');
                setDisplayText('');
                setTyping(true);

                let index = 0;

                // AVT-06 — Máquina de escribir: añade un carácter por tick
                intervalRef.current = setInterval((): void => {
                    index++;
                    setDisplayText(text.slice(0, index));
                    scrollBottom(); // auto-scroll en cada carácter nuevo

                    // Cuando se ha escrito el último carácter
                    if (index >= text.length) {
                        clearTypewriter(); // para el intervalo y oculta cursor
                        // Pequeña pausa visual antes de volver a IDLE
                        setTimeout((): void => {
                            setState('idle');
                            cb?.();
                        }, 900);
                    }
                }, speed);
            },

        }), [clearTypewriter, scrollBottom]);

        // ── Render ────────────────────────────────────────────────────

        return (
            <div
                className={`ia-avatar-wrapper${className ? ` ${className}` : ''}`}
                style={{
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    gap:            '10px',
                }}
            >
                {/* ── Monitor retro — clases de ia-avatar.css ── */}
                <div className={`ia-avatar ${STATE_CLASS[state]}`}>
                    <div className="ia-avatar__eyes">
                        <div className="ia-avatar__eye" />
                        <div className="ia-avatar__eye" />
                    </div>
                </div>

                {/* ── Etiqueta de estado (processing / alerta) ── */}
                {statusMsg && (
                    <span
                        style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '11px',
                            letterSpacing: '0.06em',
                            color:         STATUS_COLOR[state] ?? 'var(--text-secondary)',
                            textAlign:     'center',
                            maxWidth:      '160px',
                            lineHeight:    1.4,
                        }}
                    >
                        {statusMsg}
                    </span>
                )}

                {/* ── Área de texto con efecto máquina de escribir (AVT-06) ── */}
                {showOutput && (displayText !== '' || typing) && (
                    <div
                        ref={outputRef}
                        style={{
                            width:        '100%',
                            maxHeight:    '120px',
                            overflowY:    'auto',
                            background:   'rgba(0, 0, 0, 0.6)',
                            border:       '1px solid rgba(0, 255, 136, 0.2)',
                            borderRadius: '6px',
                            padding:      '10px 12px',
                            fontFamily:   'var(--font-mono)',
                            fontSize:     '12px',
                            color:        'var(--accent-primary)',
                            lineHeight:   1.6,
                            wordBreak:    'break-word',
                            whiteSpace:   'pre-wrap',
                        }}
                    >
                        {displayText}
                        {/* Cursor parpadeante — solo visible mientras escribe */}
                        {typing && <span className="ia-typewriter-cursor" />}
                    </div>
                )}
            </div>
        );
    }
);
