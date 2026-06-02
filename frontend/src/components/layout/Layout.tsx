/**
 * components/layout/Layout.tsx v5
 */

import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation }  from 'react-router-dom';
import { Sidebar }              from './Sidebar';
import { Navbar }               from './Navbar';
import { AiFab }                from '../ai/AiFab';
import { useAuth }              from '../../hooks/useAuth';
import { useIdleTimer }         from '../../hooks/useIdleTimer';

const ROUTE_TITLES: Record<string, string> = {
    '/dashboard':       'Dashboard',
    '/productos':       'Productos',
    '/clientes':        'Clientes',
    '/proveedores':     'Proveedores',
    '/stock':           'Control de Stock',
    '/boveda':          'La Bóveda Retro',
    '/almacen':         'Mapa del Almacén',
    '/ai':              'IA & Analytics',
    '/usuarios':        'Gestión de Usuarios',
    '/auditoria':       'Auditoría',
    '/albaranes-rango': 'Albaranes',
};

const IDLE_TIMEOUT = 30 * 60 * 1000;
const BP_MOBILE    = 768;
const BP_TABLET    = 1024;

function getBreakpoint(w: number) {
    return { isMobile: w < BP_MOBILE, isTablet: w >= BP_MOBILE && w < BP_TABLET };
}

export function Layout(): JSX.Element {
    const { isMobile: initMobile, isTablet: initTablet } = getBreakpoint(
        typeof window !== 'undefined' ? window.innerWidth : 1280
    );
    const [isMobile,   setIsMobile]   = useState(initMobile);
    const [collapsed,  setCollapsed]  = useState(initTablet);
    const [mobileOpen, setMobileOpen] = useState(false);

    const location                    = useLocation();
    const { logout, isAuthenticated } = useAuth();

    useEffect(() => {
        let frame: number;
        const handle = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const { isMobile: m, isTablet: t } = getBreakpoint(window.innerWidth);
                setIsMobile(m);
                if (m) setMobileOpen(false);
                if (t) setCollapsed(true);
            });
        };
        window.addEventListener('resize', handle, { passive: true });
        return () => { window.removeEventListener('resize', handle); cancelAnimationFrame(frame); };
    }, []);

    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    useEffect(() => {
        document.documentElement.style.setProperty(
            '--sidebar-w',
            isMobile ? '0px' : collapsed ? '64px' : '240px'
        );
    }, [collapsed, isMobile]);

    const toggleDesktop = useCallback(() => setCollapsed(p => !p), []);
    const toggleMobile  = useCallback(() => setMobileOpen(p => !p), []);

    const title = Object.entries(ROUTE_TITLES).find(([path]) =>
        location.pathname.startsWith(path)
    )?.[1] ?? 'NEXUS ERP';

    useIdleTimer({ timeout: IDLE_TIMEOUT, onIdle: logout, enabled: isAuthenticated });

    return (
        <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg-base)' }}>

            <Sidebar
                collapsed={isMobile ? false : collapsed}
                onToggle={toggleDesktop}
                isMobile={isMobile}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />

            {/* El filter aplica blur/dim al contenido cuando el menú mobile está abierto.
                El cierre se hace con el botón ✕ del sidebar o navegando. */}
            <div style={{
                flex:          1,
                display:       'flex',
                flexDirection: 'column',
                minWidth:      0,
                filter:        isMobile && mobileOpen ? 'blur(3px) brightness(0.45)' : 'none',
                transition:    'filter 300ms ease',
            }}>
                <Navbar
                    title={title}
                    onMenuToggle={isMobile ? toggleMobile : undefined}
                    isMobile={isMobile}
                />
                <main style={{
                    flex:      1,
                    padding:   isMobile ? '12px' : 'clamp(16px, 2vw, 24px)',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    transition: 'padding 300ms ease',
                }}>
                    <Outlet />
                </main>
            </div>

            <AiFab mobileMenuOpen={isMobile && mobileOpen} />
        </div>
    );
}