/**
 * types/auth.ts
 * Interfaces de dominio para el módulo de autenticación de NEXUS ERP.
 * Tipado estricto — sin any.
 */

/** Roles disponibles en el sistema (deben coincidir con los de la BD) */
export type Role =
    | 'ADMIN'
    | 'GESTOR_INVENTARIO'
    | 'CAJERO'
    | 'MARKETING_ANALYST'
    | 'CONTABLE';

/** Estructura del payload decodificado del JWT de NEXUS */
export interface DecodedToken {
    /** Email del usuario — es el subject del JWT */
    sub: string;
    /** ID del usuario en la BD */
    userId: number;
    /** Roles separados por coma: "ADMIN,GESTOR_INVENTARIO" */
    roles: string;
    /** Issued At — timestamp de emisión (segundos) */
    iat: number;
    /** Expiration — timestamp de expiración (segundos) */
    exp: number;
}

/** Representación del usuario autenticado en el frontend */
export interface AuthUser {
    email: string;
    userId: number;
    roles: Role[];
}

/** Estado global del módulo de autenticación */
export interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
}

/** Payload que devuelve el backend en POST /auth/login y POST /auth/register */
export interface AuthBackendResponse {
    message: string;
    token: string | null;
    usuario: {
        id: number;
        username: string;
        email: string;
        nombreCompleto: string;
    } | null;
}

/** @deprecated — usar AuthBackendResponse. Mantenido por compatibilidad. */
export type LoginResponse  = AuthBackendResponse;
/** @deprecated — usar AuthBackendResponse. Mantenido por compatibilidad. */
export type RegisterResponse = Pick<AuthBackendResponse, 'message'>;

/** Body para POST /auth/login */
export interface LoginRequest {
    email: string;
    password: string;
}

/** Body para POST /auth/register */
export interface RegisterRequest {
    email: string;
    password: string;
    username?: string;
    nombreCompleto?: string;
}