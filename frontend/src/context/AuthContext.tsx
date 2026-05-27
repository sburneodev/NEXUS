/**
 * context/AuthContext.tsx — NEXUS ERP Auth v2
 *
 * ── POR QUÉ CONTEXT Y NO UN HOOK CON useState ────────────────────
 *
 * Un custom hook con useState crea estado INDEPENDIENTE por componente:
 *   - ProtectedRoute.useAuth() → su propio {isAuthenticated}
 *   - Navbar.useAuth()         → su propio {user}
 *   - LoginPage.useAuth()      → su propio {user}
 *
 * Cuando login() se llama en LoginPage, solo actualiza ESA instancia.
 * Si Navbar no desmonta entre sesiones, su useState(getInitialState)
 * nunca re-ejecuta → queda con datos de la sesión anterior.
 *
 * Con Context hay UN ÚNICO estado. Todos los consumidores ven el
 * mismo user/isAuthenticated simultáneamente. El logout en Navbar
 * hace que ProtectedRoute detecte isAuthenticated: false al instante
 * y redirige, sin condiciones de carrera ni estados residuales.
 *
 * ── DECISIONES TÉCNICAS ──────────────────────────────────────────
 *
 * 1. El Provider vive dentro de <BrowserRouter> para poder usar
 *    useNavigate(). Se coloca en App.tsx justo dentro del Router.
 *
 * 2. La función resetAuthState limpia explícitamente localStorage
 *    y sessionStorage además de resetear el estado React.
 *
 * 3. useAuth() lanza si se usa fuera del Provider — error claro.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
    type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY, AUTH_EXPIRED_EVENT } from '../services/api';
import type { AuthUser, AuthState, DecodedToken, Role } from '../types/auth';

// ── Helpers (lógica JWT — sin dependencias externas) ─────────────────

/**
 * Decodifica el payload de un JWT sin verificar firma.
 * La verificación criptográfica la hace el backend en cada request.
 */
function decodeToken(token: string): DecodedToken | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
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

/** Margen de 30 s para evitar race conditions con tokens próximos a expirar. */
function isTokenExpired(decoded: DecodedToken): boolean {
    return decoded.exp < Math.floor(Date.now() / 1000) + 30;
}

/** Convierte "ADMIN,CAJERO" → Role[]. Filtra valores vacíos. */
function parseRoles(rolesString: string): Role[] {
    return rolesString
        .split(',')
        .map(r => r.trim())
        .filter((r): r is Role => r.length > 0) as Role[];
}

function buildUser(decoded: DecodedToken): AuthUser {
    return {
        email:   decoded.sub,
        userId:  decoded.userId,
        roles:   parseRoles(decoded.roles),
    };
}

// ── Estado inicial ────────────────────────────────────────────────────

const INITIAL_STATE: AuthState = {
    user:            null,
    token:           null,
    isAuthenticated: false,
};

/**
 * Lee el token de localStorage al arrancar.
 * Si está expirado, lo elimina y devuelve estado vacío.
 * Se usa como lazy initializer de useState — corre una sola vez.
 */
function getInitialState(): AuthState {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return INITIAL_STATE;

    const decoded = decodeToken(token);
    if (!decoded || isTokenExpired(decoded)) {
        localStorage.removeItem(TOKEN_KEY);
        return INITIAL_STATE;
    }

    return { user: buildUser(decoded), token, isAuthenticated: true };
}

// ── Interfaz pública del contexto ─────────────────────────────────────

export interface AuthContextValue {
    /** Usuario autenticado actualmente, o null si no hay sesión. */
    user: AuthUser | null;
    /** JWT crudo, o null. */
    token: string | null;
    /** true si hay sesión activa con token válido. */
    isAuthenticated: boolean;
    /** Inicia sesión: guarda token, actualiza estado global. */
    login: (token: string) => void;
    /** Cierra sesión: limpia storage y estado, redirige a /login. */
    logout: () => void;
    /** Comprueba si el usuario tiene un rol específico. */
    hasRole: (role: Role) => boolean;
    /** Comprueba si el usuario tiene alguno de los roles indicados. */
    hasAnyRole: (roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
    const [state, setState] = useState<AuthState>(getInitialState);

    const navigate      = useNavigate();
    const navigateRef   = useRef(navigate);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    /**
     * Limpieza centralizada del estado de autenticación.
     * Declarada ANTES de cualquier hook que la use (useEffect, logout).
     *
     * Se llama tanto en logout() manual como en la expiración automática
     * del token detectada por api.ts (interceptor 401 → AUTH_EXPIRED_EVENT).
     * Añadir aquí cualquier clave de sesión adicional que aparezca en el futuro.
     */
    const resetAuthState = useCallback((): void => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('nexus_role');
        sessionStorage.removeItem(TOKEN_KEY);
        setState(INITIAL_STATE);
    }, []);

