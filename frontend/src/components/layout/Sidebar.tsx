/**
 * components/layout/Sidebar.tsx v5
 *
 * Arquitectura de dos capas para transición suave:
 *
 *   ┌─ aside (capa de layout) ────────────────────────────────────────────────┐
 *   │  Siempre en el flujo flex. Gestiona el ESPACIO que ocupa en el layout.  │
 *   │  width: 240 | 64 | 0 — con transition: width 320ms                     │
 *   │  El contenido del área principal se expande/contrae suavemente.         │
 *   │                                                                         │
 *   │  ┌─ div (capa visual) ───────────────────────────────────────────────┐  │
 *   │  │  Renderiza el panel visual real.                                  │  │
 *   │  │  Desktop → position: relative, sigue al aside                    │  │
 *   │  │  Mobile  → position: fixed, se desliza con transform             │  │
 *   │  └───────────────────────────────────────────────────────────────────┘  │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * Ventaja: al redimensionar el navegador, el aside transiciona su ancho por CSS
 * (sin saltos de React) → el contenido se adapta de forma casi imperceptible.
 */

import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../brand/Logo';

interface NavItem {
    path:     string;
    label:    string;
    icon:     string;
    badge?:   string;
    section?: string;
    roles?:   string[];
}

const NAV_ITEMS: NavItem[] = [
    { path: '/dashboard',      label: 'Dashboard',     icon: '◈', section: 'PRINCIPAL' },
    { path: '/productos',      label: 'Productos',      icon: '▣', section: 'INVENTARIO' },
    { path: '/stock',          label: 'Stock',          icon: '▦', badge: 'ACID' },
    { path: '/almacen',        label: 'Mapa Almacén',   icon: '▤' },
    { path: '/boveda',         label: 'La Bóveda',      icon: '◆' },
    { path: '/clientes',       label: 'Clientes',       icon: '◉', section: 'RELACIONES' },
    { path: '/proveedores',    label: 'Proveedores',    icon: '◎' },
    {
        path:    '/albaranes-rango',
        label:   'Albaranes',
        icon:    '◧',
        section: 'DOCUMENTOS',
        roles:   ['ADMIN', 'GESTOR_INVENTARIO', 'CONTABLE'],
    },
    { path: '/ai',             label: 'IA & Analytics', icon: '◇', section: 'INTELIGENCIA' },
    { path: '/usuarios',       label: 'Usuarios',       icon: '◈', section: 'ADMINISTRACIÓN', roles: ['ADMIN'] },
    { path: '/auditoria',      label: 'Auditoría',      icon: '▷', roles: ['ADMIN'] },
    { path: '/system',         label: 'Sistema',         icon: '◉', roles: ['ADMIN'] },
];

/* Emil: cubic-bezier(0.32, 0.72, 0, 1) es la curva iOS para drawers — mucho más natural */
const TRANSITION = '300ms cubic-bezier(0.32, 0.72, 0, 1)';

