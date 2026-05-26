/**
 * components/layout/Sidebar.tsx v2
 *
 * Cambios:
 * - Logo completo "NEXUS ERP" con isotipo SVG corporativo
 * - Rutas completas incluyendo /almacen y /auditoria
 * - Sección ADMIN separada visualmente
 */

import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
    path:     string;
    label:    string;
    icon:     string;
    badge?:   string;
    adminOnly?:boolean;
    section?: string;
}

const NAV_ITEMS: NavItem[] = [
    // Principal
    { path: '/dashboard',   label: 'Dashboard',     icon: '◈',  section: 'PRINCIPAL' },
    // Inventario
    { path: '/productos',   label: 'Productos',      icon: '▣',  section: 'INVENTARIO' },
    { path: '/stock',       label: 'Stock',          icon: '▦',  badge: 'ACID' },
    { path: '/almacen',     label: 'Mapa Almacén',   icon: '▤' },
    { path: '/boveda',      label: 'La Bóveda',      icon: '◆' },
    // Clientes & Proveedores
    { path: '/clientes',    label: 'Clientes',       icon: '◉',  section: 'RELACIONES' },
    { path: '/proveedores', label: 'Proveedores',    icon: '◎' },
    // IA
    { path: '/ai',          label: 'IA & Analytics', icon: '◇',  section: 'INTELIGENCIA' },
    // Admin
    { path: '/usuarios',    label: 'Usuarios',       icon: '◈',  section: 'ADMINISTRACIÓN', adminOnly: true },
    { path: '/auditoria',   label: 'Auditoría',      icon: '▷',  adminOnly: true },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle:  () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps): JSX.Element {
    const location  = useLocation();
    const { hasRole } = useAuth();
    const isAdmin   = hasRole('ADMIN');

    const isActive = useCallback(
        (path: string) => location.pathname.startsWith(path),
        [location.pathname]
    );

    const width = collapsed ? 64 : 240;

    // Agrupa items por sección
    const sections: { title: string; items: NavItem[] }[] = [];
    let currentSection = '';
    NAV_ITEMS.forEach(item => {
        if (item.adminOnly && !isAdmin) return;
        if (item.section && item.section !== currentSection) {
            currentSection = item.section;
            sections.push({ title: item.section, items: [] });
        }
        if (sections.length === 0) sections.push({ title: '', items: [] });
        sections[sections.length - 1].items.push(item);
    });

    return (
        <aside style={{
            width:         `${width}px`,
            minHeight:     '100dvh',
            background:    'var(--bg-surface)',
            borderRight:   '1px solid var(--border-subtle)',
            display:       'flex',
            flexDirection: 'column',
            flexShrink:    0,
            transition:    'width 280ms cubic-bezier(0.25,0.46,0.45,0.94)',
            overflow:      'hidden',
            position:      'relative',
            zIndex:        20,
        }}>

            {/* Logo corporativo */}
            <div style={{
                height:       '56px',
                display:      'flex',
                alignItems:   'center',
                padding:      collapsed ? '0 14px' : '0 16px',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink:   0,
                gap:          '10px',
                overflow:     'hidden',
            }}>
                {/* Isotipo SVG */}
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <rect width="28" height="28" rx="6" fill="url(#logoGrad)"/>
                    <path d="M6 20V8l5 6 5-6v12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 14h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M17 11h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M17 17h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <defs>
                        <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#00ff88"/>
                            <stop offset="1" stopColor="#00d4ff"/>
                        </linearGradient>
                    </defs>
                </svg>

                {!collapsed && (
                    <div>
                        <div style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '15px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            background:    'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                            WebkitBackgroundClip:'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip:'text',
                            lineHeight:    1,
                        }}>
                            NEXUS
                        </div>
                        <div style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '9px',
                            color:         'var(--text-muted)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                        }}>
                            ERP SYSTEM
                        </div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
                {sections.map(section => (
                    <div key={section.title}>
                        {/* Separador de sección */}
                        {section.title && !collapsed && (
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '9px',
                                fontWeight:    700,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color:         'var(--text-muted)',
                                padding:       '12px 20px 4px',
                            }}>
                                {section.title}
                            </div>
                        )}
                        {section.items.map(item => {
                            const active = isActive(item.path);
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    title={collapsed ? item.label : undefined}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '9px 20px', margin: '1px 8px',
                                        borderRadius: '6px', textDecoration: 'none',
                                        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        background: active ? 'var(--accent-primary-glow)' : 'transparent',
                                        border: active ? '1px solid var(--border-accent)' : '1px solid transparent',
                                        transition: 'all 140ms ease',
                                        position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; } }}
                                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; } }}
                                >
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', flexShrink: 0, textShadow: active ? '0 0 8px var(--accent-primary)' : 'none' }}>
                                        {item.icon}
                                    </span>

                                    {!collapsed && (
                                        <>
                                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>
                                                {item.label}
                                            </span>
                                            {item.badge && (
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', borderRadius: '3px', padding: '1px 4px', opacity: 0.7 }}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}

                                    {active && (
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: 'var(--accent-primary)', borderRadius: '0 2px 2px 0', boxShadow: '0 0 8px var(--accent-primary)' }} />
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer colapsar */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 8px' }}>
                <button
                    onClick={onToggle}
                    title={collapsed ? 'Expandir' : 'Colapsar'}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: '10px', padding: '7px 12px',
                        background: 'transparent', border: '1px solid var(--border-subtle)',
                        borderRadius: '6px', color: 'var(--text-muted)',
                        cursor: 'pointer', fontFamily: 'var(--font-mono)',
                        fontSize: '13px', transition: 'all 140ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                >
                    <span>{collapsed ? '▶▶' : '◀◀'}</span>
                    {!collapsed && <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase' }}>COLAPSAR</span>}
                </button>
            </div>
        </aside>
    );
}
