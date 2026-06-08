import { useEffect, useState, useMemo } from 'react';
import { useTheme }         from '../hooks/useTheme';
import { useBreakpoint }    from '../hooks/useBreakpoint';
import api                  from '../services/api';
import type { KpiData }     from '../types/models';
import { KpiCard }          from '../components/dashboard/KpiCard';
import { ChartsPanel }      from '../components/dashboard/ChartsPanel';
import { productoService }  from '../services/productoService';
import { clienteService }   from '../services/entidadService';

// ── Serie de ventas demo ──────────────────────────────────────────────
const VENTAS_DEMO = Array.from({ length: 30 }, (_, i) => ({
    fecha:    new Date(Date.now() - (29-i)*86400000).toISOString().split('T')[0],
    total:    Math.floor(380 + Math.sin(i * 0.45) * 160 + Math.random() * 220),
    unidades: Math.floor(4   + Math.sin(i * 0.45) * 2   + Math.random() * 7),
}));

const BASE_KPI: KpiData = {
    ventasHoy:              0,
    ventasAyer:             0,
    clientesActivos:        0,
    clientesNuevosSemana:   0,
    piezasRetroDisponibles: 0,
    productosStockCritico:  0,
    productosStockBajo:     0,
    ventasUltimos30Dias:    VENTAS_DEMO,
};

