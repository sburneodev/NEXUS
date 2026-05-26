import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/models';

/**
 * ProtectedRoute — FE-07
 *
 * Componente barrera que protege rutas privadas del ERP.
 *
 * Comportamiento:
 *   1. Si no hay token válido → redirige a /login guardando la ruta
 *      original en `state.from` para poder volver tras el login.
 *   2. Si se especifican `allowedRoles` y el usuario no tiene ninguno
 *      → redirige a /unauthorized (o al dashboard si no existe aún).
 *   3. Si todo está OK → renderiza <Outlet /> (las rutas hijas).
 *
 * Uso en App.tsx:
 *
 *   // Proteger todas las rutas del Layout:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<Layout />}>
 *       <Route path="/dashboard" element={<DashboardPage />} />
 *       ...
 *     </Route>
 *   </Route>
 *
 *   // Proteger solo rutas de ADMIN:
 *   <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
 *     <Route path="/usuarios" element={<UsuariosPage />} />
 *   </Route>
 */

interface ProtectedRouteProps {
    /**
     * Roles que pueden acceder a estas rutas.
     * Si no se especifica, cualquier usuario autenticado puede acceder.
     */
    allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps): JSX.Element {
    const { isAuthenticated, hasAnyRole } = useAuth();
    const location = useLocation();

    // ── 1. Sin autenticación → login ─────────────────────────────────
    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                state={{ from: location }}
                replace
            />
        );
    }

    // ── 2. Sin rol permitido → sin autorización ───────────────────────
    if (allowedRoles !== undefined && allowedRoles.length > 0) {
        if (!hasAnyRole(allowedRoles)) {
            return (
                <Navigate
                    to="/dashboard"
                    state={{ from: location }}
                    replace
                />
            );
        }
    }

    // ── 3. Todo correcto → renderizar rutas hijas ─────────────────────
    return <Outlet />;
}