interface SidebarProps {
    collapsed:     boolean;
    onToggle:      () => void;
    isMobile:      boolean;
    mobileOpen:    boolean;
    onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }: SidebarProps): JSX.Element {
    const location       = useLocation();
    const { hasAnyRole } = useAuth();

    const isActive = useCallback(
        (path: string) => location.pathname.startsWith(path),
        [location.pathname]
    );

    // Ancho que ocupa en el flujo del layout
    const layoutWidth = isMobile ? 0 : collapsed ? 64 : 240;
    // Ancho visual del panel
    const panelWidth  = isMobile ? 260 : collapsed ? 64 : 240;
    // El panel muestra etiquetas cuando está expandido o en mobile (siempre expandido)
    const showLabels  = isMobile ? true : !collapsed;

    const visibleItems = NAV_ITEMS.filter(item =>
        !item.roles || hasAnyRole(item.roles as Parameters<typeof hasAnyRole>[0])
    );

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

    // ── Panel visual (la barra lateral propiamente dicha) ─────────────────────
    const panel = (
        <div style={{
            // Desktop → en flujo (relativo al aside padre)
            // Mobile  → overlay fijo sobre el contenido
            position:   isMobile ? 'fixed' : 'relative',
            top:        isMobile ? 0 : undefined,
            left:       isMobile ? 0 : undefined,
            bottom:     isMobile ? 0 : undefined,
            zIndex:     isMobile ? 200 : undefined,

            width:      `${panelWidth}px`,
            height:     isMobile ? '100dvh' : '100%',

            background:    'var(--sidebar-bg)',
            borderRight:   '1px solid var(--sidebar-border)',
            boxShadow:     isMobile
                ? 'var(--sidebar-shadow-mobile)'
                : 'var(--sidebar-shadow)',
            display:       'flex',
            flexDirection: 'column',
            overflow:      'hidden',

            // Mobile: deslizamiento; Desktop: sin transform
            transform:  isMobile
                ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)')
                : 'none',
            transition: isMobile
                ? `transform ${TRANSITION}`
                : `width ${TRANSITION}`,

            willChange: 'transform, width',
        }}>

            {/* ── Cabecera ── */}
            <div style={{
                height:         '64px',
                display:        'flex',
                alignItems:     'center',
                justifyContent: showLabels ? 'space-between' : 'center',
                padding:        showLabels ? '0 14px' : '0',
                borderBottom:   '1px solid var(--sidebar-border)',
                flexShrink:     0,
                gap:            '12px',
                overflow:       'hidden',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <Logo variant="mark" size={showLabels ? 38 : 34} style={{ flexShrink: 0 }} />
                    {showLabels && (
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

                {/* ✕ solo en mobile */}
                {isMobile && (
                    <button
                        onClick={onMobileClose}
                        style={{
                            background:   'transparent',
                            border:       '1px solid var(--sidebar-border)',
                            borderRadius: '6px',
                            color:        'var(--sidebar-text)',
                            cursor:       'pointer',
                            fontSize:     '15px',
                            padding:      '4px 8px',
                            lineHeight:   1,
                            flexShrink:   0,
                            transition:   `all ${TRANSITION}`,
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sidebar-glow)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text-active)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sidebar-border)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text)';
                        }}
                    >✕</button>
                )}
            </div>

            {/* ── Nav ── */}
            <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
                {sections.map(section => (
                    <div key={section.title}>
                        {section.title && showLabels && (
                            <div style={{
                                display:        'flex',
                                alignItems:     'center',
                                gap:            '8px',
                                padding:        '16px 16px 5px',
                            }}>
                                <div style={{
                                    width:      '14px',
                                    height:     '1px',
                                    background: 'var(--sidebar-text-muted)',
                                    opacity:    0.4,
                                    flexShrink: 0,
                                }} />
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '9px',
                                    fontWeight:    700,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    color:         'var(--sidebar-text-muted)',
                                    opacity:       0.6,
                                }}>
                                    {section.title}
                                </span>
                            </div>
                        )}
                        {section.items.map(item => {
                            const active = isActive(item.path);
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    title={!showLabels ? item.label : undefined}
                                    onClick={() => { if (isMobile) onMobileClose(); }}
                                    style={{
                                        display:        'flex',
                                        alignItems:     'center',
                                        gap:            '12px',
                                        padding:        '9px 16px',
                                        margin:         '1px 8px',
                                        borderRadius:   '8px',
                                        textDecoration: 'none',
                                        color:          active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                                        background:     active
                                            ? 'var(--sidebar-glow-fill)'
                                            : 'transparent',
                                        borderLeft:     active ? '2px solid var(--sidebar-indicator)' : '2px solid transparent',
                                        boxShadow:      'none',
                                        transition:     `background ${TRANSITION}, color ${TRANSITION}, border-color ${TRANSITION}`,
                                        position:       'relative',
                                        overflow:       'hidden',
                                        whiteSpace:     'nowrap',
                                    }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.color = 'var(--sidebar-text-active)';
                                        if (!active) el.style.background = 'var(--sidebar-glow-fill)';
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        if (!active) {
                                            el.style.color = 'var(--sidebar-text)';
                                            el.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <span style={{
                                        fontFamily: 'var(--font-mono)', fontSize: '15px', flexShrink: 0,
                                        color:      active ? 'var(--sidebar-icon-active)' : 'inherit',
                                        textShadow: 'none',
                                    }}>
                                        {item.icon}
                                    </span>
                                    {showLabels && (
                                        <>
                                            <span style={{
                                                fontFamily: 'var(--font-display)', fontSize: '12px',
                                                fontWeight: 600, letterSpacing: '0.06em',
                                                textTransform: 'uppercase', flex: 1,
                                            }}>
                                                {item.label}
                                            </span>
                                            {item.badge && (
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)', fontSize: '8px',
                                                    letterSpacing: '0.08em', color: 'var(--accent-cyan)',
                                                    border: '1px solid var(--accent-cyan)', borderRadius: '3px',
                                                    padding: '1px 4px', opacity: 0.7,
                                                }}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {active && (
                                        <div style={{
                                            position: 'absolute', left: 0, top: '20%', height: '60%',
                                            width: '2px', background: 'var(--sidebar-indicator)',
                                            borderRadius: '0 2px 2px 0',
                                            boxShadow: 'none',
                                        }} />
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* ── Footer COLAPSAR — solo desktop ── */}
            {!isMobile && (
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
                            fontSize: '13px', transition: `all ${TRANSITION}`,
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sidebar-glow)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text-active)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sidebar-border)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text)';
                        }}
                    >
                        <span>{collapsed ? '▶▶' : '◀◀'}</span>
                        {!collapsed && (
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                                COLAPSAR
                            </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        /*
         * Capa exterior: siempre en el flujo flex, su ancho transiciona suavemente.
         * Cuando layoutWidth pasa de 64→0 (al cruzar el breakpoint mobile),
         * el área de contenido se expande de forma imperceptible en 320ms.
         */
        <aside style={{
            width:      `${layoutWidth}px`,
            flexShrink: 0,
            transition: `width ${TRANSITION}`,
            overflow:   'visible',    // el panel visual puede desbordarse (fixed)
            position:   'relative',
            zIndex:     20,
        }}>
            {panel}
        </aside>
    );
}