export function DashboardPage(): JSX.Element {
    const { isDark }  = useTheme();
    const { isMobile, isTablet } = useBreakpoint();
    const [kpiData,   setKpiData]   = useState<KpiData>(BASE_KPI);
    const [loadState, setLoadState] = useState<'loading'|'ok'|'error'>('loading');

const glow = isDark
        ? { green: 'rgba(59,130,246,0.30)', cyan: 'rgba(56,189,248,0.28)', gold: 'rgba(251,191,36,0.28)', danger: 'rgba(248,113,113,0.28)' }
        : { green: 'rgba(37,99,235,0.22)',  cyan: 'rgba(8,145,178,0.22)',  gold: 'rgba(217,119,6,0.22)',  danger: 'rgba(220,38,38,0.22)'  };

    useEffect(() => {
        let cancelled = false;

        Promise.allSettled([
            api.get<KpiData>('/dashboard/analytics'),
            productoService.listar(0, 200, 'RETRO'),
            productoService.listar(0, 200, 'ESTANDAR'),
            clienteService.listar('', 0, 1),
        ]).then(([analyticsRes, retroRes, estandarRes, clientesRes]) => {
            if (cancelled) return;

            let merged: KpiData = { ...BASE_KPI };

            if (analyticsRes.status === 'fulfilled') {
                merged = { ...merged, ...analyticsRes.value.data };
                setLoadState('ok');
            } else {
                setLoadState('error');
            }

            if (retroRes.status === 'fulfilled')
                merged.piezasRetroDisponibles = retroRes.value.totalElements;

            if (estandarRes.status === 'fulfilled') {
                const estandar = estandarRes.value.content;
                merged.productosStockCritico = estandar.filter(p => p.stockActual <= p.stockMinimo).length;
                merged.productosStockBajo    = estandar.filter(p => p.stockActual > p.stockMinimo && p.stockActual <= p.stockMinimo * 2).length;
            }

            if (clientesRes.status === 'fulfilled')
                merged.clientesActivos = clientesRes.value.totalElements;

            if (!merged.ventasUltimos30Dias?.length)
                merged.ventasUltimos30Dias = VENTAS_DEMO;

            setKpiData(merged);
        });

        return () => { cancelled = true; };
    }, []);

    const trend = useMemo(
        () => kpiData.ventasHoy >= kpiData.ventasAyer ? 'up' : 'down',
        [kpiData.ventasHoy, kpiData.ventasAyer]
    );
    const pctVentas = kpiData.ventasAyer > 0
        ? Math.round(((kpiData.ventasHoy - kpiData.ventasAyer) / kpiData.ventasAyer) * 100)
        : 0;

    // Número de columnas según breakpoint
    const kpiCols = isMobile ? 2 : isTablet ? 2 : 4;

    return (
        <div style={{
            // Desktop: altura fija para que las gráficas llenen el espacio
            // Mobile/tablet: alto automático y scroll natural
            height:        isMobile || isTablet ? 'auto' : 'calc(100dvh - 104px)',
            minHeight:     isMobile || isTablet ? 'auto' : undefined,
            display:       'flex',
            flexDirection: 'column',
            gap:           isMobile ? '10px' : '12px',
            overflow:      isMobile || isTablet ? 'visible' : 'hidden',
        }}>

            {/* Cabecera */}
            <div style={{ flexShrink: 0 }}>
                <p style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      'var(--text-xs)',
                    color:         'var(--text-muted)',
                    margin:        0,
                    letterSpacing: '0.04em',
                }}>
                    {new Date().toLocaleDateString('es-ES', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                    {loadState === 'error' && (
                        <span style={{
                            marginLeft:   '12px',
                            color:        'var(--accent-gold)',
                            border:       '1px solid var(--accent-gold)',
                            borderRadius: '3px',
                            padding:      '1px 6px',
                            fontSize:     '9px',
                        }}>VENTAS DEMO</span>
                    )}
                </p>
            </div>

            {/* KPIs */}
            <div style={{
                flexShrink:          0,
                display:             'grid',
                gridTemplateColumns: `repeat(${kpiCols}, 1fr)`,
                gap:                 isMobile ? '8px' : '12px',
            }}>
                <KpiCard
                    title="VENTAS HOY"
                    value={kpiData.ventasHoy > 0 ? `€${kpiData.ventasHoy.toLocaleString('es-ES')}` : '—'}
                    sub={kpiData.ventasAyer > 0 ? `${pctVentas >= 0 ? '+' : ''}${pctVentas}% vs ayer` : 'Sin datos de ventas'}
                    icon="€"
                    accent="var(--accent-primary)"
                    glow={glow.green}
                    trend={kpiData.ventasHoy > 0 ? trend : 'neutral'}
                    delay={0}
                />
                <KpiCard
                    title="CLIENTES ACTIVOS"
                    value={kpiData.clientesActivos > 0 ? kpiData.clientesActivos.toLocaleString('es-ES') : loadState === 'loading' ? '…' : '—'}
                    sub={kpiData.clientesNuevosSemana > 0 ? `+${kpiData.clientesNuevosSemana} esta semana` : 'Conectando con API'}
                    icon="◉"
                    accent="var(--accent-cyan)"
                    glow={glow.cyan}
                    trend={kpiData.clientesActivos > 0 ? 'up' : 'neutral'}
                    delay={60}
                />
                <KpiCard
                    title="BÓVEDA RETRO"
                    value={loadState === 'loading' ? '…' : String(kpiData.piezasRetroDisponibles)}
                    sub="piezas únicas disponibles"
                    icon="◆"
                    accent="var(--accent-gold)"
                    glow={glow.gold}
                    trend="neutral"
                    delay={120}
                />
                <KpiCard
                    title="STOCK CRÍTICO"
                    value={loadState === 'loading' ? '…' : String(kpiData.productosStockCritico)}
                    sub={kpiData.productosStockCritico > 0 ? `${kpiData.productosStockBajo} en zona de alerta` : 'Todo el stock en orden'}
                    icon="▦"
                    accent="var(--accent-danger)"
                    glow={glow.danger}
                    trend={kpiData.productosStockCritico > 0 ? 'down' : 'neutral'}
                    delay={180}
                />
            </div>

            {/* Contenido principal — gráficas + NL2SQL en scroll */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Gráficas */}
                <ChartsPanel kpiData={kpiData} />

{/* Espaciado final para que el scroll no quede pegado al FAB */}
                <div style={{ height: '80px', flexShrink: 0 }} />
            </div>
        </div>
    );
}