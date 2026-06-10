/**
 * pages/AuditoriaPage.tsx — v4 Forensic
 * Solo accesible para rol ADMIN.
 *
 * Mejoras v4:
 *  · Filtro de rango de fechas (desde/hasta) → parámetros ya soportados por el backend
 *  · Filas expandibles con click — muestra detalles completos, IP y JSON de cambios
 *  · Colores de fila por categoría de acción (rojo / azul / violeta / gris)
 *  · Detalles truncados en vista compacta (expandir para ver todo)
 *  · datos_antes / datos_despues expuestos si el backend los devuelve
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTheme }                           from '../hooks/useTheme';
import type { PaginatedResponse }      from '../types/models';
import { useTableFilters, calculateAutoLimit } from '../hooks/useTableFilters';
import { TableControls, SkeletonRows } from '../components/table/TableControls';
import api from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
    id:            number;
    usuarioEmail:  string;
    accion:        string;
    entidad:       string;
    entidadId:     string | null;
    detalles:      string | null;
    timestamp:     string;
    ip:            string | null;
    datosAntes?:   Record<string, unknown> | null;
    datosDespues?: Record<string, unknown> | null;
}

// ── Grupos de filtro ──────────────────────────────────────────────────────────

type FiltroGrupo = { label: string; value: string; field: 'operacion' | 'tabla' };

const GRUPOS_ACCION: FiltroGrupo[] = [
    { label: 'TODOS',    value: '',               field: 'operacion' },
    { label: 'ACCESO',   value: 'AUTH',           field: 'tabla'     },
    { label: 'CREAR',    value: 'CREATE',         field: 'operacion' },
    { label: 'EDITAR',   value: 'UPDATE',         field: 'operacion' },
    { label: 'ELIMINAR', value: 'DELETE',         field: 'operacion' },
    { label: 'USUARIOS', value: 'ACTIVATE',       field: 'operacion' },
    { label: 'ROLES',    value: 'ROLE_ASSIGN',    field: 'operacion' },
    { label: 'STOCK',    value: 'STOCK_MOVEMENT', field: 'operacion' },
    { label: 'IA',       value: 'AI_QUERY',       field: 'operacion' },
    { label: 'SISTEMA',  value: 'BACKUP_EXPORT',  field: 'operacion' },
];

// ── Paleta de acciones ────────────────────────────────────────────────────────

const ACCION_COLOR: Record<string, string> = {
    LOGIN:           'var(--accent-primary)',
    LOGOUT:          'var(--text-muted)',
    REGISTER:        'var(--accent-cyan)',
    VERIFY_EMAIL:    'var(--accent-cyan)',
    CREATE:          'var(--accent-primary)',
    INSERT:          'var(--accent-primary)',
    UPDATE:          'var(--accent-gold)',
    DELETE:          'var(--accent-danger)',
    ACTIVATE:        'var(--accent-primary)',
    DEACTIVATE:      'var(--accent-danger)',
    ROLE_ASSIGN:     'var(--accent-gold)',
    ROLE_REMOVE:     'var(--accent-danger)',
    STOCK_MOVEMENT:  'var(--accent-cyan)',
    AI_QUERY:        '#A78BFA',
    BACKUP_EXPORT:   '#8B5CF6',
    BACKUP_RESTORE:  'var(--accent-danger)',
    CHANGE_PASSWORD: 'var(--accent-gold)',
};

const ACCION_LABEL: Record<string, string> = {
    LOGIN:           'LOGIN',
    LOGOUT:          'LOGOUT',
    REGISTER:        'REGISTRO',
    VERIFY_EMAIL:    'VERIFICACIÓN',
    CREATE:          'CREAR',
    INSERT:          'INSERTAR',
    UPDATE:          'MODIFICAR',
    DELETE:          'ELIMINAR',
    ACTIVATE:        'ACTIVAR',
    DEACTIVATE:      'DESACTIVAR',
    ROLE_ASSIGN:     'ROL+',
    ROLE_REMOVE:     'ROL−',
    STOCK_MOVEMENT:  'STOCK',
    AI_QUERY:        'IA QUERY',
    BACKUP_EXPORT:   'BACKUP',
    BACKUP_RESTORE:  'RESTAURAR',
    CHANGE_PASSWORD: 'CONTRASEÑA',
};

/** Tinte de fondo de la fila según categoría de acción */
function getRowTint(accion: string): string {
    if (['DELETE', 'DEACTIVATE', 'ROLE_REMOVE', 'BACKUP_RESTORE'].includes(accion))
        return 'rgba(248,113,113,0.055)';
    if (['LOGIN', 'REGISTER', 'VERIFY_EMAIL', 'ACTIVATE', 'CREATE', 'INSERT'].includes(accion))
        return 'rgba(59,130,246,0.05)';
    if (['AI_QUERY'].includes(accion))
        return 'rgba(167,139,250,0.07)';
    if (['BACKUP_EXPORT', 'BACKUP_RESTORE'].includes(accion))
        return 'rgba(139,92,246,0.06)';
    if (['UPDATE', 'ROLE_ASSIGN', 'CHANGE_PASSWORD'].includes(accion))
        return 'rgba(245,158,11,0.05)';
    return 'transparent';
}

