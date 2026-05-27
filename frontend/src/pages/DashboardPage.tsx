import { useEffect, useState, useMemo } from 'react';
import { useAuth }          from '../hooks/useAuth';
import { useTheme }         from '../hooks/useTheme';
import api                  from '../services/api';
import type { KpiData }     from '../types/models';
import { KpiCard }          from '../components/dashboard/KpiCard';
import { ChartsPanel }      from '../components/dashboard/ChartsPanel';
import { MOCK_PRODUCTOS }   from '../mocks/mockProductos';
import { clienteService }   from '../services/entidadService';

// ── KPIs derivados de los datos reales de productos ───────────────────
// Se calculan una sola vez al cargar el módulo (fuente de verdad: mock compartido)
const _activos      = MOCK_PRODUCTOS.filter(p => p.activo);
const _retro        = _activos.filter(p => p.tipoProducto === 'RETRO');
const _estandar     = _activos.filter(p => p.tipoProducto === 'ESTANDAR');

const KPI_PRODUCTOS = {
    piezasRetroDisponibles: _retro.length,
    productosStockCritico:  _estandar.filter(p => p.stockActual <= p.stockMinimo).length,
    productosStockBajo:     _estandar.filter(
        p => p.stockActual > p.stockMinimo && p.stockActual <= p.stockMinimo * 2
    ).length,
};

// ── Serie de ventas demo (onda + ruido) ───────────────────────────────
// Generada una vez, estable durante la sesión
const VENTAS_DEMO = Array.from({ length: 30 }, (_, i) => ({
    fecha:    new Date(Date.now() - (29-i)*86400000).toISOString().split('T')[0],
    total:    Math.floor(380 + Math.sin(i * 0.45) * 160 + Math.random() * 220),
    unidades: Math.floor(4   + Math.sin(i * 0.45) * 2   + Math.random() * 7),
}));

// ── Datos base (productos reales + ventas demo + clientes pendientes) ─
const BASE_KPI: KpiData = {
    ventasHoy:            0,
    ventasAyer:           0,
    clientesActivos:      0,
    clientesNuevosSemana: 0,
    ...KPI_PRODUCTOS,
    ventasUltimos30Dias:  VENTAS_DEMO,
};

export function DashboardPage(): JSX.Element {
    const { user }       = useAuth();
    const { isDark }     = useTheme();
    const [kpiData,    setKpiData]    = useState<KpiData>(BASE_KPI);
    const [loadState,  setLoadState]  = useState<'loading'|'ok'|'error'>('loading');

    // Glow values — en light mode usamos los neones reales para que
    // el text-shadow de los KPIs tenga el mismo impacto visual que dark.
    // El color del texto es WCAG-compliant (#059669 etc.) pero el resplandor
    // usa los neones para crear la misma "luminosidad" de datos que en oscuro.
    const glow = isDark
        ? { green: 'rgba(0,255,136,0.40)', cyan: 'rgba(0,212,255,0.40)', gold: 'rgba(255,200,69,0.40)', danger: 'rgba(255,68,102,0.40)' }
        : { green: 'rgba(0,255,136,0.32)', cyan: 'rgba(0,212,255,0.32)', gold: 'rgba(255,200,69,0.35)', danger: 'rgba(255,68,102,0.35)' };

    useEffect(() => {
        let cancelled = false;

        // Llamadas en paralelo: analytics + conteo de clientes
        Promise.allSettled([
            api.get<KpiData>('/dashboard/analytics'),
            clienteService.listar('', 0, 1),
        ]).then(([analyticsRes, clientesRes]) => {
            if (cancelled) return;

            // Partimos siempre de los KPIs de producto reales
            let merged: KpiData = { ...BASE_KPI };

            if (analyticsRes.status === 'fulfilled') {
                // El backend puede sobrescribir cualquier campo, pero nunca borrará los de productos
                merged = { ...merged, ...analyticsRes.value.data, ...KPI_PRODUCTOS };
                setLoadState('ok');
            } else {
                setLoadState('error');
            }

            // Conteo real de clientes (endpoint paginado)
            if (clientesRes.status === 'fulfilled') {
                merged.clientesActivos = clientesRes.value.totalElements;
            }

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
                <h1 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(18px, 2.2vw, 24px)',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color:         'var(--text-primary)',
                    margin:        0,
                }}>
                    Bienvenido,{' '}
                    <span style={{
                        background:            'linear-gradient(135deg,var(--accent-primary),var(--accent-cyan))',
                        WebkitBackgroundClip:  'text',
                        WebkitTextFillColor:   'transparent',
                        backgroundClip:        'text',
                    }}>
                        {user?.email.split('@')[0] ?? 'Operador'}
                    </span>
                </h1>
                <p style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      'var(--text-xs)',
                    color:         'var(--text-muted)',
                    margin:        '4px 0 0',
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
                    value={kpiData.ventasHoy > 0
                        ? `€${kpiData.ventasHoy.toLocaleString('es-ES')}`
                        : '—'}
                    sub={kpiData.ventasAyer > 0
                        ? `${pctVentas >= 0 ? '+' : ''}${pctVentas}% vs ayer`
                        : 'Sin datos de ventas'}
                    icon="€"
                    accent="var(--accent-primary)"
                    glow={glow.green}
                    trend={kpiData.ventasHoy > 0 ? trend : 'neutral'}
                    delay={0}
                />
                <KpiCard
                    title="CLIENTES ACTIVOS"
                    value={kpiData.clientesActivos > 0
                        ? kpiData.clientesActivos.toLocaleString('es-ES')
                        : loadState === 'loading' ? '…' : '—'}
                    sub={kpiData.clientesNuevosSemana > 0
                        ? `+${kpiData.clientesNuevosSemana} esta semana`
                        : 'Conectando con API'}
                    icon="◉"
                    accent="var(--accent-cyan)"
                    glow={glow.cyan}
                    trend={kpiData.clientesActivos > 0 ? 'up' : 'neutral'}
                    delay={60}
                />
                <KpiCard
                    title="BÓVEDA RETRO"
                    value={String(kpiData.piezasRetroDisponibles)}
                    sub={`de ${MOCK_PRODUCTOS.filter(p => p.tipoProducto === 'RETRO').length} en catálogo`}
                    icon="◆"
                    accent="var(--accent-gold)"
                    glow={glow.gold}
                    trend="neutral"
                    delay={120}
                />
                <KpiCard
                    title="STOCK CRÍTICO"
                    value={String(kpiData.productosStockCritico)}
                    sub={kpiData.productosStockCritico > 0
                        ? `${kpiData.productosStockBajo} en zona de alerta`
                        : 'Todo el stock en orden'}
                    icon="▦"
                    accent="var(--accent-danger)"
                    glow={glow.danger}
                    trend={kpiData.productosStockCritico > 0 ? 'down' : 'neutral'}
                    delay={180}
                />
            </div>

            {/* Gráficas */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ChartsPanel kpiData={kpiData} />
            </div>
        </div>
    );
}
