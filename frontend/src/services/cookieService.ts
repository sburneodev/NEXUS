/**
 * services/cookieService.ts  v2
 *
 * Gestión centralizada de cookies — RGPD / LSSI compliant.
 *
 * Atributos de seguridad:
 *   SameSite=Strict  → protege contra CSRF cross-site
 *   Secure           → solo HTTPS en producción (auto-detectado)
 *   HttpOnly         → solo aplicable por el servidor (sesión backend)
 *   Path=/           → válida en toda la app
 *
 * Registro de consentimiento:
 *   Se guarda { status, timestamp, version } en JSON para cumplir
 *   con los requisitos de auditoría del RGPD (Art. 7 y Rec. 42).
 */

// ── Constantes ────────────────────────────────────────────────────────────────

/** Versión de la política de cookies. Incrementar cuando cambie la política. */
export const COOKIE_POLICY_VERSION = '1.0';

export const COOKIE_NAMES = {
    /** Registro de consentimiento (status + timestamp + versión) */
    CONSENT: 'nexus_cookie_consent',
} as const;

/** Duración del consentimiento: 30 días en segundos */
const CONSENT_MAX_AGE = 30 * 24 * 60 * 60;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ConsentStatus = 'granted' | 'denied' | null;

/** Registro completo de consentimiento — guardado en la cookie */
export interface ConsentRecord {
    status:    'granted' | 'denied';
    timestamp: string;   // ISO 8601
    version:   string;   // versión de la política aceptada
}

// ── Utilidades base ───────────────────────────────────────────────────────────

function secureFlag(): string {
    return window.location.protocol === 'https:' ? '; Secure' : '';
}

export function setCookie(name: string, value: string, maxAgeSeconds = CONSENT_MAX_AGE): void {
    document.cookie = [
        `${name}=${encodeURIComponent(value)}`,
        `Max-Age=${maxAgeSeconds}`,
        'SameSite=Strict',
        'Path=/',
        secureFlag(),
    ].filter(Boolean).join('; ');
}

export function getCookie(name: string): string | null {
    const pair = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`));
    return pair ? decodeURIComponent(pair.split('=')[1]) : null;
}

export function deleteCookie(name: string): void {
    document.cookie = `${name}=; Max-Age=0; SameSite=Strict; Path=/`;
}

// ── Consentimiento ────────────────────────────────────────────────────────────

/**
 * Lee el registro completo de consentimiento almacenado.
 * Devuelve null si no hay ninguna decisión previa (mostrar banner).
 */
export function getConsentRecord(): ConsentRecord | null {
    const raw = getCookie(COOKIE_NAMES.CONSENT);
    if (!raw) return null;
    try {
        const record = JSON.parse(raw) as ConsentRecord;
        if (record.status === 'granted' || record.status === 'denied') return record;
        return null;
    } catch {
        return null;
    }
}

/** Estado de consentimiento simplificado. */
export function getConsentStatus(): ConsentStatus {
    return getConsentRecord()?.status ?? null;
}

/**
 * Guarda el consentimiento con timestamp e ISO para auditoría RGPD.
 */
export function saveConsentStatus(status: 'granted' | 'denied'): void {
    const record: ConsentRecord = {
        status,
        timestamp: new Date().toISOString(),
        version:   COOKIE_POLICY_VERSION,
    };
    setCookie(COOKIE_NAMES.CONSENT, JSON.stringify(record), CONSENT_MAX_AGE);
}

/** Revoca el consentimiento (el banner volverá a mostrarse). */
export function revokeConsent(): void {
    deleteCookie(COOKIE_NAMES.CONSENT);
}

// ── Inventario de almacenamiento técnico (SIEMPRE activo, sin consentimiento) ──
//
//   localStorage['nexus_theme']         → preferencia de tema UI          (técnica)
//   localStorage['nexus_avatar_<email>']→ foto de perfil subida por user  (técnica)
//   localStorage['nexus_token']         → token de sesión JWT              (técnica/sesión)
//
//   Ninguno de los anteriores requiere consentimiento RGPD porque son datos
//   de preferencia/sesión del propio usuario, no datos de seguimiento de terceros.

/**
 * Elimina cualquier dato analítico almacenado localmente.
 * Se llama automáticamente cuando el usuario elige "Solo necesarias".
 * Ampliar esta función si en el futuro se añaden scripts de analíticas.
 */
export function clearAnalyticsData(): void {
    // Eliminar claves de analíticas de localStorage si existen
    const analyticsKeys = Object.keys(localStorage).filter(k =>
        k.startsWith('_ga') ||       // Google Analytics
        k.startsWith('_gid') ||
        k.startsWith('_fbp') ||      // Meta Pixel
        k.startsWith('amplitude_') || // Amplitude
        k.startsWith('mp_') ||        // Mixpanel
        k.startsWith('nexus_analytics_') // Clave propia futura
    );
    analyticsKeys.forEach(k => localStorage.removeItem(k));

    // Eliminar cookies de analíticas de terceros
    const analyticsCookies = ['_ga', '_gid', '_gat', '_fbp', '_fbc'];
    analyticsCookies.forEach(name => deleteCookie(name));
}

// ── Bloqueo preventivo de scripts ────────────────────────────────────────────
//
// USO: envuelve CUALQUIER inicialización de script no esencial con esta función.
// Si el usuario no ha otorgado consentimiento, el callback NUNCA se ejecuta.
//
// Ejemplo con Google Analytics:
//
//   loadIfAllowed('analytics', () => {
//     const script = document.createElement('script');
//     script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_ID';
//     document.head.appendChild(script);
//     window.gtag('config', 'GA_ID');
//   });
//

type CookieCategory = 'analytics';

export function loadIfAllowed(category: CookieCategory, loader: () => void): void {
    if (category === 'analytics' && getConsentStatus() === 'granted') {
        loader();
    }
}

/** Alias semántico — comprueba si analytics está permitido. */
export function isAnalyticsAllowed(): boolean {
    return getConsentStatus() === 'granted';
}