/** Color del borde izquierdo (indicador visual de categoría) */
function getRowBorderColor(accion: string): string {
    if (['DELETE', 'DEACTIVATE', 'ROLE_REMOVE', 'BACKUP_RESTORE'].includes(accion))
        return 'var(--accent-danger)';
    if (['LOGIN', 'REGISTER', 'VERIFY_EMAIL', 'ACTIVATE', 'CREATE', 'INSERT'].includes(accion))
        return 'var(--accent-primary)';
    if (['AI_QUERY'].includes(accion))
        return '#A78BFA';
    if (['UPDATE', 'ROLE_ASSIGN', 'CHANGE_PASSWORD'].includes(accion))
        return 'var(--accent-gold)';
    return 'transparent';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIp(ip: string | null): string {
    if (!ip) return '—';
    if (ip === '0:0:0:0:0:0:0:1' || ip === '::1') return '127.0.0.1';
    return ip;
}

function renderEntidad(e: AuditEntry): JSX.Element {
    if (e.entidad === 'AUTH') {
        return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>sistema</span>;
    }
    return (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {e.entidad}
            {e.entidadId && <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>#{e.entidadId}</span>}
        </span>
    );
}

function renderSegmentoCambio(seg: string, key: number): JSX.Element {
    const arrowIdx = seg.indexOf('→');
    if (arrowIdx === -1) {
        return <span key={key} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{seg}</span>;
    }
    const colonIdx = seg.indexOf(':');
    const label    = colonIdx !== -1 ? seg.slice(0, colonIdx).trim() : '';
    const rest     = colonIdx !== -1 ? seg.slice(colonIdx + 1).trim() : seg;
    const oldVal   = rest.slice(0, rest.indexOf('→')).trim();
    const newVal   = rest.slice(rest.indexOf('→') + 1).trim();
    const newColor = newVal === 'INACTIVO' ? 'var(--accent-danger)' : newVal === 'ACTIVO' ? '#44cc88' : 'var(--accent-primary)';
    return (
        <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '3px', padding: '1px 6px', whiteSpace: 'nowrap' }}>
            {label && <span style={{ color: 'var(--text-muted)', marginRight: '1px' }}>{label}:</span>}
            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', opacity: 0.6 }}>{oldVal}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 1px' }}>→</span>
            <span style={{ color: newColor, fontWeight: 600 }}>{newVal}</span>
        </span>
    );
}

/**
 * Vista compacta — solo el nombre/sujeto principal, sin detalles.
 * Todo lo demás queda para el panel expandido.
 */
