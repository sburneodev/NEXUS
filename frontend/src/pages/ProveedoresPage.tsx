/**
 * pages/ProveedoresPage.tsx — SUFP v2
 *
 * CRUD completo de Proveedores con paginación, búsqueda server-side
 * y filtro activo / inactivo.
 * · GET   /api/proveedores?buscar=&activo=&page=&size=
 * · POST  /api/proveedores
 * · PUT   /api/proveedores/{id}
 * · DELETE /api/proveedores/{id}
 */

import { useState, useEffect } from 'react';
import type { CSSProperties }  from 'react';
import { FormModal, FieldConfig }           from '../components/common/FormModal';
import { proveedorService, Proveedor, ProveedorForm } from '../services/entidadService';
import { useTableFilters, calculateAutoLimit }  from '../hooks/useTableFilters';
import { TableControls, SkeletonRows }      from '../components/table/TableControls';

// ── Campos del formulario ─────────────────────────────────────────────────────

const FIELDS: FieldConfig[] = [
    { key: 'razonSocial',    label: 'Razón Social',          type: 'text',     required: true, placeholder: 'Empresa S.L.', colSpan: 2 },
    { key: 'cif',            label: 'CIF / NIF',             type: 'text',     placeholder: 'B12345678' },
    { key: 'email',          label: 'Email',                 type: 'email',    placeholder: 'contacto@empresa.com' },
    { key: 'telefono',       label: 'Teléfono',              type: 'tel',      placeholder: '+34 900 000 000' },
    { key: 'tiempoEntregaD', label: 'Tiempo entrega (días)', type: 'number',   min: 0, max: 365 },
    { key: 'direccion',      label: 'Dirección',             type: 'textarea', colSpan: 2 },
    { key: 'activo',         label: 'Proveedor activo',      type: 'checkbox' },
];

// ── Filtro activo ─────────────────────────────────────────────────────────────

type ActivoKey = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

function ActivoChips({ value, onChange }: { value: ActivoKey; onChange: (v: ActivoKey) => void }): JSX.Element {
    const OPTIONS: { key: ActivoKey; label: string; color: string }[] = [
        { key: 'TODOS',     label: 'Todos',       color: 'var(--text-muted)' },
        { key: 'ACTIVOS',   label: '● Activos',   color: '#44cc88' },
        { key: 'INACTIVOS', label: '○ Inactivos', color: 'var(--text-muted)' },
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

export function ProveedoresPage(): JSX.Element {

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'proveedores', initialLimit: calculateAutoLimit() });
    const { setPagination, search: activeSearch, page: activePage, limit: activeLimit } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,         setRows]         = useState<Proveedor[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [filterActivo, setFilterActivo] = useState<ActivoKey>('TODOS');
    const [modalOpen,    setModalOpen]    = useState(false);
    const [selected,     setSelected]     = useState<Proveedor | null>(null);
    const [isSaving,     setIsSaving]     = useState(false);
    const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
    const [toast,        setToast]        = useState('');
    const [refreshKey,   setRefreshKey]   = useState(0);

    function showToast(msg: string): void {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────
    // El endpoint /proveedores devuelve un array plano (no paginado), así que
    // cargamos todo y filtramos / paginamos en cliente.
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        proveedorService.listar()
            .then((all: Proveedor[]) => {
                if (!cancelled) {
                    const q = activeSearch.toLowerCase();
                    const filtered = all.filter(p => {
                        const matchSearch = !q
                            || p.razonSocial.toLowerCase().includes(q)
                            || (p.cif   ?? '').toLowerCase().includes(q)
                            || (p.email ?? '').toLowerCase().includes(q);
                        const matchActivo = filterActivo === 'TODOS'
                            || (filterActivo === 'ACTIVOS' ? p.activo === true : p.activo === false);
                        return matchSearch && matchActivo;
                    });
                    const total    = filtered.length;
                    const pageData = filtered.slice(activePage * activeLimit, (activePage + 1) * activeLimit);
                    setRows(pageData);
                    setPagination(total, Math.ceil(total / activeLimit) || 1);
                }
            })
            .catch(() => {
                if (!cancelled) { setRows([]); setPagination(0, 0); }
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return (): void => { cancelled = true; };
    }, [
        filters.querySignal,
        filterActivo,
        refreshKey,
        setPagination,
        activeSearch,
        activePage,
        activeLimit,
    ]);

    // ── Handlers CRUD ─────────────────────────────────────────────────────────

    function handleEdit(p: Proveedor): void   { setSelected(p); setErrorMsg(null); setModalOpen(true); }
    function handleAdd(): void                { setSelected(null); setErrorMsg(null); setModalOpen(true); }
    function handleClose(): void              { setModalOpen(false); setSelected(null); }

    async function handleDelete(p: Proveedor): Promise<void> {
        if (!window.confirm(`¿Eliminar a ${p.razonSocial}?`)) return;
        try {
            await proveedorService.eliminar(p.id);
            showToast(`${p.razonSocial} eliminado correctamente`);
            setRefreshKey(k => k + 1);
        } catch {
            showToast('Error al eliminar el proveedor');
        }
    }

    async function handleSave(data: Partial<Proveedor>): Promise<void> {
        setIsSaving(true); setErrorMsg(null);
        try {
            if (selected) {
                await proveedorService.editar(selected.id, data as ProveedorForm);
                showToast('Proveedor actualizado correctamente');
            } else {
                await proveedorService.crear(data as ProveedorForm);
                showToast('Proveedor creado correctamente');
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        Proveedores
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        {isLoading
                            ? 'Cargando...'
                            : `${filters.totalItems.toLocaleString('es-ES')} proveedor${filters.totalItems !== 1 ? 'es' : ''} encontrado${filters.totalItems !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="btn btn-primary"
                    style={{ letterSpacing: '0.12em', fontSize: '12px', flexShrink: 0 }}
                >
                    + NUEVO PROVEEDOR
                </button>
            </div>

            {/* TableControls */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="proveedor"
                    searchPlaceholder="Buscar por nombre, CIF o email..."
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
                                {['Razón Social', 'CIF', 'Email', 'Teléfono', 'Entrega', 'Estado', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-elevated)' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 200ms ease' }}>
                            {isLoading && rows.length === 0 && <SkeletonRows rows={Math.min(filters.limit, 8)} cols={7} />}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN PROVEEDORES'}
                                    </td>
                                </tr>
                            )}

                            {rows.map(p => (
                                <tr
                                    key={p.id}
                                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {p.razonSocial}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', letterSpacing: '0.06em' }}>
                                            {p.cif ?? '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {p.email ?? '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {p.telefono ?? '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: p.tiempoEntregaD !== null ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                            {p.tiempoEntregaD !== null ? `${p.tiempoEntregaD}d` : '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span className={p.activo ? 'badge badge-green' : 'badge'} style={{ fontSize: '9px' }}>
                                            {p.activo ? '● ACTIVO' : '○ INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                        <button onClick={() => handleEdit(p)} style={actionBtnStyle('#0088cc')} title="Editar proveedor">EDITAR</button>
                                        <button onClick={() => handleDelete(p)} style={actionBtnStyle('#cc2244')} title="Eliminar proveedor">ELIMINAR</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <FormModal<Proveedor>
                isOpen={modalOpen}
                title="Proveedor"
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
