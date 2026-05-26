/**
 * hooks/useIdleTimer.ts
 *
 * Detecta inactividad del usuario y ejecuta un callback tras X ms.
 * Escucha: mousemove, mousedown, keydown, touchstart, scroll.
 * Uso: useIdleTimer({ timeout: 30 * 60 * 1000, onIdle: logout })
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
    /** Tiempo en ms hasta considerar inactivo (default: 30 min) */
    timeout:  number;
    /** Función a ejecutar cuando se detecta inactividad */
    onIdle:   () => void;
    /** Si false, el timer no corre (ej. usuario no autenticado) */
    enabled?: boolean;
}

const EVENTS = [
    'mousemove', 'mousedown', 'keydown',
    'touchstart', 'scroll', 'wheel',
] as const;

export function useIdleTimer({ timeout, onIdle, enabled = true }: UseIdleTimerOptions): void {
    const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onIdleRef  = useRef(onIdle);
    const timeoutRef = useRef(timeout);

    // Mantener refs actualizadas sin re-registrar listeners
    useEffect(() => { onIdleRef.current  = onIdle;   }, [onIdle]);
    useEffect(() => { timeoutRef.current = timeout;  }, [timeout]);

    const reset = useCallback((): void => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onIdleRef.current();
        }, timeoutRef.current);
    }, []);

    useEffect(() => {
        if (!enabled) return;

        reset(); // Arranca el timer al montar

        EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            EVENTS.forEach(ev => window.removeEventListener(ev, reset));
        };
    }, [enabled, reset]);
}