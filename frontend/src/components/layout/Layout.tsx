/**
 * components/layout/Layout.tsx v5
 *
 * Responsive con transición suave en resize:
 *   El sidebar exterior siempre está en el flujo flex y transiciona su ancho
 *   (240 → 64 → 0) mediante CSS transition, de modo que el contenido se adapta
 *   de forma imperceptible sin "saltos" de layout.
 *   En mobile el panel visual se renderiza como overlay fijo encima del contenido.
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

const IDLE_TIMEOUT   = 30 * 60 * 1000;
const BP_MOBILE      = 768;
const BP_TABLET      = 1024;

function getBreakpoint(w: number) {
    return { isMobile: w < BP_MOBILE, isTablet: w >= BP_MOBILE && w < BP_TABLET };
}

export function Layout(): JSX.Element {
    const { isMobile: initMobile, isTablet: initTablet } = getBreakpoint(
        typeof window !== 'undefined' ? window.innerWidth : 1280
    );
    const [isMobile,   setIsMobile]   = useState(initMobile);
    const [collapsed,  setCollapsed]  = useState(initTablet);   // tablet arranca colapsado
    const [mobileOpen, setMobileOpen] = useState(false);

    const location                    = useLocation();
    const { logout, isAuthenticated } = useAuth();

    // Seguimiento de breakpoint en tiempo real — no necesita ser instantáneo
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

    // Cerrar sidebar mobile al navegar
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    // CSS var para centrado de modales
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

            {/* Backdrop mobile — fade suave */}
            <div
                onClick={() => setMobileOpen(false)}
                style={{
                    position:             'fixed',
                    inset:                0,
                    zIndex:               300,
                    background:           'rgba(0,0,0,0.60)',
                    backdropFilter:       'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                    opacity:              isMobile && mobileOpen ? 1 : 0,
                    pointerEvents:        isMobile && mobileOpen ? 'auto' : 'none',
                    transition:           'opacity 300ms ease',
                }}
            />

            <Sidebar
                collapsed={isMobile ? false : collapsed}
                onToggle={toggleDesktop}
                isMobile={isMobile}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />

            <div style={{
                flex:           1,
                display:        'flex',
                flexDirection:  'column',
                minWidth:       0,
            }}>
                <Navbar
                    title={title}
                    onMenuToggle={isMobile ? toggleMobile : undefined}
                    isMobile={isMobile}
                />
                <main style={{
                    flex:          1,
                    padding:       isMobile ? '12px' : 'clamp(16px, 2vw, 24px)',
                    overflowY:     'auto',
                    overflowX:     'hidden',
                    transition:    'padding 300ms ease',
                    pointerEvents: isMobile && mobileOpen ? 'none' : 'auto',  
                }}>
                    <Outlet />
                </main>
            </div>

            <AiFab mobileMenuOpen={isMobile && mobileOpen} />
        </div>
    );
}
