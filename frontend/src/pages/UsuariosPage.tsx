/**
 * pages/UsuariosPage.tsx — SUFP v2
 * Solo accesible para rol ADMIN.
 *
 * GET  /api/usuarios?buscar=&page=&size= → Page<UsuarioDTO>
 * PUT  /api/usuarios/{id}/activar | /desactivar
 * POST /api/usuarios/{id}/roles   — asignar rol
 * DELETE /api/usuarios/{id}/roles — quitar rol
 */

import { useState, useEffect } from 'react';
import type { PaginatedResponse }      from '../types/models';
import { useTableFilters, calculateAutoLimit } from '../hooks/useTableFilters';
import { TableControls, SkeletonRows } from '../components/table/TableControls';
import { UserRoleManager }             from '../components/usuarios/UserRoleManager';
import { useAuth }                     from '../hooks/useAuth';
import api from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface UsuarioAdmin {
    id:       number;
    email:    string;
    username: string;
    /** Spring serializa getIsActive() como "isActive" */
    isActive: boolean;
    roles:    string[];
}

interface Toast {
    msg:  string;
    type: 'ok' | 'err';
}

// ── Página ────────────────────────────────────────────────────────────────────

export function UsuariosPage(): JSX.Element {

    const { user } = useAuth();

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'usuarios', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,         setRows]         = useState<UsuarioAdmin[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [toast,        setToast]        = useState<Toast | null>(null);
    const [loadingRows,  setLoadingRows]  = useState<Set<number>>(new Set());
    const [confirmModal, setConfirmModal] = useState<UsuarioAdmin | null>(null);
    const [refreshKey,   setRefreshKey]   = useState(0);

    function showToast(msg: string, type: 'ok' | 'err' = 'ok'): void {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    function setRowLoading(id: number, loading: boolean): void {
        setLoadingRows(prev => {
            const next = new Set(prev);
            if (loading) next.add(id); else next.delete(id);
            return next;
        });
    }

    function isSelf(u: UsuarioAdmin): boolean {
        return user?.email === u.email;
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

    function requestToggle(u: UsuarioAdmin): void {
        if (u.isActive) {
            // Self-guard: no se puede desactivar la propia cuenta
            if (isSelf(u)) {
                showToast('No puedes desactivar tu propia cuenta', 'err');
                return;
            }
            // Desactivar → pide confirmación
            setConfirmModal(u);
        } else {
            // Activar → directo, sin modal
            void doToggle(u);
        }
    }

    async function doToggle(u: UsuarioAdmin): Promise<void> {
        setConfirmModal(null);
        setRowLoading(u.id, true);
        const endpoint = u.isActive
            ? `/usuarios/${u.id}/desactivar`
            : `/usuarios/${u.id}/activar`;
        try {
            await api.put(endpoint);
            showToast(`${u.username} ${u.isActive ? 'desactivado' : 'activado'}`);
            setRefreshKey(k => k + 1);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 403) showToast(`Sin permisos para modificar a ${u.username} (403)`, 'err');
            else                showToast(`Error al actualizar a ${u.username}`, 'err');
        } finally {
            setRowLoading(u.id, false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>

            {/* ── Toast ── */}
            {toast && (
                <div style={{
                    position:     'fixed',
                    bottom:       '24px',
                    right:        '24px',
                    zIndex:       300,
                    background:   'var(--bg-elevated)',
                    border:       `1px solid ${toast.type === 'ok' ? 'var(--accent-primary)' : 'var(--accent-danger)'}`,
                    borderRadius: 'var(--radius-base)',
                    padding:      '12px 20px',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '12px',
                    color:        toast.type === 'ok' ? 'var(--accent-primary)' : 'var(--accent-danger)',
                    boxShadow:    'var(--shadow-lg)',
                    animation:    'fadeInUp 0.2s ease both',
                    display:      'flex',
                    gap:          '8px',
                    alignItems:   'center',
                    maxWidth:     '360px',
                }}>
                    <span>{toast.type === 'ok' ? '✓' : '▲'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* ── Modal de confirmación DESACTIVAR ── */}
            {confirmModal && (
                <div
                    onClick={() => setConfirmModal(null)}
                    style={{
                        position:       'fixed',
                        inset:          0,
                        zIndex:         400,
                        background:     'rgba(0,0,0,0.65)',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background:   'var(--bg-surface)',
                            border:       '1px solid var(--accent-danger)',
                            borderRadius: 'var(--radius-lg)',
                            padding:      '28px 32px',
                            maxWidth:     '420px',
                            width:        '90%',
                            boxShadow:    '0 0 40px rgba(248,113,113,0.15)',
                            position:     'relative',
                            overflow:     'hidden',
                        }}
                    >
                        {/* Borde superior rojo */}
                        <div style={{
                            position:   'absolute',
                            top:        0, left: 0, right: 0,
                            height:     '2px',
                            background: 'var(--accent-danger)',
                        }} />

                        <div style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '10px',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color:         'var(--accent-danger)',
                            marginBottom:  '14px',
                        }}>
                            ⚠ Confirmación requerida
                        </div>

                        <h3 style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '17px',
                            fontWeight:    700,
                            letterSpacing: '0.04em',
                            color:         'var(--text-primary)',
                            margin:        '0 0 10px',
                        }}>
                            ¿Desactivar a{' '}
                            <span style={{ color: 'var(--accent-danger)' }}>
                                {confirmModal.username}
                            </span>?
                        </h3>

                        <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize:   '13px',
                            color:      'var(--text-secondary)',
                            lineHeight: 1.65,
                            margin:     '0 0 24px',
                        }}>
                            El usuario{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>
                                {confirmModal.email}
                            </strong>{' '}
                            perderá acceso inmediato al sistema. Podrás reactivar la cuenta desde esta misma pantalla.
                        </p>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="btn btn-ghost"
                                style={{ fontSize: '11px' }}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={() => doToggle(confirmModal)}
                                style={{
                                    background:    'var(--accent-danger)',
                                    color:         '#fff',
                                    border:        '1px solid var(--accent-danger)',
                                    borderRadius:  'var(--radius-base)',
                                    padding:       '6px 18px',
                                    cursor:        'pointer',
                                    fontFamily:    'var(--font-display)',
                                    fontSize:      '11px',
                                    fontWeight:    700,
                                    letterSpacing: '0.10em',
                                    textTransform: 'uppercase',
                                    transition:    'opacity 120ms',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            >
                                DESACTIVAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cabecera ── */}
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

            {/* ── TableControls ── */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="usuario"
                    searchPlaceholder="Buscar por email o nombre de usuario..."
                />
            </div>

            {/* ── Tabla ── */}
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
                        <tbody style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 200ms ease' }}>
                            {isLoading && rows.length === 0 && (
                                <SkeletonRows rows={Math.min(filters.limit, 8)} cols={5} />
                            )}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN USUARIOS'}
                                    </td>
                                </tr>
                            )}

                            {rows.map(u => {
                                const self    = isSelf(u);
                                const rowBusy = loadingRows.has(u.id);

                                return (
                                    <tr
                                        key={u.id}
                                        style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                            transition:   'background 120ms ease, opacity 300ms ease',
                                            opacity:      !u.isActive ? 0.55 : 1,
                                            background:   !u.isActive ? 'rgba(120,120,140,0.04)' : 'transparent',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = !u.isActive ? 'rgba(120,120,140,0.04)' : 'transparent')}
                                    >
                                        {/* ── Usuario ── */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width:          '28px',
                                                    height:         '28px',
                                                    borderRadius:   '50%',
                                                    background:     self
                                                        ? 'linear-gradient(135deg, var(--accent-gold), var(--accent-primary))'
                                                        : 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                                                    display:        'flex',
                                                    alignItems:     'center',
                                                    justifyContent: 'center',
                                                    fontFamily:     'var(--font-display)',
                                                    fontSize:       '11px',
                                                    fontWeight:     700,
                                                    color:          'var(--text-inverse)',
                                                    flexShrink:     0,
                                                }}>
                                                    {u.username.slice(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                                                    {u.username}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ── Email ── */}
                                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)' }}>
                                            {u.email}
                                        </td>

                                        {/* ── Roles (gestor inline) ── */}
                                        <td style={{ padding: '10px 16px', minWidth: '290px' }}>
                                            <UserRoleManager
                                                userId={u.id}
                                                currentRoles={u.roles ?? []}
                                                isSelf={self}
                                                onSuccess={newRoles =>
                                                    setRows(prev =>
                                                        prev.map(r => r.id === u.id ? { ...r, roles: newRoles } : r)
                                                    )
                                                }
                                                onError={msg => showToast(msg, 'err')}
                                            />
                                        </td>

                                        {/* ── Estado ── */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span
                                                className={u.isActive ? 'badge badge-green' : 'badge'}
                                                style={{ fontSize: '9px', transition: 'all 300ms ease' }}
                                            >
                                                {u.isActive ? '● ACTIVO' : '○ INACTIVO'}
                                            </span>
                                        </td>

                                        {/* ── Acciones ── */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <button
                                                onClick={() => requestToggle(u)}
                                                disabled={rowBusy}
                                                style={{
                                                    background:    'transparent',
                                                    border:        `1px solid ${u.isActive ? 'var(--accent-danger)' : 'var(--accent-primary)'}`,
                                                    color:         u.isActive ? 'var(--accent-danger)' : 'var(--accent-primary)',
                                                    borderRadius:  '4px',
                                                    padding:       '4px 10px',
                                                    cursor:        rowBusy ? 'not-allowed' : 'pointer',
                                                    fontFamily:    'var(--font-display)',
                                                    fontSize:      '10px',
                                                    fontWeight:    700,
                                                    letterSpacing: '0.08em',
                                                    textTransform: 'uppercase',
                                                    opacity:       rowBusy ? 0.45 : 1,
                                                    minWidth:      '90px',
                                                    transition:    'opacity 150ms',
                                                }}
                                            >
                                                {rowBusy ? '···' : (u.isActive ? 'DESACTIVAR' : 'ACTIVAR')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
