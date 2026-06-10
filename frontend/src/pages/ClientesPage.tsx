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
import { Pencil, Trash2 }                   from 'lucide-react';
import type { PaginatedResponse }           from '../types/models';
import { FormModal, FieldConfig }           from '../components/common/FormModal';
import { clienteService, Cliente, ClienteForm } from '../services/entidadService';
import { ActionIconBtn }                    from '../components/ui/ActionIconBtn';
import { useTableFilters, calculateAutoLimit }  from '../hooks/useTableFilters';
import { TableControls, SkeletonRows }      from '../components/table/TableControls';
import api                                  from '../services/api';

type ActivoKey = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

// ── Campos del formulario ─────────────────────────────────────────────────────

const FIELDS: FieldConfig[] = [
    { key: 'nombre',          label: 'Nombre',          type: 'text',     required: true, placeholder: 'Nombre completo', colSpan: 2 },
    { key: 'email',           label: 'Email',           type: 'email',    placeholder: 'cliente@email.com' },
    { key: 'telefono',        label: 'Teléfono',        type: 'tel',      placeholder: '+34 600 000 000' },
    { key: 'puntosFidelidad', label: 'Puntos Fidelidad',type: 'number',   min: 0 },
    { key: 'activo',          label: 'Cliente activo',  type: 'checkbox' },
];

// ── Chips de filtro activo/inactivo ───────────────────────────────────────────

function ActivoChips({ value, onChange }: { value: ActivoKey; onChange: (v: ActivoKey) => void }): JSX.Element {
    const OPTIONS: { key: ActivoKey; label: string; color: string }[] = [
        { key: 'TODOS',    label: 'Todos',       color: 'var(--accent-primary)' },
        { key: 'ACTIVOS',  label: '● Activos',   color: '#44cc88' },
        { key: 'INACTIVOS',label: '○ Inactivos', color: 'var(--text-muted)' },
    ];
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {OPTIONS.map(o => {
                const active = value === o.key;
                return (
                    <button
                        key={o.key}
                        onClick={() => onChange(o.key)}
                        style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '10px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            color:         active ? '#0a0a0a' : o.color,
                            background:    active ? o.color : 'transparent',
                            border:        `1px solid ${active ? o.color : 'var(--border-default)'}`,
                            borderRadius:  '4px',
                            padding:       '4px 10px',
                            cursor:        'pointer',
                            transition:    'all 120ms ease',
                            whiteSpace:    'nowrap',
                        }}
                    >{o.label}</button>
                );
            })}
        </div>
    );
}

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
    const [filterActivo,  setFilterActivo]  = useState<ActivoKey>('TODOS');
    const [confirmDelete, setConfirmDelete] = useState<Cliente | null>(null);

    function showToast(msg: string): void {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    // ── Fetch server-side ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const params = buildParams();
        if (filterActivo === 'ACTIVOS')   params.set('activo', 'true');
        if (filterActivo === 'INACTIVOS') params.set('activo', 'false');

        api.get<PaginatedResponse<Cliente>>(`/clientes?${params.toString()}`)
            .then(({ data }) => {
                if (!cancelled) {
                    // El backend puede ignorar el param activo — aplicamos filtro
                    // cliente sobre la respuesta como garantía.
                    const content = data.content ?? [];
                    const filtered = filterActivo === 'TODOS'
                        ? content
                        : content.filter(c =>
                            filterActivo === 'ACTIVOS' ? c.activo === true : c.activo === false
                        );
                    setRows(filtered);
                    // Si filtramos localmente, recalculamos totales
                    if (filterActivo !== 'TODOS') {
                        setPagination(filtered.length, Math.ceil(filtered.length / activeLimit) || 1);
                    } else {
                        setPagination(data.totalElements, data.totalPages);
                    }
                }
            })
            .catch(() => {
                // Fallback: carga todos y filtra localmente
                if (!cancelled) {
                    clienteService.listar(activeSearch, activePage, activeLimit)
                        .then(data => {
                            if (!cancelled) {
                                const content = data.content ?? [];
                                const filtered = filterActivo === 'TODOS'
                                    ? content
                                    : content.filter(c =>
                                        filterActivo === 'ACTIVOS' ? c.activo === true : c.activo === false
                                    );
                                setRows(filtered);
                                setPagination(filtered.length, Math.ceil(filtered.length / activeLimit) || 1);
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
        filterActivo,
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

    function handleDelete(cliente: Cliente): void {
        setConfirmDelete(cliente);
    }

    async function doDelete(): Promise<void> {
        if (!confirmDelete) return;
        const nombre = confirmDelete.nombre;
        setConfirmDelete(null);
        try {
            await clienteService.eliminar(confirmDelete.id);
            showToast(`${nombre} eliminado correctamente`);
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
                <div style={{ position: 'fixed', bottom: '88px', right: '28px', zIndex: 200, background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-base)', padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'fadeInUp 0.2s ease both' }}>
                    ✓ {toast}
                </div>
            )}

            {/* Modal de confirmación eliminar */}
            {confirmDelete && (
                <div
                    onClick={() => setConfirmDelete(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(5,5,15,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '28px 28px 24px', maxWidth: '380px', width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: '18px' }}
                    >
                        {/* Icono + título */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(248,113,113,0.10)', border: '1.5px solid var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                🗑
                            </div>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                                Eliminar cliente
                            </span>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                ¿Confirmas que quieres eliminar a <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.nombre}</strong>? Esta acción no se puede deshacer.
                            </p>
                        </div>
                        {/* Botones */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="btn btn-ghost"
                                style={{ flex: 1, fontSize: '11px', letterSpacing: '0.10em' }}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={doDelete}
                                className="btn"
                                style={{ flex: 1, fontSize: '11px', letterSpacing: '0.10em', background: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', color: '#fff', borderRadius: 'var(--radius-base)', padding: '10px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}
                            >
                                ELIMINAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        Clientes
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.04em' }}>
                        Gestión de la cartera de clientes
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="btn btn-primary"
                    style={{ flexShrink: 0 }}
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
                    extraFilters={
                        <ActivoChips
                            value={filterActivo}
                            onChange={v => { setFilterActivo(v); filters.setPage(0); }}
                        />
                    }
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
                        <tbody style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 200ms ease' }}>
                            {isLoading && rows.length === 0 && <SkeletonRows rows={Math.min(filters.limit, 8)} cols={6} />}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN CLIENTES'}
                                    </td>
                                </tr>
                            )}

                            {rows.map(c => (
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
                                        <span
                                            title="Total de puntos de fidelidad acumulados para canje en tienda"
                                            style={{
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '11px',
                                                fontWeight:    400,
                                                color:         c.puntosFidelidad
                                                                   ? 'var(--text-secondary)'
                                                                   : 'var(--text-muted)',
                                                letterSpacing: '0.02em',
                                                cursor:        'default',
                                            }}
                                        >
                                            {c.puntosFidelidad
                                                ? c.puntosFidelidad.toLocaleString('es-ES')
                                                : '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span className={c.activo ? 'badge badge-green' : 'badge'} style={{ fontSize: '9px' }}>
                                            {c.activo ? '● ACTIVO' : '○ INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <ActionIconBtn icon={Pencil}  color="cyan"   title="Editar cliente"    onClick={() => handleEdit(c)} />
                                            <ActionIconBtn icon={Trash2}  color="danger"                   title="Eliminar cliente"  onClick={() => handleDelete(c)} />
                                        </div>
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
