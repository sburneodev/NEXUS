/**
 * components/layout/Layout.tsx v3
 *
 * Layout principal: Sidebar + Navbar + área de scroll.
 * - El asistente IA ya no vive aquí (era un FAB flotante mal adaptado).
 *   Ahora se integra inline como sección del Dashboard.
 * - Sin footer redundante.
 * - useIdleTimer: logout automático a los 30 min de inactividad.
 */

import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation }  from 'react-router-dom';
import { Sidebar }              from './Sidebar';
import { Navbar }               from './Navbar';
import { AiFab }                from '../ai/AiFab';
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
    const [collapsed, setCollapsed]   = useState(false);
    const location                    = useLocation();
    const { logout, isAuthenticated } = useAuth();

    const toggle = useCallback(() => setCollapsed(prev => !prev), []);

    // Expone el ancho del sidebar como CSS var global para centrar modales
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-w', collapsed ? '64px' : '240px');
    }, [collapsed]);

    const title = Object.entries(ROUTE_TITLES).find(([path]) =>
        location.pathname.startsWith(path)
    )?.[1] ?? 'NEXUS ERP';

    useIdleTimer({
        timeout: IDLE_TIMEOUT,
        onIdle:  logout,
        enabled: isAuthenticated,
    });

    return (
        <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg-base)' }}>

            <Sidebar collapsed={collapsed} onToggle={toggle} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Navbar title={title} />
                <main style={{
                    flex:        1,
                    padding:     'clamp(16px, 2vw, 24px)',
                    overflowY:   'auto',
                    overflowX:   'hidden',
                }}>
                    <Outlet />
                </main>
            </div>

            <AiFab />
        </div>
    );
}
