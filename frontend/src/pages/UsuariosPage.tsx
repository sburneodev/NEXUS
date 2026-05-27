/**
 * pages/UsuariosPage.tsx — UI-10
 * Solo accesible para rol ADMIN.
 * GET /api/usuarios — lista todos los usuarios con sus roles.
 * PUT /api/usuarios/{id}/activar | /desactivar
 * PUT /api/usuarios/{id}/roles — asignar/quitar roles
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface UsuarioAdmin {
    id:        number;
    email:     string;
    username:  string;
    activo:    boolean;
    roles:     string[];
}

const ROLES_DISPONIBLES = ['ADMIN','GESTOR_INVENTARIO','CAJERO','MARKETING_ANALYST','CONTABLE'];

export function UsuariosPage(): JSX.Element {
    const [usuarios, setUsuarios]   = useState<UsuarioAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast]         = useState('');

    function showToast(msg: string): void {
        setToast(msg); setTimeout(() => setToast(''), 3000);
    }

    const cargar = useCallback((): void => {
        setIsLoading(true);
        api.get<UsuarioAdmin[]>('/usuarios')
            .then(r => setUsuarios(r.data))
            .catch(() => setUsuarios([]))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    async function toggleActivo(u: UsuarioAdmin): Promise<void> {
        const endpoint = u.activo ? `/usuarios/${u.id}/desactivar` : `/usuarios/${u.id}/activar`;
        await api.put(endpoint);
        showToast(`${u.username} ${u.activo ? 'desactivado' : 'activado'}`);
        cargar();
    }

    return (
        <div>
            {toast && (
                <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:200, background:'var(--bg-elevated)', border:'1px solid var(--accent-primary)', borderRadius:'var(--radius-base)', padding:'12px 20px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--accent-primary)', boxShadow:'var(--shadow-lg)', animation:'fadeInUp 0.2s ease both' }}>
                    ✓ {toast}
                </div>
            )}

            <div style={{ marginBottom:'24px' }}>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-3xl)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-primary)', margin:0 }}>
                    Gestión de <span style={{ color:'var(--accent-cyan)' }}>Usuarios</span>
                </h1>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--accent-danger)', border:'1px solid var(--accent-danger)', borderRadius:'3px', padding:'1px 6px', letterSpacing:'0.08em' }}>
                        🔒 SOLO ADMIN
                    </span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--text-muted)', letterSpacing:'0.04em' }}>
                        {usuarios.filter(u => u.activo).length} usuarios activos
                    </span>
                </div>
            </div>

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
                {isLoading ? (
                    <div style={{ padding:'40px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-muted)', letterSpacing:'0.08em' }}>
                        CARGANDO...
                    </div>
                ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom:'1px solid var(--border-default)', background:'var(--bg-elevated)' }}>
                                {['Usuario','Email','Roles','Estado','Acciones'].map(h => (
                                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontFamily:'var(--font-display)', fontSize:'10px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                                    <td style={{ padding:'12px 16px' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,var(--accent-primary),var(--accent-cyan))', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:700, color:'var(--text-inverse)', flexShrink:0 }}>
                                                {u.username.slice(0,2).toUpperCase()}
                                            </div>
                                            <span style={{ fontFamily:'var(--font-display)', fontSize:'13px', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-primary)' }}>
                                                {u.username}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--accent-cyan)' }}>{u.email}</td>
                                    <td style={{ padding:'12px 16px' }}>
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                                            {ROLES_DISPONIBLES.map(role => {
                                                const tiene = u.roles.includes(role);
                                                return (
                                                    <span key={role} style={{ fontFamily:'var(--font-mono)', fontSize:'9px', letterSpacing:'0.06em', color: tiene ? 'var(--accent-primary)' : 'var(--text-muted)', border:`1px solid ${tiene ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, borderRadius:'3px', padding:'1px 5px', opacity: tiene ? 1 : 0.4 }}>
                                                        {role.replace('_',' ')}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td style={{ padding:'12px 16px' }}>
                                        <span className={u.activo ? 'badge badge-green' : 'badge'} style={{ fontSize:'9px' }}>
                                            {u.activo ? '● ACTIVO' : '○ INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ padding:'12px 16px' }}>
                                        <button
                                            onClick={() => toggleActivo(u)}
                                            style={{ background:'transparent', border:`1px solid ${u.activo ? 'var(--accent-danger)' : 'var(--accent-primary)'}`, color: u.activo ? 'var(--accent-danger)' : 'var(--accent-primary)', borderRadius:'4px', padding:'4px 10px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:'10px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}
                                        >
                                            {u.activo ? 'DESACTIVAR' : 'ACTIVAR'}
                                        </button>
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
