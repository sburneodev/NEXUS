/**
 * components/layout/Sidebar.tsx v3
 *
 * Cambios respecto a v2:
 * - Nueva entrada "Albaranes" en sección DOCUMENTOS,
 *   visible para ADMIN, GESTOR_INVENTARIO y CONTABLE.
 */

import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../brand/Logo';

interface NavItem {
    path:      string;
    label:     string;
    icon:      string;
    badge?:    string;
    section?:  string;
    /** Si se define, el item solo se muestra si el usuario tiene alguno de esos roles */
    roles?:    string[];
}

const NAV_ITEMS: NavItem[] = [
    // Principal
    { path: '/dashboard',       label: 'Dashboard',      icon: '◈', section: 'PRINCIPAL' },
    // Inventario
    { path: '/productos',       label: 'Productos',       icon: '▣', section: 'INVENTARIO' },
    { path: '/stock',           label: 'Stock',           icon: '▦', badge: 'ACID' },
    { path: '/almacen',         label: 'Mapa Almacén',    icon: '▤' },
    { path: '/boveda',          label: 'La Bóveda',       icon: '◆' },
    // Clientes & Proveedores
    { path: '/clientes',        label: 'Clientes',        icon: '◉', section: 'RELACIONES' },
    { path: '/proveedores',     label: 'Proveedores',     icon: '◎' },
    // Documentos — visible para ADMIN, GESTOR_INVENTARIO y CONTABLE
    {
        path:    '/albaranes-rango',
        label:   'Albaranes',
        icon:    '◧',
        section: 'DOCUMENTOS',
        roles:   ['ADMIN', 'GESTOR_INVENTARIO', 'CONTABLE'],
    },
    // IA
    { path: '/ai',              label: 'IA & Analytics',  icon: '◇', section: 'INTELIGENCIA' },
    // Admin
    { path: '/usuarios',        label: 'Usuarios',        icon: '◈', section: 'ADMINISTRACIÓN', roles: ['ADMIN'] },
    { path: '/auditoria',       label: 'Auditoría',       icon: '▷', roles: ['ADMIN'] },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle:  () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps): JSX.Element {
    const location       = useLocation();
    const { hasAnyRole } = useAuth();

    const isActive = useCallback(
        (path: string) => location.pathname.startsWith(path),
        [location.pathname]
    );

    const width = collapsed ? 64 : 240;

    // Filtrar items según roles del usuario
    const visibleItems = NAV_ITEMS.filter(item =>
        !item.roles || hasAnyRole(item.roles as Parameters<typeof hasAnyRole>[0])
    );

    // Agrupar por sección
    const sections: { title: string; items: NavItem[] }[] = [];
    let currentSection = '';
    visibleItems.forEach(item => {
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
            background:    'var(--sidebar-bg)',
            borderRight:   '1px solid var(--sidebar-border)',
            display:       'flex',
            flexDirection: 'column',
            flexShrink:    0,
            transition:    'width 280ms cubic-bezier(0.25,0.46,0.45,0.94)',
            overflow:      'hidden',
            position:      'relative',
            zIndex:        20,
        }}>

            {/* Logo */}
            <div style={{
                height:         '64px',
                display:        'flex',
                alignItems:     'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding:        collapsed ? '0' : '0 14px',
                borderBottom:   '1px solid var(--sidebar-border)',
                flexShrink:     0,
                gap:            '12px',
                overflow:       'hidden',
            }}>
                <Logo variant="mark" size={collapsed ? 34 : 38} style={{ flexShrink: 0 }} />
                {!collapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <div style={{
                            fontFamily:           'var(--font-display)',
                            fontSize:             '22px',
                            fontWeight:           700,
                            letterSpacing:        '0.14em',
                            lineHeight:           1,
                            background:           'linear-gradient(135deg, var(--sidebar-logo-from), var(--sidebar-logo-to))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor:  'transparent',
                            backgroundClip:       'text',
                        }}>
                            NEXUS
                        </div>
                        <div style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '9.5px',
                            fontWeight:    500,
                            color:         'var(--sidebar-text)',
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            lineHeight:    1,
                            opacity:       0.85,
                        }}>
                            ERP · LEVELUP
                        </div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
                {sections.map(section => (
                    <div key={section.title}>
                        {section.title && !collapsed && (
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '9px',
                                fontWeight:    700,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color:         'var(--sidebar-text-muted)',
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
                                        color:      active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                                        background: active ? 'var(--sidebar-active-bg)'   : 'transparent',
                                        boxShadow:  active
                                            ? 'inset 0 0 0 1px var(--sidebar-glow), inset 0 0 14px var(--sidebar-glow-fill)'
                                            : 'none',
                                        border: '1px solid transparent',
                                        transition: 'box-shadow 160ms ease, color 160ms ease',
                                        position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.color = 'var(--sidebar-text-active)';
                                        if (!active) el.style.boxShadow = 'inset 0 0 0 1px var(--sidebar-glow), inset 0 0 10px var(--sidebar-glow-fill)';
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        if (!active) { el.style.color = 'var(--sidebar-text)'; el.style.boxShadow = 'none'; }
                                    }}
                                >
                                    <span style={{
                                        fontFamily: 'var(--font-mono)', fontSize: '15px', flexShrink: 0,
                                        color:      active ? 'var(--sidebar-icon-active)' : 'inherit',
                                        textShadow: active ? '0 0 8px var(--sidebar-glow-text)' : 'none',
                                    }}>
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
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: 'var(--sidebar-indicator)', borderRadius: '0 2px 2px 0', boxShadow: '0 0 8px var(--sidebar-glow-text)' }} />
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer colapsar */}
            <div style={{ borderTop: '1px solid var(--sidebar-border)', padding: '10px 8px' }}>
                <button
                    onClick={onToggle}
                    title={collapsed ? 'Expandir' : 'Colapsar'}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: '10px', padding: '7px 12px',
                        background: 'transparent', border: '1px solid var(--sidebar-border)',
                        borderRadius: '6px', color: 'var(--sidebar-text)',
                        cursor: 'pointer', fontFamily: 'var(--font-mono)',
                        fontSize: '13px', transition: 'all 140ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sidebar-glow)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text-active)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sidebar-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text)'; }}
                >
                    <span>{collapsed ? '▶▶' : '◀◀'}</span>
                    {!collapsed && <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase' }}>COLAPSAR</span>}
                </button>
            </div>
        </aside>
    );
}