function renderDetallesCompacto(e: AuditEntry): JSX.Element | string {
    if (!e.detalles) return '—';

    // LOGIN: solo el resultado (exitoso / fallido), sin roles ni más
    if (e.accion === 'LOGIN') {
        const isFailed = e.detalles.toLowerCase().includes('fallido');
        const esPrimer = e.detalles.includes('PRIMER ACCESO');
        const label    = isFailed ? 'Intento fallido' : esPrimer ? 'Primer acceso' : 'Acceso correcto';
        const clr      = isFailed ? 'var(--accent-danger)' : esPrimer ? 'var(--accent-gold)' : 'var(--text-primary)';
        return <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: clr, fontWeight: 500 }}>{label}</span>;
    }

    // Formato "Nombre | campo: x → y | ..." → solo el nombre
    if (e.detalles.includes(' | ')) {
        const nombre = e.detalles.split(' | ')[0];
        const extra  = e.detalles.split(' | ').length - 1;
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{nombre}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '3px', padding: '1px 5px' }}>
                    +{extra} campo{extra !== 1 ? 's' : ''}
                </span>
            </span>
        );
    }

    // Texto plano — truncar en 45 chars
    const MAX   = 45;
    const texto = e.detalles.length > MAX ? `${e.detalles.slice(0, MAX)}…` : e.detalles;
    const isFailed = e.detalles.toLowerCase().includes('fallido');
    return <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: isFailed ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{texto}</span>;
}

