import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

/* ──────────────────────────────────────────────────────────────────
   Layout — Shell principal del ERP.
   Sidebar colapsable + Navbar fija + área de contenido.
   <Outlet /> renderiza la página activa según la ruta.
────────────────────────────────────────────────────────────────── */

const ROUTE_TITLES: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/productos': 'Productos',
    '/clientes': 'Clientes',
    '/proveedores': 'Proveedores',
    '/stock': 'Control de Stock',
    '/boveda': 'La Bóveda Retro',
    '/ai': 'IA & Analytics',
    '/usuarios': 'Gestión de Usuarios',
};

export function Layout(): JSX.Element {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    const toggle = useCallback(() => setCollapsed(prev => !prev), []);

    const title = Object.entries(ROUTE_TITLES).find(([path]) =>
        location.pathname.startsWith(path)
    )?.[1] ?? 'NEXUS ERP';

    return (
        <div style={{
            display: 'flex',
            minHeight: '100dvh',
            background: 'var(--bg-base)',
        }}>

            {/* Sidebar */}
            <Sidebar collapsed={collapsed} onToggle={toggle} />

            {/* Área principal */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                overflow: 'hidden',
            }}>

                {/* Navbar */}
                <Navbar title={title} />

                {/* Contenido de la página */}
                <main style={{
                    flex: 1,
                    padding: '24px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                }}>
                    <Outlet />
                </main>

                {/* Footer */}
                <footer style={{
                    height: '32px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    flexShrink: 0,
                }}>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.08em',
                    }}>
                        NEXUS ERP v1.1.0 · LevelUp Arcade · {new Date().getFullYear()}
                    </span>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.06em',
                    }}>
                        👾 LA BÓVEDA RETRO
                    </span>
                </footer>

            </div>
        </div>
    );
}
