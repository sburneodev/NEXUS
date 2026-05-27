/**
 * hooks/useAuth.ts — v2 (Context consumer)
 *
 * ── QUÉ CAMBIÓ Y POR QUÉ ─────────────────────────────────────────
 *
 * ANTES: Este hook usaba useState propio → cada componente tenía su
 *   propio estado independiente. Cuando login() se llamaba en LoginPage,
 *   Navbar y ProtectedRoute no se enteraban → bug de nombre residual.
 *
 * AHORA: Este hook es un thin wrapper de AuthContext. Un único estado
 *   compartido via React Context. Todos los consumidores ven el mismo
 *   user/isAuthenticated al mismo tiempo, sin condiciones de carrera.
 *
 * ── API PÚBLICA IDÉNTICA ──────────────────────────────────────────
 *
 * Todos los componentes que usan useAuth() siguen funcionando sin
 * cambios: Navbar, ProtectedRoute, DashboardPage, etc.
 * Solo App.tsx necesita añadir <AuthProvider> dentro de <BrowserRouter>.
 */

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { AuthUser } from '../types/auth';
import type { Role } from '../types/auth';

// Re-exportar el tipo por compatibilidad con importaciones existentes
export type { Role };

export interface UseAuthReturn {
    /** Usuario actualmente autenticado, o null si no hay sesión activa. */
    user: AuthUser | null;
    /** JWT crudo recibido del backend, o null. */
    token: string | null;
    /** true si hay sesión con token válido y no expirado. */
    isAuthenticated: boolean;
    /**
     * Inicia sesión guardando el JWT.
     * Actualiza el estado global — todos los consumidores reaccionan.
     * @param token JWT recibido del backend en POST /auth/login
     */
    login: (token: string) => void;
    /**
     * Cierra la sesión completamente.
     * Limpia localStorage, resetea user a null y redirige a /login.
     * Al ser Context, ProtectedRoute detecta isAuthenticated: false
     * de inmediato y redirige sin condición de carrera.
     */
    logout: () => void;
    /** Comprueba si el usuario tiene un rol concreto. */
    hasRole: (role: Role) => boolean;
    /** Comprueba si el usuario tiene alguno de los roles indicados. */
    hasAnyRole: (roles: Role[]) => boolean;
}

/**
 * Hook principal de autenticación de NEXUS ERP.
 *
 * Requiere que el árbol de componentes esté envuelto con <AuthProvider>
 * (configurado en App.tsx dentro de <BrowserRouter>).
 *
 * @throws Error si se usa fuera de <AuthProvider>
 */
export function useAuth(): UseAuthReturn {
    const ctx = useContext(AuthContext);

    if (!ctx) {
        throw new Error(
            '[NEXUS:useAuth] useAuth() debe usarse dentro de <AuthProvider>.\n' +
            'Verifica que App.tsx envuelve las rutas con <AuthProvider>:\n\n' +
            '  <BrowserRouter>\n' +
            '    <AuthProvider>   ← aquí\n' +
            '      <Routes>...\n' +
            '    </AuthProvider>\n' +
            '  </BrowserRouter>'
        );
    }

    return ctx;
}