    // ── Escucha de token expirado emitido por api.ts (interceptor 401) ─
    // resetAuthState está en deps: es estable (useCallback con []) pero
    // declararla explícitamente es más correcto y no requiere eslint-disable.
    useEffect(() => {
        const handleExpired = (): void => {
            resetAuthState();
            navigateRef.current('/login', { replace: true });
        };
        window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    }, [resetAuthState]);

    // ── login ─────────────────────────────────────────────────────────
    const login = useCallback((token: string): void => {
        const decoded = decodeToken(token);

        if (!decoded) {
            throw new Error('[NEXUS:AuthProvider] Token JWT con formato inválido.');
        }
        if (isTokenExpired(decoded)) {
            throw new Error('[NEXUS:AuthProvider] El token recibido ya ha expirado.');
        }

        // ── Limpieza explícita del storage ANTES de escribir el nuevo token ──
        // Garantiza que no quede ningún token residual de la sesión anterior
        // aunque el flujo de logout haya fallado o se haya cortado.
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('nexus_role');
        sessionStorage.clear();

        // Escribe el nuevo token y actualiza el estado global con los datos
        // del nuevo usuario en un único setState atómico — sin estado intermedio.
        localStorage.setItem(TOKEN_KEY, token);

        setState({
            user:            buildUser(decoded),
            token,
            isAuthenticated: true,
        });
    }, []);

    // ── logout ────────────────────────────────────────────────────────
    /**
     * Cierra la sesión completamente:
     * 1. Limpia localStorage y el estado React (resetAuthState)
     * 2. Redirige a /login con replace para que el historial quede limpio
     *
     * Al setState(INITIAL_STATE) con user: null, todos los consumidores
     * del contexto (ProtectedRoute, Navbar, páginas) re-renderizan
     * inmediatamente con user === null — sin datos residuales.
     */
    const logout = useCallback((): void => {
        resetAuthState();
        navigateRef.current('/login', { replace: true });
    }, [resetAuthState]);

    // ── hasRole / hasAnyRole ──────────────────────────────────────────
    const hasRole = useCallback(
        (role: Role): boolean => state.user?.roles.includes(role) ?? false,
        [state.user]
    );

    const hasAnyRole = useCallback(
        (roles: Role[]): boolean =>
            roles.some(r => state.user?.roles.includes(r) ?? false),
        [state.user]
    );

    // ── Valor del contexto — memoizado con useMemo ───────────────────
    //
    // SIN useMemo: AuthProvider vive dentro de BrowserRouter → se re-renderiza
    // en cada navegación → se crea un nuevo objeto `value` → React compara por
    // referencia → detecta "cambio" → re-renderiza TODOS los consumidores del
    // contexto (Navbar, Sidebar, ProtectedRoute, DashboardPage, etc.) aunque
    // user/isAuthenticated NO hayan cambiado. Comportamiento incorrecto.
    //
    // CON useMemo: el objeto `value` solo se recrea cuando state.user,
    // state.token o state.isAuthenticated cambian — es decir, en login/logout.
    // Los consumidores solo re-renderizan cuando el auth state realmente cambia.
    const value = useMemo<AuthContextValue>(
        () => ({
            user:            state.user,
            token:           state.token,
            isAuthenticated: state.isAuthenticated,
            login,
            logout,
            hasRole,
            hasAnyRole,
        }),
        // login/logout/hasRole/hasAnyRole son estables (useCallback) —
        // solo cambian cuando state.user cambia, igual que las props del objeto.
        [state.user, state.token, state.isAuthenticated, login, logout, hasRole, hasAnyRole]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook de consumo del contexto de autenticación.
 * Lanza un error descriptivo si se usa fuera de <AuthProvider>.
 *
 * Exportado aquí para quien prefiera importar desde el contexto;
 * el alias canónico sigue siendo hooks/useAuth.ts.
 */
export function useAuthContext(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error(
            '[NEXUS:useAuthContext] Debe usarse dentro de <AuthProvider>. ' +
            'Comprueba que App.tsx envuelve las rutas con <AuthProvider>.'
        );
    }
    return ctx;
}
