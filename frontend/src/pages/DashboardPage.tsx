import { useEffect, useState, useMemo } from 'react';
import { useTheme }         from '../hooks/useTheme';
import api                  from '../services/api';
import type { KpiData }     from '../types/models';
import { KpiCard }          from '../components/dashboard/KpiCard';
import { ChartsPanel }      from '../components/dashboard/ChartsPanel';
import { Nl2SqlPanel }      from '../components/ai/Nl2SqlPanel';
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
    const [kpiData,   setKpiData]   = useState<KpiData>(BASE_KPI);
    const [loadState, setLoadState] = useState<'loading'|'ok'|'error'>('loading');

    // UI-04 — estado para mostrar/ocultar el panel NL2SQL
    const [showNl2Sql, setShowNl2Sql] = useState(false);

    const glow = isDark
        ? { green: 'rgba(0,255,136,0.40)', cyan: 'rgba(0,212,255,0.40)', gold: 'rgba(255,200,69,0.40)', danger: 'rgba(255,68,102,0.40)' }
        : { green: 'rgba(0,255,136,0.32)', cyan: 'rgba(0,212,255,0.32)', gold: 'rgba(255,200,69,0.35)', danger: 'rgba(255,68,102,0.35)' };

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

    return (
        <div style={{
            height:        'calc(100dvh - 104px)',
            display:       'flex',
            flexDirection: 'column',
            gap:           '12px',
            overflow:      'hidden',
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
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap:                 '12px',
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

                {/* UI-04 — Panel NL2SQL ──────────────────────────────── */}
                <div style={{
                    background:   'var(--bg-surface)',
                    border:       '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xl)',
                    overflow:     'hidden',
                    flexShrink:    0,
                }}>
                    {/* Cabecera del panel — siempre visible, hace toggle */}
                    <button
                        onClick={() => setShowNl2Sql(v => !v)}
                        style={{
                            width:          '100%',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'space-between',
                            padding:        '14px 20px',
                            background:     'transparent',
                            border:         'none',
                            cursor:         'pointer',
                            borderBottom:   showNl2Sql ? '1px solid var(--border-subtle)' : 'none',
                            transition:     'border-color 160ms',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Indicador animado */}
                            <span style={{
                                width:        '8px',
                                height:       '8px',
                                borderRadius: '50%',
                                background:   'var(--accent-primary)',
                                boxShadow:    '0 0 8px var(--accent-primary)',
                                display:      'inline-block',
                                flexShrink:   0,
                                animation:    'pulse-green 2s infinite',
                            }} />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{
                                    fontFamily:    'var(--font-display)',
                                    fontSize:      '13px',
                                    fontWeight:    700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color:         'var(--text-primary)',
                                }}>
                                    Motor NL2SQL — Consulta en Español
                                </div>
                                <div style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '10px',
                                    color:         'var(--text-muted)',
                                    letterSpacing: '0.04em',
                                    marginTop:     '2px',
                                }}>
                                    Pregunta sobre el negocio en lenguaje natural · Gemini traduce a SQL y ejecuta
                                </div>
                            </div>
                        </div>

                        {/* Chevron toggle */}
                        <span style={{
                            fontFamily:  'var(--font-mono)',
                            fontSize:    '12px',
                            color:       'var(--text-muted)',
                            transform:   showNl2Sql ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition:  'transform 220ms var(--ease-smooth)',
                            flexShrink:  0,
                        }}>
                            ▼
                        </span>
                    </button>

                    {/* Panel expandible */}
                    {showNl2Sql && (
                        <div style={{ padding: '20px 24px 24px' }}>
                            <Nl2SqlPanel />
                        </div>
                    )}
                </div>

                {/* Espaciado final para que el scroll no quede pegado al FAB */}
                <div style={{ height: '80px', flexShrink: 0 }} />
            </div>
        </div>
    );
}