/**
 * services/entidadService.ts — UI-09
 *
 * Servicios CRUD para Clientes y Proveedores.
 * Llama directamente a la instancia Axios centralizada (api.ts).
 * Tipado estricto — sin any.
 */

import api from './api';

// ── Interfaces de dominio ─────────────────────────────────────────────

export interface Cliente {
    id:              number;
    nombre:          string;
    email:           string | null;
    telefono:        string | null;
    puntosFidelidad: number;
    activo:          boolean;
    creadoEn:        string;
    actualizadoEn:   string;
}

export interface Proveedor {
    id:              number;
    razonSocial:     string;
    cif:             string | null;
    email:           string | null;
    telefono:        string | null;
    direccion:       string | null;
    tiempoEntregaD:  number | null;
    activo:          boolean;
}

/** Respuesta paginada del backend Spring (Page<T>) */
export interface PageResponse<T> {
    content:          T[];
    totalElements:    number;
    totalPages:       number;
    size:             number;
    number:           number;
    first:            boolean;
    last:             boolean;
}

// ── Formularios (sin campos de auditoría) ────────────────────────────

export type ClienteForm = Omit<Cliente, 'id' | 'creadoEn' | 'actualizadoEn'>;
export type ProveedorForm = Omit<Proveedor, 'id'>;

// ── Servicio de Clientes ─────────────────────────────────────────────

export const clienteService = {
    listar: (buscar = '', page = 0, size = 10) =>
        api.get<PageResponse<Cliente>>('/clientes', {
            params: { buscar: buscar || undefined, page, size },
        }).then(r => r.data),

    buscarPorId: (id: number) =>
        api.get<Cliente>(`/clientes/${id}`).then(r => r.data),

    crear: (dto: ClienteForm) =>
        api.post<Cliente>('/clientes', dto).then(r => r.data),

    editar: (id: number, dto: ClienteForm) =>
        api.put<Cliente>(`/clientes/${id}`, dto).then(r => r.data),

    eliminar: (id: number) =>
        api.delete(`/clientes/${id}`),
};

// ── Servicio de Proveedores ──────────────────────────────────────────

export const proveedorService = {
    listar: () =>
        api.get<Proveedor[]>('/proveedores').then(r => r.data),

    buscarPorId: (id: number) =>
        api.get<Proveedor>(`/proveedores/${id}`).then(r => r.data),

    crear: (dto: ProveedorForm) =>
        api.post<Proveedor>('/proveedores', dto).then(r => r.data),

    editar: (id: number, dto: ProveedorForm) =>
        api.put<Proveedor>(`/proveedores/${id}`, dto).then(r => r.data),

    eliminar: (id: number) =>
        api.delete(`/proveedores/${id}`),
};