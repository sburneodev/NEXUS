/**
 * pages/AiPage.tsx — Épica 8: IA & Analytics
 *
 * Reemplaza el <ComingSoon> de la ruta /ai.
 * Agrupa las tres herramientas de IA en pestañas:
 *   1. Informe Logístico  — InformeStockService (GESTOR_INVENTARIO, ADMIN)
 *   2. Asistente Recompra — RecompraService     (CAJERO, GESTOR_INVENTARIO, ADMIN)
 *   3. NL2SQL             — NL2SQLService        (MARKETING_ANALYST, ADMIN)
 *
 * El Tasador ya vive en BovedaRetroPage (TasadorIA component).
 * El NL2SQL también aparece en Dashboard pero aquí tiene más espacio.
 */

import { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { AsistenteRecompraPanel } from '../components/ai/AsistenteRecompraPanel';
import { Nl2SqlPanel }            from '../components/ai/Nl2SqlPanel';
import { InformeLogisticoPanel }  from '../components/ai/InformeLogisticoPanel';

type TabId = 'informe' | 'recompra' | 'nl2sql';

interface Tab {
    id:       TabId;
    label:    string;
    icon:     string;
    roles:    string[];
    subtitle: string;
}

const TABS: Tab[] = [
    {
        id:       'informe',
        label:    'Informe Logístico',
        icon:     '▤',
        roles:    ['GESTOR_INVENTARIO', 'ADMIN'],
        subtitle: 'Análisis automático de stock bajo mínimo y plan de pedidos',
    },
    {
        id:       'recompra',
        label:    'Asistente Recompra',
        icon:     '◆',
        roles:    ['CAJERO', 'GESTOR_INVENTARIO', 'ADMIN'],
        subtitle: 'Analiza piezas retro que te ofrecen y decide si comprar',
    },
    {
        id:       'nl2sql',
        label:    'Consultas NL2SQL',
        icon:     '◇',
        roles:    ['MARKETING_ANALYST', 'ADMIN'],
        subtitle: 'Pregunta en español, Gemini genera el SQL y ejecuta',
    },
];

export function AiPage(): JSX.Element {
    const { hasAnyRole } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('informe');

    // Filtrar pestañas según roles del usuario
    const visibleTabs = TABS.filter(t =>
        hasAnyRole(t.roles as Parameters<typeof hasAnyRole>[0])
    );

    // Si el tab activo no es visible para este rol, usar el primero disponible
    const safeTab = visibleTabs.find(t => t.id === activeTab) ?? visibleTabs[0];

    if (visibleTabs.length === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '48px', marginBottom: '12px', opacity: 0.15 }}>◇</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Sin acceso
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Tu rol no tiene acceso a los módulos de IA
                    </div>
                </div>
            </div>
        );
    }

    const currentTab = safeTab;

    return (
        <div style={{
            height:        'calc(100dvh - 104px)',
            display:       'flex',
            flexDirection: 'column',
            gap:           '16px',
            minHeight:     0,
        }}>

            {/* Cabecera */}
            <div style={{ flexShrink: 0 }}>
                <h1 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(16px, 2vw, 22px)',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color:         'var(--text-primary)',
                    margin:        0,
                }}>
                    IA & Analytics
                </h1>
                <p style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '11px',
                    color:         'var(--text-muted)',
                    margin:        '4px 0 0',
                    letterSpacing: '0.04em',
                }}>
                    Inteligencia artificial aplicada al negocio
                </p>
            </div>

            {/* Pestañas */}
            <div style={{
                flexShrink:  0,
                display:     'flex',
                gap:         '4px',
                borderBottom:'1px solid var(--border-default)',
                paddingBottom:'0',
            }}>
                {visibleTabs.map(tab => {
                    const isActive = tab.id === currentTab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display:       'flex',
                                alignItems:    'center',
                                gap:           '7px',
                                padding:       '10px 16px',
                                background:    'transparent',
                                border:        'none',
                                borderBottom:  isActive
                                    ? '2px solid var(--accent-primary)'
                                    : '2px solid transparent',
                                cursor:        'pointer',
                                color:         isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontFamily:    'var(--font-display)',
                                fontSize:      '11px',
                                fontWeight:    700,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                transition:    'all 160ms ease',
                                marginBottom:  '-1px',  // overlap the border-bottom
                                whiteSpace:    'nowrap',
                            }}
                            onMouseEnter={e => {
                                if (!isActive)
                                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                            }}
                            onMouseLeave={e => {
                                if (!isActive)
                                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                            }}
                        >
                            <span style={{ fontSize: '13px' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Descripción del tab activo */}
            <div style={{
                flexShrink:    0,
                fontFamily:    'var(--font-mono)',
                fontSize:      '11px',
                color:         'var(--text-muted)',
                letterSpacing: '0.04em',
                padding:       '0 2px',
            }}>
                {currentTab.subtitle}
            </div>

            {/* Contenido del tab */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {currentTab.id === 'informe'  && <InformeLogisticoPanel />}
                {currentTab.id === 'recompra' && <AsistenteRecompraPanel />}
                {currentTab.id === 'nl2sql'   && <Nl2SqlPanel />}
            </div>
        </div>
    );
}