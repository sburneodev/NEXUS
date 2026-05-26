/**
 * hooks/useAuth.ts — FE-05
 *
 * Custom hook central de autenticación para NEXUS ERP.
 *
 * Decisiones arquitectónicas:
 *
 * 1. DECODIFICACIÓN MANUAL DEL JWT — no usamos jwt-decode (dependencia
 *    extra) ni confiamos en el payload para decisiones de seguridad.
 *    La verificación real la hace el backend en cada petición.
 *    El frontend solo decodifica para mostrar datos (email, roles).
 *
 * 2. INICIALIZACIÓN DESDE LOCALSTORAGE — al montar el hook, si existe
 *    un token válido (no expirado) se restaura la sesión sin que el
 *    usuario tenga que volver a logarse tras recargar la página.
 *
 * 3. ESCUCHA DE AUTH_EXPIRED_EVENT — cuando api.ts detecta un 401,
 *    emite el evento. Este hook lo captura y ejecuta logout() con
 *    navigate('/login'), evitando window.location (recarga brusca).
 *
 * 4. ROLES — se parsean del campo "roles" del JWT ("ADMIN,CAJERO")
 *    y se exponen como Role[] tipado. hasRole() permite verificar
 *    permisos en componentes sin lógica duplicada.
 *
 * 5. SINGLE SOURCE OF TRUTH — todo el estado de auth vive aquí.
 *    LoginPage, ProtectedRoute y Navbar consumen este hook.
 */

import {
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY, AUTH_EXPIRED_EVENT } from '../services/api';
import type { AuthUser, AuthState, DecodedToken, Role } from '../types/auth';

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * La verificación criptográfica la hace el backend en cada petición.
 *
 * @param token - JWT en formato xxx.yyy.zzz
 * @returns Payload decodificado o null si el token es inválido
 */
function decodeToken(token: string): DecodedToken | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // El payload es la segunda parte, codificada en Base64URL
        const payload = parts[1];
        // Base64URL → Base64 estándar
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join('')
        );

        return JSON.parse(jsonStr) as DecodedToken;
    } catch {
        return null;
    }
}

/**
 * Comprueba si un token JWT ha expirado.
 * Añade un margen de 30 segundos para evitar race conditions
 * (el token está a punto de expirar pero la petición ya salió).
 *
 * @param decoded - Payload decodificado del JWT
 */
function isTokenExpired(decoded: DecodedToken): boolean {
    const MARGIN_SECONDS = 30;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return decoded.exp < nowSeconds + MARGIN_SECONDS;
}

/**
 * Convierte el campo "roles" del JWT ("ADMIN,CAJERO") en Role[].
 * Filtra valores vacíos para protegerse de tokens mal formados.
 */
function parseRoles(rolesString: string): Role[] {
    return rolesString
        .split(',')
        .map(r => r.trim())
        .filter((r): r is Role => r.length > 0) as Role[];
}

/**
 * Construye un AuthUser a partir del payload decodificado del JWT.
 */
function buildUser(decoded: DecodedToken): AuthUser {
    return {
        email: decoded.sub,
        userId: decoded.userId,
        roles: parseRoles(decoded.roles),
    };
}

// ── Estado inicial ──────────────────────────────────────────────────

const INITIAL_STATE: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
};

/**
 * Intenta restaurar la sesión desde localStorage al arrancar.
 * Si el token existe pero ha expirado, lo limpia y devuelve estado vacío.
 */
function getInitialState(): AuthState {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return INITIAL_STATE;

    const decoded = decodeToken(token);
    if (!decoded || isTokenExpired(decoded)) {
        localStorage.removeItem(TOKEN_KEY);
        return INITIAL_STATE;
    }

    return {
        user: buildUser(decoded),
        token,
        isAuthenticated: true,
    };
}

// ── Hook ────────────────────────────────────────────────────────────

export interface UseAuthReturn {
    /** Usuario actualmente autenticado o null */
    user: AuthUser | null;
    /** Token JWT crudo o null */
    token: string | null;
    /** true si hay sesión activa con token no expirado */
    isAuthenticated: boolean;
    /**
     * Inicia sesión guardando el token JWT.
     * Decodifica el payload y actualiza el estado.
     *
     * @param token - JWT recibido del backend en POST /auth/login
     * @throws Error si el token tiene formato inválido
     */
    login: (token: string) => void;
    /** Cierra la sesión y redirige al login */
    logout: () => void;
    /**
     * Comprueba si el usuario tiene un rol concreto.
     *
     * @param role - Rol a verificar (ej. 'ADMIN', 'CAJERO')
     * @returns true si el usuario tiene ese rol
     */
    hasRole: (role: Role) => boolean;
    /**
     * Comprueba si el usuario tiene alguno de los roles indicados.
     * Útil para componentes accesibles a varios roles.
     *
     * @param roles - Array de roles a comprobar
     */
    hasAnyRole: (roles: Role[]) => boolean;
}

export function useAuth(): UseAuthReturn {
    const [state, setState] = useState<AuthState>(getInitialState);
    const navigate = useNavigate();

    // Ref para navigate — evita que el effect se re-ejecute si navigate cambia
    const navigateRef = useRef(navigate);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    // ── Escuchar AUTH_EXPIRED_EVENT emitido por api.ts ────────────────
    useEffect(() => {
        const handleExpired = (): void => {
            // Limpiar estado sin esperar a que el componente lo detecte
            setState(INITIAL_STATE);
            localStorage.removeItem(TOKEN_KEY);
            navigateRef.current('/login', { replace: true });
        };

        window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    }, []);

    // ── login ──────────────────────────────────────────────────────────
    const login = useCallback((token: string): void => {
        const decoded = decodeToken(token);

        if (!decoded) {
            throw new Error('[NEXUS:useAuth] Token JWT con formato inválido.');
        }

        if (isTokenExpired(decoded)) {
            throw new Error('[NEXUS:useAuth] El token recibido ya ha expirado.');
        }

        localStorage.setItem(TOKEN_KEY, token);

        setState({
            user: buildUser(decoded),
            token,
            isAuthenticated: true,
        });
    }, []);

    // ── logout ─────────────────────────────────────────────────────────
    const logout = useCallback((): void => {
        localStorage.removeItem(TOKEN_KEY);
        setState(INITIAL_STATE);
        navigateRef.current('/login', { replace: true });
    }, []);

    // ── hasRole ────────────────────────────────────────────────────────
    const hasRole = useCallback(
        (role: Role): boolean => state.user?.roles.includes(role) ?? false,
        [state.user]
    );

    // ── hasAnyRole ─────────────────────────────────────────────────────
    const hasAnyRole = useCallback(
        (roles: Role[]): boolean =>
            roles.some(role => state.user?.roles.includes(role) ?? false),
        [state.user]
    );

    return {
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        login,
        logout,
        hasRole,
        hasAnyRole,
    };
}