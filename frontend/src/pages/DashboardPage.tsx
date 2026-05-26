import { useEffect, useState } from 'react';
import { useAuth }      from '../hooks/useAuth';
import api              from '../services/api';
import type { KpiData } from '../types/models';
import { KpiCard }      from '../components/dashboard/KpiCard';
import { ChartsPanel }  from '../components/dashboard/ChartsPanel';

const FALLBACK_KPI: KpiData = {
    ventasHoy: 4280, ventasAyer: 3820, clientesActivos: 1847,
    clientesNuevosSemana: 8, piezasRetroDisponibles: 23, productosStockCritico: 7,
    ventasUltimos30Dias: Array.from({ length: 30 }, (_, i) => ({
        fecha: new Date(Date.now() - (29-i)*86400000).toISOString().split('T')[0],
        total: Math.floor(2000 + Math.random()*4000),
        unidades: Math.floor(10 + Math.random()*50),
    })),
};

export function DashboardPage(): JSX.Element {
    const { user } = useAuth();
    const [kpiData, setKpiData] = useState<KpiData>(FALLBACK_KPI);
    const [loadState, setLoadState] = useState<'loading'|'ok'|'error'>('loading');

    useEffect(() => {
        let cancelled = false;
        api.get<KpiData>('/dashboard/analytics')
            .then(({ data }) => { if (!cancelled) { setKpiData({ ...FALLBACK_KPI, ...data }); setLoadState('ok'); } })
            .catch(() => { if (!cancelled) setLoadState('error'); });
        return () => { cancelled = true; };
    }, []);

    const trend = kpiData.ventasHoy >= kpiData.ventasAyer ? 'up' : 'down';
    const pctVentas = kpiData.ventasAyer > 0
        ? Math.round(((kpiData.ventasHoy - kpiData.ventasAyer) / kpiData.ventasAyer) * 100) : 0;

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px', height:'100%', maxHeight:'calc(100dvh - 56px - 30px - 48px)', overflow:'hidden' }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                    <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-primary)', margin:0 }}>
                        Bienvenido,{' '}
                        <span style={{ background:'linear-gradient(135deg,var(--accent-primary),var(--accent-cyan))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                            {user?.email.split('@')[0] ?? 'Operador'}
                        </span>
                    </h1>
                    <p style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--text-muted)', margin:'2px 0 0', letterSpacing:'0.04em' }}>
                        {new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                        {loadState === 'error' && <span style={{ marginLeft:'12px', color:'var(--accent-gold)', border:'1px solid var(--accent-gold)', borderRadius:'3px', padding:'1px 6px', fontSize:'9px' }}>DATOS DEMO</span>}
                    </p>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--text-muted)', letterSpacing:'0.06em', textAlign:'right' }}>
                    <div style={{ color:'var(--accent-cyan)', marginBottom:'2px' }}>◇ IA disponible</div>
                    <div>Pulsa el botón inferior derecho</div>
                </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', flexShrink:0 }}>
                <KpiCard title="VENTAS HOY" value={`€${(kpiData.ventasHoy??0).toLocaleString('es-ES')}`} sub={`${pctVentas>=0?'+':''}${pctVentas}% vs ayer`} icon="€" accent="var(--accent-primary)" glow="rgba(0,255,136,0.4)" trend={trend} delay={0} />
                <KpiCard title="CLIENTES ACTIVOS" value={(kpiData.clientesActivos??0).toLocaleString('es-ES')} sub={`+${kpiData.clientesNuevosSemana} esta semana`} icon="◉" accent="var(--accent-cyan)" glow="rgba(0,212,255,0.4)" trend="up" delay={60} />
                <KpiCard title="BOVEDA RETRO" value={String(kpiData.piezasRetroDisponibles??0)} sub="Piezas disponibles" icon="◆" accent="var(--accent-gold)" glow="rgba(255,200,69,0.4)" trend="neutral" delay={120} />
                <KpiCard title="STOCK CRITICO" value={String(kpiData.productosStockCritico??0)} sub="Bajo minimo" icon="▦" accent="var(--accent-danger)" glow="rgba(255,68,102,0.4)" trend={(kpiData.productosStockCritico??0)>5?'down':'neutral'} delay={180} />
            </div>

            <div style={{ flex:1, minHeight:0, animation:'fadeInUp 0.4s 0.2s ease both' }}>
                <ChartsPanel kpiData={kpiData} />
            </div>
        </div>
    );
}
