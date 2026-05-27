/**
 * pages/UsuariosPage.tsx — SUFP v2
 * Solo accesible para rol ADMIN.
 *
 * GET /api/usuarios?buscar=&page=&size= → Page<UsuarioDTO>
 * PUT /api/usuarios/{id}/activar | /desactivar
 * POST/DELETE /api/usuarios/{id}/roles — asignar/quitar roles
 */

import { useState, useEffect } from 'react';
import type { PaginatedResponse } from '../types/models';
import { useTableFilters }        from '../hooks/useTableFilters';
import { TableControls, SkeletonRows } from '../components/table/TableControls';
import api from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface UsuarioAdmin {
    id:        number;
    email:     string;
    username:  string;
    /** Spring serializa getIsActive() como "isActive" */
    isActive:  boolean;
    roles:     string[];
}

const ROLES_DISPONIBLES = ['ADMIN','GESTOR_INVENTARIO','CAJERO','MARKETING_ANALYST','CONTABLE'];

// ── Página ────────────────────────────────────────────────────────────────────

export function UsuariosPage(): JSX.Element {

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'usuarios', initialLimit: 20 });
    const { buildParams, setPagination } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,      setRows]      = useState<UsuarioAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast,     setToast]     = useState('');
    // Trigger para re-fetch tras activar/desactivar
    const [refreshKey, setRefreshKey] = useState(0);

    function showToast(msg: string): void {
        setToast(msg); setTimeout(() => setToast(''), 3000);
    }

    // ── Fetch server-side ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        api.get<PaginatedResponse<UsuarioAdmin>>(`/usuarios?${buildParams().toString()}`)
            .then(r => {
                if (!cancelled) {
                    setRows(r.data.content);
                    setPagination(r.data.totalElements, r.data.totalPages);
                }
            })
            .catch(() => {
                if (!cancelled) { setRows([]); setPagination(0, 0); }
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return (): void => { cancelled = true; };
    }, [filters.querySignal, refreshKey, buildParams, setPagination]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    async function toggleActivo(u: UsuarioAdmin): Promise<void> {
        const endpoint = u.isActive ? `/usuarios/${u.id}/desactivar` : `/usuarios/${u.id}/activar`;
        try {
            await api.put(endpoint);
            showToast(`${u.username} ${u.isActive ? 'desactivado' : 'activado'}`);
            setRefreshKey(k => k + 1);
        } catch {
            showToast('Error al actualizar el usuario');
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            {toast && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200, background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-base)', padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-primary)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 0.2s ease both' }}>
                    ✓ {toast}
                </div>
            )}

            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        Gestión de <span style={{ color: 'var(--accent-cyan)' }}>Usuarios</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: '3px', padding: '1px 6px', letterSpacing: '0.08em' }}>
                            🔒 SOLO ADMIN
                        </span>
                    </div>
                </div>
            </div>

            {/* TableControls: búsqueda · filas · paginación */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="usuario"
                    searchPlaceholder="Buscar por email o nombre de usuario..."
                />
            </div>

            {/* Tabla */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                                {['Usuario', 'Email', 'Roles', 'Estado', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && <SkeletonRows rows={Math.min(filters.limit, 8)} cols={5} />}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN USUARIOS'}
                                    </td>
                                </tr>
                            )}

                            {!isLoading && rows.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent-primary),var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--text-inverse)', flexShrink: 0 }}>
                                                {u.username.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                                                {u.username}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)' }}>{u.email}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {ROLES_DISPONIBLES.map(role => {
                                                const tiene = u.roles?.includes(role);
                                                return (
                                                    <span key={role} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.06em', color: tiene ? 'var(--accent-primary)' : 'var(--text-muted)', border: `1px solid ${tiene ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, borderRadius: '3px', padding: '1px 5px', opacity: tiene ? 1 : 0.4 }}>
                                                        {role.replace('_', ' ')}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className={u.isActive ? 'badge badge-green' : 'badge'} style={{ fontSize: '9px' }}>
                                            {u.isActive ? '● ACTIVO' : '○ INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button
                                            onClick={() => toggleActivo(u)}
                                            style={{ background: 'transparent', border: `1px solid ${u.isActive ? 'var(--accent-danger)' : 'var(--accent-primary)'}`, color: u.isActive ? 'var(--accent-danger)' : 'var(--accent-primary)', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                                        >
                                            {u.isActive ? 'DESACTIVAR' : 'ACTIVAR'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
