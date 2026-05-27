/**
 * pages/AuditoriaPage.tsx — SUFP v2
 * Solo accesible para rol ADMIN.
 *
 * GET /api/audit?buscar=&operacion=&page=&size= → PaginatedResponse<AuditEntry>
 */

import { useState, useEffect } from 'react';
import type { PaginatedResponse }      from '../types/models';
import { useTableFilters }             from '../hooks/useTableFilters';
import { TableControls, SkeletonRows } from '../components/table/TableControls';
import api from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
    id:           number;
    usuarioEmail: string;
    accion:       string;
    entidad:      string;
    entidadId:    number | null;
    detalles:     string | null;
    timestamp:    string;
    ip:           string | null;
}

// ── Datos mock para desarrollo sin backend ─────────────────────────────────
const MOCK_AUDIT: AuditEntry[] = [
    { id: 1, usuarioEmail: 'admin@levelupnexus.es',  accion: 'LOGIN',  entidad: 'AUTH',     entidadId: null, detalles: 'Inicio de sesión exitoso',     timestamp: new Date(Date.now() - 300000).toISOString(),  ip: '192.168.1.100' },
    { id: 2, usuarioEmail: 'gestor@levelupnexus.es', accion: 'CREATE', entidad: 'PRODUCTO', entidadId: 42,   detalles: 'Nuevo producto STD-PS5-042',    timestamp: new Date(Date.now() - 600000).toISOString(),  ip: '192.168.1.101' },
    { id: 3, usuarioEmail: 'cajero@levelupnexus.es', accion: 'UPDATE', entidad: 'STOCK',    entidadId: 15,   detalles: 'Stock actualizado: 10 → 8',     timestamp: new Date(Date.now() - 1200000).toISOString(), ip: '192.168.1.102' },
    { id: 4, usuarioEmail: 'admin@levelupnexus.es',  accion: 'DELETE', entidad: 'CLIENTE',  entidadId: 7,    detalles: 'Soft delete cliente ID 7',      timestamp: new Date(Date.now() - 3600000).toISOString(), ip: '192.168.1.100' },
    { id: 5, usuarioEmail: 'admin@levelupnexus.es',  accion: 'LOGOUT', entidad: 'AUTH',     entidadId: null, detalles: 'Cierre de sesión',              timestamp: new Date(Date.now() - 7200000).toISOString(), ip: '192.168.1.100' },
];

const ACCION_COLOR: Record<string, string> = {
    LOGIN:  'var(--accent-primary)',
    CREATE: 'var(--accent-cyan)',
    UPDATE: 'var(--accent-gold)',
    DELETE: 'var(--accent-danger)',
    LOGOUT: 'var(--text-muted)',
};

// ── Filtros de acción ─────────────────────────────────────────────────────────
const ACCIONES = ['', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE'] as const;

// ── Página ────────────────────────────────────────────────────────────────────

export function AuditoriaPage(): JSX.Element {

    // ── SUFP ──────────────────────────────────────────────────────────────────
    const filters = useTableFilters({ key: 'auditoria', initialLimit: 50 });
    const { buildParams, setPagination } = filters;

    // ── Estado local ──────────────────────────────────────────────────────────
    const [rows,      setRows]      = useState<AuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Filtro de acción (se envía como parámetro `operacion` al backend)
    const [filterAccion, setFilterAccion] = useState('');

    // ── Fetch server-side ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const params = buildParams();
        if (filterAccion) params.set('operacion', filterAccion);

        // Endpoint correcto: GET /api/audit (no /audit/log)
        api.get<PaginatedResponse<AuditEntry>>(`/audit?${params.toString()}`)
            .then(r => {
                if (!cancelled) {
                    setRows(r.data.content);
                    setPagination(r.data.totalElements, r.data.totalPages);
                }
            })
            .catch(() => {
                // Fallback: datos mock filtrados localmente
                if (!cancelled) {
                    let mock = MOCK_AUDIT;
                    if (filterAccion)       mock = mock.filter(e => e.accion === filterAccion);
                    if (filters.search)     mock = mock.filter(e =>
                        e.usuarioEmail.includes(filters.search.toLowerCase()) ||
                        e.entidad.toLowerCase().includes(filters.search.toLowerCase()) ||
                        (e.detalles ?? '').toLowerCase().includes(filters.search.toLowerCase())
                    );
                    const size    = filters.limit;
                    const pg      = filters.page;
                    const total   = mock.length;
                    const pages   = Math.ceil(total / size) || 1;
                    const content = mock.slice(pg * size, (pg + 1) * size);
                    setRows(content);
                    setPagination(total, pages);
                }
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return (): void => { cancelled = true; };
    }, [
        filters.querySignal,
        filterAccion,
        buildParams,
        setPagination,
        filters.search,
        filters.page,
        filters.limit,
    ]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Cabecera */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                    Log de <span style={{ color: 'var(--accent-gold)' }}>Auditoría</span>
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: '3px', padding: '1px 6px', letterSpacing: '0.08em' }}>
                        🔒 SOLO ADMIN
                    </span>
                </div>
            </div>

            {/* Filtros de acción */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {ACCIONES.map(f => (
                    <button
                        key={f}
                        onClick={() => { setFilterAccion(f); filters.setPage(0); }}
                        style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '10px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            padding:       '5px 12px',
                            background:    filterAccion === f ? 'var(--accent-gold)' : 'transparent',
                            color:         filterAccion === f ? 'var(--text-inverse)' : 'var(--text-secondary)',
                            border:        `1px solid ${filterAccion === f ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                            borderRadius:  '4px',
                            cursor:        'pointer',
                            transition:    'all 120ms ease',
                        }}
                    >
                        {f || 'TODOS'}
                    </button>
                ))}
            </div>

            {/* TableControls: búsqueda libre · filas · paginación */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="evento"
                    searchPlaceholder="Buscar por usuario, entidad o detalles..."
                />
            </div>

            {/* Tabla */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                                {['Timestamp', 'Usuario', 'Acción', 'Entidad', 'Detalles', 'IP'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && <SkeletonRows rows={Math.min(filters.limit, 10)} cols={6} />}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN REGISTROS'}
                                    </td>
                                </tr>
                            )}

                            {!isLoading && rows.map(e => (
                                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}
                                    onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {new Date(e.timestamp).toLocaleString('es-ES')}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)' }}>{e.usuarioEmail}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: ACCION_COLOR[e.accion] ?? 'var(--text-primary)', border: `1px solid ${ACCION_COLOR[e.accion] ?? 'var(--border-default)'}`, borderRadius: '3px', padding: '2px 6px' }}>
                                            {e.accion}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {e.entidad}{e.entidadId ? ` #${e.entidadId}` : ''}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', maxWidth: '300px' }}>
                                        {e.detalles ?? '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {e.ip ?? '—'}
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
