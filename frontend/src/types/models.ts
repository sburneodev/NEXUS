/**
 * types/models.ts — FE-06
 *
 * Interfaces de dominio para NEXUS ERP.
 * Deben coincidir exactamente con las entidades del backend Java.
 *
 * Uso:
 *   import type { Producto, Cliente, KpiData } from '../types/models';
 */

// ── Roles del sistema ────────────────────────────────────────────────
export type Role =
    | 'ADMIN'
    | 'GESTOR_INVENTARIO'
    | 'CAJERO'
    | 'MARKETING_ANALYST'
    | 'CONTABLE';

// ── Campos de auditoría comunes a todas las entidades ────────────────
interface Auditable {
    id: number;
    creadoEn: string; // ISO 8601 — OffsetDateTime del backend
    actualizadoEn: string;
}

// ── FE-06 · Producto ─────────────────────────────────────────────────
export type TipoProducto = 'ESTANDAR' | 'RETRO';
export type EstadoConservacion = 'MINT' | 'CIB' | 'LOOSE' | 'LOOSE_D';

export interface Producto extends Auditable {
    sku: string;
    nombre: string;
    descripcion: string | null;
    idCategoria: number | null;
    idProveedor: number | null;
    idUbicacion: number | null;
    precioCoste: number;
    precioVenta: number;
    stockActual: number;
    stockMinimo: number;
    stockMaximo: number;
    activo: boolean;
    tipoProducto: TipoProducto;
    estadoConservacion: EstadoConservacion | null;
    atributosEspecificos: Record<string, unknown> | null;
}

// ── FE-06 · Cliente ──────────────────────────────────────────────────
export interface Cliente extends Auditable {
    nombre: string;
    email: string | null;
    telefono: string | null;
    puntosFidelidad: number;
    activo: boolean;
}

// ── FE-06 · Proveedor ────────────────────────────────────────────────
export interface Proveedor extends Auditable {
    razonSocial: string;
    cif: string | null;
    email: string | null;
    telefono: string | null;
    tiempoEntregaDias: number | null;
    activo: boolean;
}

// ── FE-06 · TransaccionStock ─────────────────────────────────────────
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface TransaccionStock extends Auditable {
    idProducto: number;
    idUsuario: number;
    idCliente: number | null;
    idProveedor: number | null;
    tipoMovimiento: TipoMovimiento;
    cantidad: number;
    stockAntes: number;
    stockDespues: number;
    precioUnitario: number | null;
    referencia: string | null;
    notas: string | null;
    fecha: string; // ISO 8601
}

// ── FE-06 · KpiData — datos para el dashboard ───────────────────────
export interface KpiData {
    ventasHoy: number;
    ventasAyer: number;
    clientesActivos: number;
    clientesNuevosSemana: number;
    piezasRetroDisponibles: number;
    productosStockCritico: number;
    /**
     * Datos para el gráfico de línea del dashboard.
     * Cada entrada representa un día con el total de ventas.
     */
    ventasUltimos30Dias: VentaDiaria[];
}

export interface VentaDiaria {
    fecha: string; // "YYYY-MM-DD"
    total: number; // importe total en euros
    unidades: number;
}

// ── Tipos de respuesta paginada del backend ──────────────────────────
export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number; // página actual (0-indexed)
    first: boolean;
    last: boolean;
}

// ── Error estándar del backend ───────────────────────────────────────
export interface ApiError {
    status: number;
    message: string;
    timestamp: string;
    path: string;
}