/** Panel expandido — información que NO aparece en las columnas de la fila */
function PanelExpandido({ e }: { e: AuditEntry }): JSX.Element {
    const tieneJson    = e.datosAntes || e.datosDespues;
    const color        = ACCION_COLOR[e.accion] ?? 'var(--text-secondary)';
    const borderClr    = getRowBorderColor(e.accion);

    // Construir bloques de detalles enriquecidos
    const bloques: JSX.Element[] = [];

    if (e.detalles) {
        if (e.accion === 'LOGIN') {
            // LOGIN: mostrar todos los segmentos — estado, roles, primer acceso
            const parts = e.detalles.split(' | ');
            const estado = parts[0];
            const rolesPart = parts.find(p => p.startsWith('roles:'));
            const roles = rolesPart ? rolesPart.replace('roles:', '').trim().split(',').map(r => r.trim()).filter(Boolean) : [];
            const esPrimer = e.detalles.includes('PRIMER ACCESO');
            bloques.push(
                <div key="login" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: estado.toLowerCase().includes('fallido') ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                        {estado}
                    </span>
                    {roles.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={labelStyle}>Roles activos</span>
                            {roles.map(r => (
                                <span key={r} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: '3px', padding: '2px 7px' }}>{r}</span>
                            ))}
                        </div>
                    )}
                    {esPrimer && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-gold)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '4px 10px', display: 'inline-block' }}>
                            ⚠ Primer acceso — usando contraseña temporal
                        </span>
                    )}
                </div>
            );
        } else if (e.detalles.includes(' | ')) {
            // Formato "Nombre | campo: x → y | ..."
            const partes   = e.detalles.split(' | ');
            const nombre   = partes[0];
            const cambios  = partes.slice(1);
            bloques.push(
                <div key="cambios" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{nombre}</span>
                    {cambios.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <span style={labelStyle}>Cambios registrados</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {cambios.map((seg, i) => renderSegmentoCambio(seg, i))}
                            </div>
                        </div>
                    )}
                </div>
            );
        } else {
            // Texto plano completo
            bloques.push(
                <div key="texto" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={labelStyle}>Descripción completa</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{e.detalles}</span>
                </div>
            );
        }
    }

    return (
        <div style={{ borderTop: `1px solid ${borderClr}30`, background: 'var(--bg-primary)', padding: '16px 20px 18px 40px' }}>

            {/* Cabecera del panel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color }}>
                    {ACCION_LABEL[e.accion] ?? e.accion}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    Registro #{e.id}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 23)}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: tieneJson ? '1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '24px', alignItems: 'start' }}>

                {/* Columna 1: Detalles del evento */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={labelStyle}>Detalle del evento</div>
                    {bloques.length > 0 ? bloques : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                </div>

                {/* Columna 2: Entidad + Origen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {e.entidad !== 'AUTH' && (
                        <div>
                            <div style={labelStyle}>Entidad afectada</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{e.entidad}</span>
                                {e.entidadId && (
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>ID #{e.entidadId}</span>
                                )}
                            </div>
                        </div>
                    )}
                    <div>
                        <div style={labelStyle}>Usuario</div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', display: 'block', marginTop: '4px', wordBreak: 'break-all' }}>
                            {e.usuarioEmail ?? '—'}
                        </span>
                    </div>
                </div>

                {/* Columna 3: IP + Timestamp */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <div style={labelStyle}>Dirección IP</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)' }}>
                                {formatIp(e.ip)}
                            </span>
                            {(e.ip === '127.0.0.1' || e.ip === '::1' || e.ip === '0:0:0:0:0:0:0:1') && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '3px', padding: '1px 5px' }}>local</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <div style={labelStyle}>Timestamp exacto</div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                            {new Date(e.timestamp).toLocaleString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* JSON diff — solo si existe */}
            {tieneJson && (
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '12px' }}>
                    {e.datosAntes && (
                        <div style={{ flex: 1 }}>
                            <div style={{ ...labelStyle, color: 'var(--accent-danger)', marginBottom: '6px' }}>Estado anterior</div>
                            <pre style={jsonStyle}>{JSON.stringify(e.datosAntes, null, 2)}</pre>
                        </div>
                    )}
                    {e.datosDespues && (
                        <div style={{ flex: 1 }}>
                            <div style={{ ...labelStyle, color: '#44cc88', marginBottom: '6px' }}>Estado nuevo</div>
                            <pre style={jsonStyle}>{JSON.stringify(e.datosDespues, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    fontFamily:    'var(--font-display)',
    fontSize:      '9px',
    fontWeight:    700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color:         'var(--text-muted)',
    marginBottom:  '4px',
};

const jsonStyle: React.CSSProperties = {
    fontFamily:   'var(--font-mono)',
    fontSize:     '10px',
    color:        'var(--text-secondary)',
    background:   'var(--bg-primary)',
    border:       '1px solid var(--border-subtle)',
    borderRadius: '5px',
    padding:      '8px 10px',
    margin:       0,
    overflowX:    'auto',
    maxHeight:    '160px',
    overflowY:    'auto',
    lineHeight:   1.5,
};

// ── Estilos de inputs de fecha ────────────────────────────────────────────────

const dateInputStyle: React.CSSProperties = {
    fontFamily:   'var(--font-mono)',
    fontSize:     '12px',
    color:        'var(--text-primary)',
    background:   'var(--bg-surface)',
    border:       '1px solid var(--border-default)',
    borderRadius: '6px',
    padding:      '7px 10px',
    outline:      'none',
    height:       '38px',
    boxSizing:    'border-box',
    cursor:       'pointer',
    transition:   'border-color 160ms ease, box-shadow 160ms ease',
    colorScheme:  'dark',
};

// ── Página ────────────────────────────────────────────────────────────────────

export function AuditoriaPage(): JSX.Element {

    const { isDark } = useTheme();

    const filters = useTableFilters({ key: 'auditoria', initialLimit: calculateAutoLimit() });
    const { buildParams, setPagination } = filters;

    const [rows,        setRows]        = useState<AuditEntry[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [filterGrupo, setFilterGrupo] = useState<FiltroGrupo>(GRUPOS_ACCION[0]);
    const [fadeKey,     setFadeKey]     = useState(0);
    const [expandedId,  setExpandedId]  = useState<number | null>(null);

    // Filtro de fechas
    const [dateDesde, setDateDesde] = useState('');
    const [dateHasta, setDateHasta] = useState('');

    const isFirstLoadRef  = useRef(true);
    const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; }

        if (isFirstLoadRef.current) {
            setIsLoading(true);
            isFirstLoadRef.current = false;
        } else {
            loadingTimerRef.current = setTimeout(() => { if (!cancelled) setIsLoading(true); }, 120);
        }

        const params = buildParams();
        if (filterGrupo.value) params.set(filterGrupo.field, filterGrupo.value);
        if (dateDesde) params.set('desde', `${dateDesde}T00:00:00`);
        if (dateHasta) params.set('hasta', `${dateHasta}T23:59:59`);

        api.get<PaginatedResponse<AuditEntry>>(`/audit?${params.toString()}`)
            .then(r => {
                if (!cancelled) {
                    setRows(r.data.content);
                    setPagination(r.data.totalElements, r.data.totalPages);
                    setFadeKey(k => k + 1);
                    setExpandedId(null); // cerrar expandido al cambiar página/filtro
                }
            })
            .catch(() => { if (!cancelled) { setRows([]); setPagination(0, 0); setFadeKey(k => k + 1); } })
            .finally(() => {
                if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; }
                if (!cancelled) setIsLoading(false);
            });

        return (): void => {
            cancelled = true;
            if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; }
        };
    }, [filters.querySignal, filterGrupo, dateDesde, dateHasta, buildParams, setPagination]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            <style>{`
                @keyframes audit-scan {
                    0%   { background-position: -200% 0; }
                    100% { background-position:  200% 0; }
                }
                @keyframes audit-fade-in {
                    from { opacity: 0; transform: translateY(3px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes audit-expand {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .audit-row { cursor: pointer; transition: background 100ms ease; }
                .audit-row:hover { background: var(--bg-overlay) !important; }
                .audit-date-input:focus {
                    border-color: var(--accent-cyan) !important;
                    box-shadow: 0 0 0 3px rgba(56,189,248,0.12) !important;
                }
            `}</style>

            {/* ── Cabecera ── */}
            <div style={{ marginBottom: '18px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                    Log de{' '}
                    <span style={{
                        background:           isDark ? 'linear-gradient(110deg, #FCD34D 0%, #F59E0B 100%)' : 'linear-gradient(110deg, #B45309 0%, #78350F 100%)',
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

            {/* ── Barra de filtros: fechas + grupos de acción ── */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>

                {/* Período */}
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 }}>
                    Período
                </span>
                <input
                    type="date"
                    className="audit-date-input"
                    value={dateDesde}
                    max={dateHasta || undefined}
                    onChange={e => { setDateDesde(e.target.value); filters.setPage(0); }}
                    style={dateInputStyle}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>→</span>
                <input
                    type="date"
                    className="audit-date-input"
                    value={dateHasta}
                    min={dateDesde || undefined}
                    onChange={e => { setDateHasta(e.target.value); filters.setPage(0); }}
                    style={dateInputStyle}
                />
                {(dateDesde || dateHasta) && (
                    <button
                        onClick={() => { setDateDesde(''); setDateHasta(''); filters.setPage(0); }}
                        style={{ background: 'transparent', border: '1px solid var(--border-default)', borderRadius: '5px', padding: '4px 10px', fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 120ms ease', height: '28px', flexShrink: 0 }}
                    >
                        ✕ Limpiar
                    </button>
                )}

                {/* Separador vertical */}
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border-default)', flexShrink: 0, margin: '0 2px' }} />

                {/* Filtros por tipo de acción — ocupan el resto del ancho */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', minWidth: 0 }}>
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
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    padding:       '5px 0',
                                    flex:          1,
                                    textAlign:     'center',
                                    background:    isActive ? 'var(--accent-gold)' : 'transparent',
                                    color:         isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                                    border:        `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                                    borderRadius:  '4px',
                                    cursor:        'pointer',
                                    transition:    'all 120ms ease',
                                    whiteSpace:    'nowrap',
                                }}
                            >
                                {g.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Búsqueda + paginación ── */}
            <div style={{ marginBottom: '14px' }}>
                <TableControls
                    filters={filters}
                    isLoading={isLoading}
                    entityLabel="evento"
                    searchPlaceholder="Buscar por usuario, entidad, acción o detalles..."
                />
            </div>

            {/* ── Tabla ── */}
            <div style={{ position: 'relative', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

                {isLoading && rows.length > 0 && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, var(--accent-cyan) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'audit-scan 1.2s ease infinite', zIndex: 10, pointerEvents: 'none' }} />
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                                <th style={thStyle}></th>{/* chevron */}
                                {['Fecha y hora', 'Usuario', 'Acción', 'Resumen'].map(h => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody key={fadeKey} style={{ animation: 'audit-fade-in 160ms ease both' }}>

                            {isLoading && rows.length === 0 && (
                                <SkeletonRows rows={Math.min(filters.limit, 10)} cols={5} />
                            )}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {filters.search ? `SIN RESULTADOS PARA "${filters.search.toUpperCase()}"` : 'SIN REGISTROS DE AUDITORÍA'}
                                    </td>
                                </tr>
                            )}

                            {rows.map(e => {
                                const color      = ACCION_COLOR[e.accion] ?? 'var(--text-secondary)';
                                const rowTint    = getRowTint(e.accion);
                                const borderClr  = getRowBorderColor(e.accion);
                                const isExpanded = expandedId === e.id;

                                return (
                                    <React.Fragment key={e.id}>
                                        {/* ── Fila principal ── */}
                                        <tr
                                            className="audit-row"
                                            onClick={() => setExpandedId(isExpanded ? null : e.id)}
                                            style={{
                                                borderBottom:    isExpanded ? 'none' : '1px solid var(--border-subtle)',
                                                borderLeft:      `3px solid ${borderClr}`,
                                                background:      isExpanded ? 'var(--bg-overlay)' : rowTint,
                                            }}
                                        >
                                            {/* Chevron */}
                                            <td style={{ padding: '10px 6px 10px 12px', width: '20px' }}>
                                                <span style={{
                                                    fontFamily:  'var(--font-mono)',
                                                    fontSize:    '10px',
                                                    color:       'var(--text-muted)',
                                                    display:     'inline-block',
                                                    transition:  'transform 180ms ease',
                                                    transform:   isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    userSelect:  'none',
                                                }}>▶</span>
                                            </td>

                                            {/* Timestamp */}
                                            <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {new Date(e.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </td>

                                            {/* Usuario */}
                                            <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {e.usuarioEmail ?? '—'}
                                            </td>

                                            {/* Acción — texto con color, sin recuadro */}
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color, whiteSpace: 'nowrap' }}>
                                                    {ACCION_LABEL[e.accion] ?? e.accion}
                                                </span>
                                            </td>

                                            {/* Resumen compacto */}
                                            <td style={{ padding: '10px 14px', maxWidth: '340px' }}>
                                                {renderDetallesCompacto(e)}
                                            </td>
                                        </tr>

                                        {/* ── Fila expandida ── */}
                                        {isExpanded && (
                                            <tr style={{ borderBottom: '1px solid var(--border-subtle)', borderLeft: `3px solid ${borderClr}`, background: 'var(--bg-elevated)' }}>
                                                <td colSpan={5} style={{ padding: 0, animation: 'audit-expand 180ms ease both' }}>
                                                    <PanelExpandido e={e} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding:       '10px 14px',
    textAlign:     'left',
    fontFamily:    'var(--font-display)',
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color:         'var(--text-muted)',
    whiteSpace:    'nowrap',
};
