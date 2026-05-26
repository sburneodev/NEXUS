/**
 * DashboardPage.tsx — UI-03 + UI-04
 *
 * Página principal del ERP.
 * Obtiene los datos del backend en GET /api/dashboard/analytics
 * y los distribuye a KpiCards, ChartsPanel y Nl2SqlPanel.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { KpiData } from '../types/models';
import { KpiCard } from '../components/dashboard/KpiCard';
import { ChartsPanel } from '../components/dashboard/ChartsPanel';
import { Nl2SqlPanel } from '../components/ai/Nl2SqlPanel';

// Datos de fallback para desarrollo sin backend
const FALLBACK_KPI: KpiData = {
    ventasHoy: 4280,
    ventasAyer: 3820,
    clientesActivos: 1847,
    clientesNuevosSemana: 8,
    piezasRetroDisponibles: 23,
    productosStockCritico: 7,
    ventasUltimos30Dias: Array.from({ length: 30 }, (_, i) => ({
        fecha: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        total: Math.floor(2000 + Math.random() * 4000),
        unidades: Math.floor(10 + Math.random() * 50),
    })),
};

type LoadState = 'loading' | 'ok' | 'error';

export function DashboardPage(): JSX.Element {
    const { user } = useAuth();
    const [kpiData, setKpiData] = useState<KpiData>(FALLBACK_KPI);
    const [loadState, setLoadState] = useState<LoadState>('loading');

    useEffect(() => {
        let cancelled = false;

        api.get<KpiData>('/dashboard/analytics')
            .then(({ data }) => {
                if (!cancelled) { setKpiData({ ...FALLBACK_KPI, ...data }); setLoadState('ok'); }
            })
            .catch(() => {
                if (!cancelled) {
                    // En desarrollo usamos los datos de fallback
                    setLoadState('error');
                }
            });

        return () => { cancelled = true; };
    }, []);

    const trend = kpiData.ventasHoy >= kpiData.ventasAyer ? 'up' : 'down';
    const pctVentas = kpiData.ventasAyer > 0
        ? Math.round(((kpiData.ventasHoy - kpiData.ventasAyer) / kpiData.ventasAyer) * 100)
        : 0;

    return (
        <div>

            {/* Cabecera */}
            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.4s ease both' }}>
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                }}>
                    Bienvenido,{' '}
                    <span style={{
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        {user?.email.split('@')[0] ?? 'Administrador'}
                    </span>
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <p style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.04em',
                    }}>
                        {new Date().toLocaleDateString('es-ES', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                    </p>
                    {loadState === 'error' && (
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--accent-gold)',
                            letterSpacing: '0.06em',
                            padding: '2px 8px',
                            border: '1px solid var(--accent-gold)',
                            borderRadius: '4px',
                            opacity: 0.7,
                        }}>
                            DATOS DEMO
                        </span>
                    )}
                </div>
            </div>

            {/* KPI Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
            }}>
                <KpiCard
                    title="VENTAS HOY"
                    value={`€${kpiData.ventasHoy.toLocaleString('es-ES')}`}
                    sub={`${pctVentas >= 0 ? '+' : ''}${pctVentas}% vs ayer`}
                    icon="€"
                    accent="var(--accent-primary)"
                    glow="rgba(0,255,136,0.4)"
                    trend={trend}
                    delay={0}
                />
                <KpiCard
                    title="CLIENTES ACTIVOS"
                    value={kpiData.clientesActivos.toLocaleString('es-ES')}
                    sub={`+${kpiData.clientesNuevosSemana} nuevos esta semana`}
                    icon="◉"
                    accent="var(--accent-cyan)"
                    glow="rgba(0,212,255,0.4)"
                    trend="up"
                    delay={80}
                />
                <KpiCard
                    title="PIEZAS RETRO"
                    value={String(kpiData.piezasRetroDisponibles)}
                    sub="La Bóveda disponible"
                    icon="◆"
                    accent="var(--accent-gold)"
                    glow="rgba(255,200,69,0.4)"
                    trend="neutral"
                    delay={160}
                />
                <KpiCard
                    title="STOCK CRÍTICO"
                    value={String(kpiData.productosStockCritico)}
                    sub="Productos bajo mínimo"
                    icon="▦"
                    accent="var(--accent-danger)"
                    glow="rgba(255,68,102,0.4)"
                    trend={kpiData.productosStockCritico > 5 ? 'down' : 'neutral'}
                    delay={240}
                />
            </div>

            {/* Charts */}
            <div style={{ marginBottom: '24px', animation: 'fadeInUp 0.4s 0.2s ease both' }}>
                <ChartsPanel kpiData={kpiData} />
            </div>

            {/* NL2SQL Panel */}
            <div style={{ animation: 'fadeInUp 0.4s 0.3s ease both' }}>
                <Nl2SqlPanel />
            </div>

        </div>
    );
}
