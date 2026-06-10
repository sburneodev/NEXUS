/**
 * services/api.ts — FE-04
 *
 * Instancia centralizada de Axios para NEXUS ERP.
 *
 * Decisiones arquitectónicas:
 *
 * 1. SINGLE INSTANCE — toda la app usa esta instancia. Cualquier cambio
 *    en headers, baseURL o interceptores se aplica globalmente.
 *
 * 2. REQUEST INTERCEPTOR — inyecta el JWT en cada petición de forma
 *    automática. El componente no necesita saber nada del token.
 *
 * 3. RESPONSE INTERCEPTOR — captura 401 globalmente. En lugar de
 *    window.location.href (recarga brusca) emite un CustomEvent que
 *    useAuth escucha para hacer logout limpio con React Router.
 *    Así evitamos romper el estado de React con una recarga forzada.
 *
 * 4. TOKEN_KEY — constante exportada para que useAuth y api.ts
 *    lean/escriban exactamente la misma clave de localStorage.
 *    Si se cambia el nombre, se cambia en un único lugar.
 */

import axios, {
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';

// ── Constantes ─────────────────────────────────────────────────────

/** Clave de localStorage donde se guarda el JWT */
export const TOKEN_KEY = 'nexus_token';

/**
 * Nombre del evento global que se emite cuando el servidor
 * devuelve 401. useAuth lo escucha para hacer logout limpio.
 */
export const AUTH_EXPIRED_EVENT = 'nexus:auth:expired';

// ── Instancia Axios ─────────────────────────────────────────────────

const api = axios.create({
    baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:8080/api',
    timeout: 45_000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// ── Interceptor de REQUEST ──────────────────────────────────────────

/**
 * Inyecta el Bearer token en cada petición saliente.
 * Si no hay token (usuario no autenticado) la petición sale limpia.
 */
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError): Promise<never> => {
        // Error al construir la petición (ej. URL malformada)
        return Promise.reject(error);
    }
);

// ── Interceptor de RESPONSE ─────────────────────────────────────────

/**
 * Captura errores HTTP globalmente.
 *
 * 401 Unauthorized — token caducado o inválido:
 *   · Elimina el token del localStorage
 *   · Emite AUTH_EXPIRED_EVENT → useAuth lo captura y redirige al login
 *     mediante React Router (sin window.location.href = recarga limpia)
 *
 * Otros errores — se re-lanzan para que cada llamada los maneje
 * según su contexto (mostrar toast, mensaje de error, etc.)
 */
api.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,

    (error: AxiosError): Promise<never> => {
        if (error.response?.status === 401) {
            // 1. Limpiar credenciales del almacenamiento local
            localStorage.removeItem(TOKEN_KEY);

            // 2. Notificar a React sin romper el ciclo de renderizado
            //    useAuth escucha este evento y llama a logout() + navigate('/login')
            window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
        }

        // Re-lanzar siempre — nunca silenciar errores
        return Promise.reject(error);
    }
);

export default api;