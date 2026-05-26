/**
 * components/layout/Layout.tsx v2
 *
 * Cambios:
 * - useIdleTimer: logout automático tras 30 min de inactividad
 * - FAB (Floating Action Button) esquina inferior derecha → panel IA
 * - Panel IA colapsable lateral sobre el contenido
 * - Rutas actualizadas (incluye /almacen)
 */

import { useState, useCallback } from 'react';
import { Outlet, useLocation }  from 'react-router-dom';
import { Sidebar }              from './Sidebar';
import { Navbar }               from './Navbar';
import { Nl2SqlPanel }          from '../ai/Nl2SqlPanel';
import { useAuth }              from '../../hooks/useAuth';
import { useIdleTimer }         from '../../hooks/useIdleTimer';

const ROUTE_TITLES: Record<string, string> = {
    '/dashboard':   'Dashboard',
    '/productos':   'Productos',
    '/clientes':    'Clientes',
    '/proveedores': 'Proveedores',
    '/stock':       'Control de Stock',
    '/boveda':      'La Bóveda Retro',
    '/almacen':     'Mapa del Almacén',
    '/ai':          'IA & Analytics',
    '/usuarios':    'Gestión de Usuarios',
    '/auditoria':   'Auditoría',
};

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos

export function Layout(): JSX.Element {
    const [collapsed, setCollapsed]     = useState(false);
    const [aiOpen, setAiOpen]           = useState(false);
    const location                      = useLocation();
    const { logout, isAuthenticated }   = useAuth();

    const toggle = useCallback(() => setCollapsed(prev => !prev), []);

    const title = Object.entries(ROUTE_TITLES).find(([path]) =>
        location.pathname.startsWith(path)
    )?.[1] ?? 'NEXUS ERP';

    // Logout automático por inactividad
    useIdleTimer({
        timeout: IDLE_TIMEOUT,
        onIdle:  logout,
        enabled: isAuthenticated,
    });

    return (
        <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg-base)', position: 'relative' }}>

            {/* Sidebar */}
            <Sidebar collapsed={collapsed} onToggle={toggle} />

            {/* Área principal */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                <Navbar title={title} />

                <main style={{ flex: 1, padding: '24px', overflowY: 'auto', overflowX: 'hidden' }}>
                    <Outlet />
                </main>

                <footer style={{
                    height: '30px', borderTop: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 20px', flexShrink: 0,
                }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                        NEXUS ERP v1.2.0 · LevelUp Arcade · {new Date().getFullYear()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                        ◆ LA BÓVEDA RETRO
                    </span>
                </footer>
            </div>

            {/* ── FAB — Asistente IA ──────────────────────────────────── */}
            <button
                onClick={() => setAiOpen(v => !v)}
                title="Asistente IA"
                style={{
                    position:   'fixed',
                    bottom:     '24px',
                    right:      '24px',
                    width:      '52px',
                    height:     '52px',
                    borderRadius:'50%',
                    background: aiOpen
                        ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-primary))'
                        : 'var(--bg-elevated)',
                    border:     '1px solid var(--accent-cyan)',
                    color:      aiOpen ? 'var(--text-inverse)' : 'var(--accent-cyan)',
                    fontSize:   '20px',
                    cursor:     'pointer',
                    boxShadow:  aiOpen
                        ? 'var(--shadow-cyan)'
                        : '0 4px 16px rgba(0,0,0,0.5)',
                    zIndex:     50,
                    transition: 'all 200ms ease',
                    display:    'flex',
                    alignItems: 'center',
                    justifyContent:'center',
                }}
            >
                {aiOpen ? '✕' : '◇'}
            </button>

            {/* ── Panel IA deslizante ─────────────────────────────────── */}
            <div style={{
                position:   'fixed',
                bottom:     '88px',
                right:      '24px',
                width:      '400px',
                maxHeight:  'calc(100dvh - 120px)',
                overflowY:  'auto',
                zIndex:     49,
                transform:  aiOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
                opacity:    aiOpen ? 1 : 0,
                pointerEvents: aiOpen ? 'auto' : 'none',
                transition: 'all 220ms cubic-bezier(0.25,0.46,0.45,0.94)',
                borderRadius:'var(--radius-lg)',
                boxShadow:  'var(--shadow-lg)',
            }}>
                <Nl2SqlPanel />
            </div>
        </div>
    );
}
