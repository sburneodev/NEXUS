import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/* ──────────────────────────────────────────────────────────────────
   Sidebar — Navegación lateral del ERP.
   Colapsable: modo expandido (240px) y modo icono (64px).
   Indica la ruta activa con acento verde neón.
────────────────────────────────────────────────────────────────── */

interface NavItem {
    path: string;
    label: string;
    icon: string;
    badge?: string;
}

const NAV_ITEMS: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '◈' },
    { path: '/productos', label: 'Productos', icon: '▣' },
    { path: '/clientes', label: 'Clientes', icon: '◉' },
    { path: '/proveedores', label: 'Proveedores', icon: '◎' },
    { path: '/stock', label: 'Stock', icon: '▦', badge: 'ACID' },
    { path: '/boveda', label: 'La Bóveda', icon: '◆' },
    { path: '/ai', label: 'IA / Analytics', icon: '◇' },
    { path: '/usuarios', label: 'Usuarios', icon: '◈' },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps): JSX.Element {
    const location = useLocation();

    const isActive = useCallback(
        (path: string) => location.pathname.startsWith(path),
        [location.pathname]
    );

    const width = collapsed ? 64 : 240;

    return (
        <aside style={{
            width: `${width}px`,
            minHeight: '100dvh',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            transition: 'width 280ms cubic-bezier(0.25,0.46,0.45,0.94)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 20,
        }}>

            {/* Logo */}
            <div style={{
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                padding: collapsed ? '0 16px' : '0 20px',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink: 0,
                gap: '10px',
                overflow: 'hidden',
            }}>
                <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    flexShrink: 0,
                    filter: 'drop-shadow(0 0 8px rgba(0,255,136,0.4))',
                }}>
                    NX
                </span>
                {!collapsed && (
                    <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '14px',
                        fontWeight: 600,
                        letterSpacing: '0.10em',
                        color: 'var(--text-primary)',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                    }}>
                        NEXUS ERP
                    </span>
                )}
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
                {NAV_ITEMS.map(item => {
                    const active = isActive(item.path);
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={collapsed ? item.label : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: collapsed ? '10px 20px' : '10px 20px',
                                margin: '2px 8px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                background: active ? 'var(--accent-primary-glow)' : 'transparent',
                                border: active ? '1px solid var(--border-accent)' : '1px solid transparent',
                                transition: 'all 160ms ease',
                                position: 'relative',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => {
                                if (!active) {
                                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)';
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!active) {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            {/* Icono */}
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '16px',
                                flexShrink: 0,
                                textShadow: active ? '0 0 8px var(--accent-primary)' : 'none',
                            }}>
                                {item.icon}
                            </span>

                            {/* Label */}
                            {!collapsed && (
                                <span style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    flex: 1,
                                }}>
                                    {item.label}
                                </span>
                            )}

                            {/* Badge */}
                            {!collapsed && item.badge && (
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '8px',
                                    letterSpacing: '0.08em',
                                    color: 'var(--accent-cyan)',
                                    border: '1px solid var(--accent-cyan)',
                                    borderRadius: '3px',
                                    padding: '1px 4px',
                                    opacity: 0.7,
                                }}>
                                    {item.badge}
                                </span>
                            )}

                            {/* Indicador activo */}
                            {active && (
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '20%',
                                    height: '60%',
                                    width: '2px',
                                    background: 'var(--accent-primary)',
                                    borderRadius: '0 2px 2px 0',
                                    boxShadow: '0 0 8px var(--accent-primary)',
                                }} />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Footer sidebar */}
            <div style={{
                borderTop: '1px solid var(--border-subtle)',
                padding: '12px 8px',
            }}>
                {/* Botón colapsar */}
                <button
                    onClick={onToggle}
                    title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: '10px',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '14px',
                        transition: 'all 160ms ease',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                    }}
                >
                    <span>{collapsed ? '▶▶' : '◀◀'}</span>
                    {!collapsed && (
                        <span style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                        }}>
                            COLAPSAR
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
}
