import api from './api';
import type { PageResponse } from './entidadService';
import type { Producto } from '../types/models';

export type ProductoForm = Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>;

export const productoService = {
    listar: (page = 0, size = 10, tipo?: string, buscar?: string) =>
        api.get<PageResponse<Producto>>('/productos', {
            params: {
                page,
                size,
                tipo: tipo || undefined,
                buscar: buscar || undefined,
            },
        }).then(r => r.data),

    crear: (dto: ProductoForm) =>
        api.post<Producto>('/productos', dto).then(r => r.data),

    editar: (id: number, dto: ProductoForm) =>
        api.put<Producto>(`/productos/${id}`, dto).then(r => r.data),

    eliminar: (id: number) =>
        api.delete(`/productos/${id}`),
};