/**
 * hooks/useCookieConsent.ts
 *
 * Hook compartido para gestionar el consentimiento de cookies.
 * Usa un CustomEvent global (mismo patrón que useTheme) para sincronizar
 * el estado entre CookieBanner, CookiePreferences y cualquier otro consumidor
 * sin necesitar Context ni prop drilling.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    getConsentStatus,
    getConsentRecord,
    saveConsentStatus,
    clearAnalyticsData,
    type ConsentStatus,
    type ConsentRecord,
} from '../services/cookieService';
import api, { TOKEN_KEY } from '../services/api';

/** Obtiene el email del usuario del JWT en localStorage, o 'Anonimo'. */
function getEmailFromToken(): string {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return 'Anonimo';
        const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as Record<string, unknown>;
        return (payload['sub'] ?? payload['email'] ?? 'Anonimo') as string;
    } catch {
        return 'Anonimo';
    }
}

const CONSENT_EVENT = 'nexus:consent-change';

interface UseCookieConsentReturn {
    /** Estado actual: 'granted' | 'denied' | null (null = sin decisión) */
    status:  ConsentStatus;
    /** Registro completo con timestamp y versión de política */
    record:  ConsentRecord | null;
    /** Acepta todas las cookies (técnicas + analíticas) */
    accept:  () => void;
    /** Rechaza las no esenciales (solo técnicas) */
    reject:  () => void;
}

export function useCookieConsent(): UseCookieConsentReturn {
    const [status, setStatus] = useState<ConsentStatus>(getConsentStatus);
    const [record, setRecord] = useState<ConsentRecord | null>(getConsentRecord);

    // Escucha cambios emitidos desde otros componentes (CookieBanner ↔ CookiePreferences)
    useEffect(() => {
        const handler = (e: Event): void => {
            const next = (e as CustomEvent<ConsentStatus>).detail;
            setStatus(next);
            setRecord(getConsentRecord());
        };
        window.addEventListener(CONSENT_EVENT, handler);
        return () => window.removeEventListener(CONSENT_EVENT, handler);
    }, []);

    const dispatch = (next: 'granted' | 'denied'): void => {
        saveConsentStatus(next);
        // Si rechaza → limpia inmediatamente cualquier dato analítico existente
        if (next === 'denied') clearAnalyticsData();
        setStatus(next);
        setRecord(getConsentRecord());
        window.dispatchEvent(new CustomEvent<ConsentStatus>(CONSENT_EVENT, { detail: next }));

        // Registrar en audit_log — fire and forget, no bloquea la UI
        // POST /privacy/consent es público: funciona antes y después del login
        const accion = next === 'granted'
            ? 'CONSENTIMIENTO_COOKIES_ACEPTADO'
            : 'CONSENTIMIENTO_COOKIES_RECHAZADO';
        api.post('/privacy/consent', {
            usuarioEmail: getEmailFromToken(),
            accion,
            detalles:     next === 'granted'
                ? 'El usuario aceptó todas las cookies (técnicas + analíticas)'
                : 'El usuario rechazó las cookies no esenciales (solo técnicas)',
        }).catch(() => { /* silencioso — no crítico */ });
    };

    const accept = useCallback(() => dispatch('granted'), []);
    const reject = useCallback(() => dispatch('denied'),  []);

    return { status, record, accept, reject };
}
