/**
 * pages/AuditoriaPage.tsx — SUFP v3
 * Solo accesible para rol ADMIN.
 *
 * GET /api/audit?buscar=&operacion=&tabla=&page=&size= → PaginatedResponse<AuditEntry>
 */

import { useState, useEffect, useRef } from 'react';
import { useTheme }                    from '../hooks/useTheme';
import type { PaginatedResponse }      from '../types/models';
import { useTableFilters, calculateAutoLimit } from '../hooks/useTableFilters';
import { TableControls, SkeletonRows } from '../components/table/TableControls';
import api from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
    id:           number;
    usuarioEmail: string;
    accion:       string;
    entidad:      string;
    entidadId:    string | null;   // TEXT en BD
    detalles:     string | null;
    timestamp:    string;
    ip:           string | null;
}

// ── Grupos de filtro ──────────────────────────────────────────────────────────

type FiltroGrupo = {
    label: string;
    value: string;
    field: 'operacion' | 'tabla';
};

const GRUPOS_ACCION: FiltroGrupo[] = [
    { label: 'TODOS',    value: '',               field: 'operacion' },
    { label: 'ACCESO',   value: 'AUTH',           field: 'tabla'     }, // LOGIN + REGISTER + LOGOUT + VERIFY
    { label: 'CREAR',    value: 'CREATE',         field: 'operacion' },
    { label: 'EDITAR',   value: 'UPDATE',         field: 'operacion' },
    { label: 'ELIMINAR', value: 'DELETE',         field: 'operacion' },
    { label: 'USUARIOS', value: 'ACTIVATE',       field: 'operacion' },
    { label: 'ROLES',    value: 'ROLE_ASSIGN',    field: 'operacion' },
    { label: 'STOCK',    value: 'STOCK_MOVEMENT', field: 'operacion' },
    { label: 'IA',       value: 'AI_QUERY',       field: 'operacion' },
    { label: 'SISTEMA',  value: 'BACKUP_EXPORT',  field: 'operacion' },
];

// ── Colores y etiquetas de acción ─────────────────────────────────────────────

const ACCION_COLOR: Record<string, string> = {
    LOGIN:          'var(--accent-primary)',
    LOGOUT:         'var(--text-muted)',
    REGISTER:       'var(--accent-cyan)',
    VERIFY_EMAIL:   'var(--accent-cyan)',
    CREATE:         'var(--accent-primary)',
    INSERT:         'var(--accent-primary)',
    UPDATE:         'var(--accent-gold)',
    DELETE:         'var(--accent-danger)',
    ACTIVATE:       'var(--accent-primary)',
    DEACTIVATE:     'var(--accent-danger)',
    ROLE_ASSIGN:    'var(--accent-gold)',
    ROLE_REMOVE:    'var(--accent-danger)',
    STOCK_MOVEMENT: 'var(--accent-cyan)',
    AI_QUERY:       '#A78BFA',
    BACKUP_EXPORT:  '#8B5CF6',
    BACKUP_RESTORE: 'var(--accent-danger)',
    CHANGE_PASSWORD:'var(--accent-gold)',
};

const ACCION_LABEL: Record<string, string> = {
    LOGIN:          'LOGIN',
    LOGOUT:         'LOGOUT',
    REGISTER:       'REGISTRO',
    VERIFY_EMAIL:   'VERIFICACIÓN',
    CREATE:         'CREAR',
    INSERT:         'INSERTAR',
    UPDATE:         'MODIFICAR',
    DELETE:         'ELIMINAR',
    ACTIVATE:       'ACTIVAR',
    DEACTIVATE:     'DESACTIVAR',
    ROLE_ASSIGN:    'ROL+',
    ROLE_REMOVE:    'ROL−',
    STOCK_MOVEMENT:  'STOCK',
    AI_QUERY:        'IA QUERY',
    BACKUP_EXPORT:   'BACKUP',
    BACKUP_RESTORE:  'RESTAURAR',
    CHANGE_PASSWORD: 'CONTRASEÑA',
};

// ── Helpers de renderizado ────────────────────────────────────────────────────

/**
 * Normaliza IPs de loopback IPv6 a formato legible.
 * El backend puede devolver "0:0:0:0:0:0:0:1" o "::1" cuando
 * la petición viene de localhost (acceso local).
 */
function formatIp(ip: string | null): JSX.Element | string {
    if (!ip) return '—';
    if (ip === '0:0:0:0:0:0:0:1' || ip === '::1') {
        return (
            <span title="Conexión local (localhost)">
                127.0.0.1
            </span>
        );
    }
    return ip;
}

