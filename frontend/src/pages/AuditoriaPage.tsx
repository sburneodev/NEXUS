/**
 * pages/AuditoriaPage.tsx — UI-11
 * Solo accesible para rol ADMIN.
 * GET /api/audit/log — historial de eventos del sistema.
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

interface AuditEntry {
    id:          number;
    usuarioEmail:string;
    accion:      string;
    entidad:     string;
    entidadId:   number | null;
    detalles:    string | null;
    timestamp:   string;
    ip:          string | null;
}

const MOCK_AUDIT: AuditEntry[] = [
    { id:1, usuarioEmail:'admin@levelupnexus.es', accion:'LOGIN', entidad:'AUTH', entidadId:null, detalles:'Inicio de sesión exitoso', timestamp:new Date(Date.now()-300000).toISOString(), ip:'192.168.1.100' },
    { id:2, usuarioEmail:'gestor@levelupnexus.es', accion:'CREATE', entidad:'PRODUCTO', entidadId:42, detalles:'Nuevo producto STD-PS5-042', timestamp:new Date(Date.now()-600000).toISOString(), ip:'192.168.1.101' },
    { id:3, usuarioEmail:'cajero@levelupnexus.es', accion:'UPDATE', entidad:'STOCK', entidadId:15, detalles:'Stock actualizado: 10 → 8', timestamp:new Date(Date.now()-1200000).toISOString(), ip:'192.168.1.102' },
    { id:4, usuarioEmail:'admin@levelupnexus.es', accion:'DELETE', entidad:'CLIENTE', entidadId:7, detalles:'Soft delete cliente ID 7', timestamp:new Date(Date.now()-3600000).toISOString(), ip:'192.168.1.100' },
];

const ACCION_COLOR: Record<string, string> = {
    LOGIN:  'var(--accent-primary)',
    CREATE: 'var(--accent-cyan)',
    UPDATE: 'var(--accent-gold)',
    DELETE: 'var(--accent-danger)',
    LOGOUT: 'var(--text-muted)',
};

export function AuditoriaPage(): JSX.Element {
    const [entries, setEntries]     = useState<AuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter]       = useState('');

    useEffect(() => {
        api.get<AuditEntry[]>('/audit/log')
            .then(r => setEntries(r.data))
            .catch(() => setEntries(MOCK_AUDIT))
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = entries.filter(e =>
        filter === '' ||
        e.accion === filter ||
        e.usuarioEmail.includes(filter.toLowerCase()) ||
        e.entidad.includes(filter.toUpperCase())
    );

    return (
        <div>
            <div style={{ marginBottom:'24px' }}>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-3xl)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-primary)', margin:0 }}>
                    Log de <span style={{ color:'var(--accent-gold)' }}>Auditoría</span>
                </h1>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--accent-danger)', border:'1px solid var(--accent-danger)', borderRadius:'3px', padding:'1px 6px', letterSpacing:'0.08em' }}>
                        🔒 SOLO ADMIN
                    </span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--text-muted)' }}>
                        {entries.length} eventos registrados
                    </span>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                {['', 'LOGIN', 'CREATE', 'UPDATE', 'DELETE'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{ fontFamily:'var(--font-display)', fontSize:'10px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', padding:'5px 12px', background: filter===f ? 'var(--accent-gold)' : 'transparent', color: filter===f ? 'var(--text-inverse)' : 'var(--text-secondary)', border:`1px solid ${filter===f ? 'var(--accent-gold)' : 'var(--border-default)'}`, borderRadius:'4px', cursor:'pointer', transition:'all 120ms ease' }}>
                        {f || 'TODOS'}
                    </button>
                ))}
            </div>

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
                {isLoading ? (
                    <div style={{ padding:'40px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-muted)' }}>CARGANDO REGISTROS...</div>
                ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom:'1px solid var(--border-default)', background:'var(--bg-elevated)' }}>
                                {['Timestamp','Usuario','Acción','Entidad','Detalles','IP'].map(h => (
                                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontFamily:'var(--font-display)', fontSize:'10px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding:'32px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-muted)' }}>SIN REGISTROS</td></tr>
                            ) : filtered.map(e => (
                                <tr key={e.id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                                    <td style={{ padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                                        {new Date(e.timestamp).toLocaleString('es-ES')}
                                    </td>
                                    <td style={{ padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--accent-cyan)' }}>{e.usuarioEmail}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', fontWeight:700, letterSpacing:'0.08em', color: ACCION_COLOR[e.accion] ?? 'var(--text-primary)', border:`1px solid ${ACCION_COLOR[e.accion] ?? 'var(--border-default)'}`, borderRadius:'3px', padding:'2px 6px' }}>
                                            {e.accion}
                                        </span>
                                    </td>
                                    <td style={{ padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-secondary)' }}>
                                        {e.entidad}{e.entidadId ? ` #${e.entidadId}` : ''}
                                    </td>
                                    <td style={{ padding:'10px 14px', fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-primary)' }}>
                                        {e.detalles ?? '—'}
                                    </td>
                                    <td style={{ padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-muted)' }}>
                                        {e.ip ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
