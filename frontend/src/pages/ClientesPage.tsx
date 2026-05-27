/**
 * pages/ClientesPage.tsx — SUFP v2
 *
 * CRUD completo de Clientes con paginación y búsqueda server-side.
 * · GET   /api/clientes?buscar=&page=&size=  → PaginatedResponse<Cliente>
 * · POST  /api/clientes                      → crea cliente
 * · PUT   /api/clientes/{id}                 → edita cliente
 * · DELETE /api/clientes/{id}                → elimina cliente
 */

import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties }               from 'react';
import type { PaginatedResponse }           from '../types/models';
import { FormModal, FieldConfig }           from '../components/common/FormModal';
import { clienteService, Cliente, ClienteForm } from '../services/entidadService';
import { useTableFilters, calculateAutoLimit }  from '../hooks/useTableFilters';
import { TableControls, SkeletonRows }      from '../components/table/TableControls';
import api                                  from '../services/api';

// ── Campos del formulario ─────────────────────────────────────────────────────

const FIELDS: FieldConfig[] = [
    { key: 'nombre',          label: 'Nombre',          type: 'text',     required: true, placeholder: 'Nombre completo', colSpan: 2 },
    { key: 'email',           label: 'Email',           type: 'email',    placeholder: 'cliente@email.com' },
    { key: 'telefono',        label: 'Teléfono',        type: 'tel',      placeholder: '+34 600 000 000' },
    { key: 'puntosFidelidad', label: 'Puntos Fidelidad',type: 'number',   min: 0 },
    { key: 'activo',          label: 'Cliente activo',  type: 'checkbox' },
];

// ── Página ────────────────────────────────────────────────────────────────────

export function ClientesPage(): JSX.Element {

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'clientes', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination, search: activeSearch, page: activePage, limit: activeLimit } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,       setRows]       = useState<Cliente[]>([]);
    const [isLoading,  setIsLoading]  = useState(true);
    const [modalOpen,  setModalOpen]  = useState(false);
    const [selected,   setSelected]   = useState<Cliente | null>(null);
    const [isSaving,   setIsSaving]   = useState(false);
    const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
    const [toast,      setToast]      = useState('');
    // Trigger para re-fetch tras operaciones CRUD
    const [refreshKey, setRefreshKey] = useState(0);

    function showToast(msg: string): void {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    // ── Fetch server-side ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        api.get<PaginatedResponse<Cliente>>(`/clientes?${buildParams().toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    setRows(data.content);
                    setPagination(data.totalElements, data.totalPages);
                }
            })
            .catch(() => {
                // Fallback: carga todos y filtra localmente
                if (!cancelled) {
                    clienteService.listar(activeSearch, activePage, activeLimit)
                        .then(data => {
                            if (!cancelled) {
                                setRows(data.content);
                                setPagination(data.totalElements, data.totalPages);
                            }
                        })
                        .catch(() => {
                            if (!cancelled) {
                                setRows([]);
                                setPagination(0, 0);
                            }
                        });
                }
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return (): void => { cancelled = true; };
    }, [
        filters.querySignal,
        refreshKey,
        buildParams,
        setPagination,
        activeSearch,
        activePage,
        activeLimit,
    ]);

    // ── Handlers CRUD ─────────────────────────────────────────────────────────

    function handleEdit(cliente: Cliente): void {
        setSelected(cliente); setErrorMsg(null); setModalOpen(true);
    }
    function handleAdd(): void {
        setSelected(null); setErrorMsg(null); setModalOpen(true);
    }
    function handleClose(): void {
        setModalOpen(false); setSelected(null);
    }

    async function handleDelete(cliente: Cliente): Promise<void> {
        if (!window.confirm(`¿Eliminar a ${cliente.nombre}?`)) return;
        try {
            await clienteService.eliminar(cliente.id);
            showToast(`${cliente.nombre} eliminado correctamente`);
            setRefreshKey(k => k + 1);
        } catch {
            showToast('Error al eliminar el cliente');
        }
    }

    async function handleSave(data: Partial<Cliente>): Promise<void> {
        setIsSaving(true); setErrorMsg(null);
        try {
            if (selected) {
                await clienteService.editar(selected.id, data as ClienteForm);
                showToast('Cliente actualizado correctamente');
            } else {
                await clienteService.crear(data as ClienteForm);
                showToast('Cliente creado correctamente');
            }
            handleClose();
            setRefreshKey(k => k + 1);
        } catch {
            setErrorMsg('Error al guardar. Comprueba los datos e inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200, background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-base)', padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'fadeInUp 0.2s ease both' }}>
                    ✓ {toast}
                </div>
            )}

            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        Clientes
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.04em' }}>
                        Gestión de la cartera de clientes
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="btn btn-primary"
                    style={{ letterSpacing: '0.12em', fontSize: '12px', flexShrink: 0 }}
                >
                    + NUEVO CLIENTE
                </button>
            </div>

            {/* TableControls: búsqueda · filas · paginación */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="cliente"
                    searchPlaceholder="Buscar por nombre, email o teléfono..."
                />
            </div>

            {/* Tabla */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                {['Nombre', 'Email', 'Teléfono', 'Puntos', 'Estado', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-elevated)' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && <SkeletonRows rows={Math.min(filters.limit, 8)} cols={6} />}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN CLIENTES'}
                                    </td>
                                </tr>
                            )}

                            {!isLoading && rows.map(c => (
                                <tr
                                    key={c.id}
                                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {c.nombre}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '0.02em' }}>
                                            {c.email ?? '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {c.telefono ?? '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                                            {c.puntosFidelidad ?? 0}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span className={c.activo ? 'badge badge-green' : 'badge'} style={{ fontSize: '9px' }}>
                                            {c.activo ? '● ACTIVO' : '○ INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                        <button
                                            onClick={() => handleEdit(c)}
                                            style={actionBtnStyle('#0088cc')}
                                            title="Editar cliente"
                                        >EDITAR</button>
                                        <button
                                            onClick={() => handleDelete(c)}
                                            style={actionBtnStyle('#cc2244')}
                                            title="Eliminar cliente"
                                        >ELIMINAR</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <FormModal<Cliente>
                isOpen={modalOpen}
                title="Cliente"
                entity={selected}
                fields={FIELDS}
                onClose={handleClose}
                onSave={handleSave}
                isSaving={isSaving}
                errorMsg={errorMsg}
            />
        </div>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const tdStyle: CSSProperties = { padding: '10px 14px', verticalAlign: 'middle' };

function actionBtnStyle(color: string): CSSProperties {
    return {
        fontFamily:    'var(--font-display)',
        fontSize:      '10px',
        fontWeight:    700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding:       '4px 10px',
        background:    'transparent',
        color,
        border:        `1px solid ${color}`,
        borderRadius:  '4px',
        cursor:        'pointer',
        marginRight:   '6px',
        opacity:       0.75,
        transition:    'opacity 120ms ease',
    };
}