/**
 * Celda de entidad: para eventos AUTH no hay entidad concreta,
 * mostramos "sistema" en cursiva en lugar de "AUTH".
 */
function renderEntidad(e: AuditEntry): JSX.Element {
    if (e.entidad === 'AUTH') {
        return (
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '11px',
                color:      'var(--text-muted)',
                fontStyle:  'italic',
            }}>
                sistema
            </span>
        );
    }
    return (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {e.entidad}
            {e.entidadId && (
                <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>#{e.entidadId}</span>
            )}
        </span>
    );
}

/**
 * Celda de detalles con renderizado especial para LOGIN:
 *   "Login exitoso | roles: ADMIN,GESTOR_INVENTARIO"
 * → status text + role badges dorados
 */
function renderDetalles(e: AuditEntry): JSX.Element | string {
    if (!e.detalles) return '—';

    const isFailed = e.detalles.toLowerCase().includes('fallido');

    // LOGIN exitoso: extrae roles del campo detalles — todo en línea, misma altura que el resto
    if (e.accion === 'LOGIN' && e.detalles.includes('| roles:')) {
        const sepIdx    = e.detalles.indexOf('| roles:');
        const status    = e.detalles.slice(0, sepIdx).trim();
        const rolesPart = e.detalles.slice(sepIdx + 8).trim(); // skip "| roles:"
        const allRoles  = rolesPart.split(',').map(r => r.trim()).filter(Boolean);
        // Si el usuario tiene ADMIN, solo mostramos ADMIN (oculta roles secundarios)
        const roles     = allRoles.includes('ADMIN') ? ['ADMIN'] : allRoles;
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {status}
                </span>
                {roles.map(role => (
                    <span key={role} style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '9px',
                        fontWeight:    700,
                        letterSpacing: '0.06em',
                        color:         'var(--accent-gold)',
                        border:        '1px solid var(--accent-gold)',
                        borderRadius:  '3px',
                        padding:       '1px 5px',
                        whiteSpace:    'nowrap',
                        lineHeight:    '1.4',
                    }}>
                        {role}
                    </span>
                ))}
            </span>
        );
    }

    // Resto de eventos (incluidos intentos fallidos)
    return (
        <span style={{
            fontFamily: 'var(--font-body)',
            fontSize:   '12px',
            color:      isFailed ? 'var(--accent-danger)' : 'var(--text-primary)',
        }}>
            {e.detalles}
        </span>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────

export function AuditoriaPage(): JSX.Element {

    const { isDark } = useTheme();

    const filters = useTableFilters({ key: 'auditoria', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination } = filters;

    const [rows,        setRows]        = useState<AuditEntry[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [filterGrupo, setFilterGrupo] = useState<FiltroGrupo>(GRUPOS_ACCION[0]);
    // fadeKey cambia con cada respuesta → fuerza re-montaje del tbody → animación CSS
    const [fadeKey,     setFadeKey]     = useState(0);

    // Refs para controlar el indicador de carga sin parpadeo
    const isFirstLoadRef   = useRef(true);   // primera carga: skeleton inmediato
    const loadingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;

        // Cancelar cualquier timer pendiente del ciclo anterior
        if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
        }

        if (isFirstLoadRef.current) {
            // Primera carga: skeleton visible de inmediato
            setIsLoading(true);
            isFirstLoadRef.current = false;
        } else {
            // Cargas posteriores: esperar 120 ms antes de mostrar la barra.
            // Si la respuesta llega antes (localhost ~10-50 ms), el indicador
            // nunca aparece y el usuario solo ve el contenido actualizarse.
            loadingTimerRef.current = setTimeout(() => {
                if (!cancelled) setIsLoading(true);
            }, 120);
        }

        const params = buildParams();
        if (filterGrupo.value) {
            params.set(filterGrupo.field, filterGrupo.value);
        }

        api.get<PaginatedResponse<AuditEntry>>(`/audit?${params.toString()}`)
            .then(r => {
                if (!cancelled) {
                    setRows(r.data.content);
                    setPagination(r.data.totalElements, r.data.totalPages);
                    setFadeKey(k => k + 1);
                }
            })
            .catch(() => {
                if (!cancelled) { setRows([]); setPagination(0, 0); setFadeKey(k => k + 1); }
            })
            .finally(() => {
                if (loadingTimerRef.current) {
                    clearTimeout(loadingTimerRef.current);
                    loadingTimerRef.current = null;
                }
                if (!cancelled) setIsLoading(false);
            });

        return (): void => {
            cancelled = true;
            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
                loadingTimerRef.current = null;
            }
        };
    }, [
        filters.querySignal,
        filterGrupo,
        buildParams,
        setPagination,
    ]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Keyframes: barra de progreso + fade de filas nuevas */}
            <style>{`
                @keyframes audit-scan {
                    0%   { background-position: -200% 0; }
                    100% { background-position:  200% 0; }
                }
                @keyframes audit-fade-in {
                    from { opacity: 0; transform: translateY(3px); }
                    to   { opacity: 1; transform: translateY(0);   }
                }
            `}</style>

            {/* Cabecera */}
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                    Log de{' '}
                    <span style={{
                        background:           isDark
                            ? 'linear-gradient(110deg, #FCD34D 0%, #F59E0B 100%)'
                            : 'linear-gradient(110deg, #B45309 0%, #78350F 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor:  'transparent',
                        backgroundClip:       'text',
                    }}>Auditoría</span>
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: '3px', padding: '1px 6px', letterSpacing: '0.08em' }}>
                        🔒 SOLO ADMIN
                    </span>
                </div>
            </div>

            {/* Filtros rápidos por grupo */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {GRUPOS_ACCION.map(g => {
                    const isActive = filterGrupo.value === g.value && filterGrupo.field === g.field;
                    return (
                        <button
                            key={g.label}
                            onClick={() => { setFilterGrupo(g); filters.setPage(0); }}
                            style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '10px',
                                fontWeight:    700,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                padding:       '5px 12px',
                                background:    isActive ? 'var(--accent-gold)' : 'transparent',
                                color:         isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                                border:        `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                                borderRadius:  '4px',
                                cursor:        'pointer',
                                transition:    'all 120ms ease',
                            }}
                        >
                            {g.label}
                        </button>
                    );
                })}
            </div>

            {/* Búsqueda + paginación */}
            <div style={{ marginBottom: '16px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="evento"
                    searchPlaceholder="Buscar por usuario, entidad, acción o detalles..."
                />
            </div>

            {/* Tabla */}
            <div style={{ position: 'relative', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

                {/*
                  Barra de progreso: solo aparece cuando hay datos previos y se está
                  recargando. Así el usuario ve su contenido actual sin degradado
                  mientras llegan los nuevos resultados.
                */}
                {isLoading && rows.length > 0 && (
                    <div style={{
                        position:       'absolute',
                        top:            0,
                        left:           0,
                        right:          0,
                        height:         '2px',
                        background:     'linear-gradient(90deg, transparent 0%, var(--accent-cyan) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation:      'audit-scan 1.2s ease infinite',
                        zIndex:         10,
                        pointerEvents:  'none',
                    }} />
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                                {['Fecha y hora', 'Usuario', 'Acción', 'Entidad', 'Detalles', 'IP'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody key={fadeKey} style={{ animation: 'audit-fade-in 160ms ease both' }}>
                            {/* Skeleton solo en la primera carga (sin datos previos) */}
                            {isLoading && rows.length === 0 && (
                                <SkeletonRows rows={Math.min(filters.limit, 10)} cols={6} />
                            )}

                            {/* Sin resultados */}
                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search
                                            ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"`
                                            : 'SIN REGISTROS DE AUDITORÍA'}
                                    </td>
                                </tr>
                            )}

                            {/* Filas de datos */}
                            {rows.map(e => {
                                const color = ACCION_COLOR[e.accion] ?? 'var(--text-secondary)';
                                return (
                                    <tr
                                        key={e.id}
                                        style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}
                                        onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-overlay)')}
                                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                                    >
                                        {/* Timestamp */}
                                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {new Date(e.timestamp).toLocaleString('es-ES', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                            })}
                                        </td>

                                        {/* Usuario */}
                                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {e.usuarioEmail ?? '—'}
                                        </td>

                                        {/* Acción */}
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '10px',
                                                fontWeight:    700,
                                                letterSpacing: '0.08em',
                                                color,
                                                whiteSpace:    'nowrap',
                                            }}>
                                                {ACCION_LABEL[e.accion] ?? e.accion}
                                            </span>
                                        </td>

                                        {/* Entidad */}
                                        <td style={{ padding: '10px 14px' }}>
                                            {renderEntidad(e)}
                                        </td>

                                        {/* Detalles (con parsing de roles para LOGIN) */}
                                        <td style={{ padding: '10px 14px', maxWidth: '340px' }}>
                                            {renderDetalles(e)}
                                        </td>

                                        {/* IP (normalizada) */}
                                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {formatIp(e.ip)}
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
