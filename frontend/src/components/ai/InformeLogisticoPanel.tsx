/**
 * components/ai/InformeLogisticoPanel.tsx — AI-06 / UI
 *
 * Panel para el Asistente Logístico: genera un informe ejecutivo
 * de productos bajo mínimo con plan de pedidos y previsión de impacto.
 *
 * Endpoint: POST /api/ai/informe-stock  (sin body)
 * Roles:    GESTOR_INVENTARIO · ADMIN
 */

import { useState } from 'react';
import api          from '../../services/api';

interface InformeResponse {
    alertas_criticas:    string;
    plan_pedidos:        string;
    prevision_ingresos:  string;
    prevision_impacto?:  string;
    productos_afectados: number;
    generado_en:         string;
    resumen_ejecutivo?:  string;
}

type PanelState = 'idle' | 'loading' | 'done' | 'error';

function SkeletonBlock({ lines = 3 }: { lines?: number }): JSX.Element {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: lines }, (_, i) => (
                <div key={i} style={{
                    height:         '13px',
                    width:          i === lines - 1 ? '65%' : '100%',
                    borderRadius:   '3px',
                    background:     'var(--bg-overlay)',
                    animation:      'skeletonPulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 100}ms`,
                }} />
            ))}
        </div>
    );
}

function SectionCard({ title, icon, content, accent }: {
    title:   string;
    icon:    string;
    content: string;
    accent:  string;
}): JSX.Element {
    return (
        <div style={{
            background:   'var(--bg-elevated)',
            border:       `1px solid ${accent}30`,
            borderLeft:   `3px solid ${accent}`,
            borderRadius: 'var(--radius-lg)',
            padding:      '16px 18px',
        }}>
            <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '8px',
                marginBottom:  '10px',
            }}>
                <span style={{ fontSize: '14px' }}>{icon}</span>
                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '10px',
                    fontWeight:    700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         accent,
                }}>{title}</span>
            </div>
            <p style={{
                fontFamily: 'var(--font-body)',
                fontSize:   '13px',
                color:      'var(--text-primary)',
                lineHeight: 1.7,
                margin:     0,
                whiteSpace: 'pre-wrap',
            }}>
                {content}
            </p>
        </div>
    );
}

export function InformeLogisticoPanel(): JSX.Element {
    const [state,   setState]   = useState<PanelState>('idle');
    const [informe, setInforme] = useState<InformeResponse | null>(null);
    const [error,   setError]   = useState('');

    async function generarInforme(): Promise<void> {
        setState('loading');
        setInforme(null);
        setError('');

        try {
            const { data } = await api.post<InformeResponse>('/ai/informe-stock');
            setInforme(data);
            setState('done');
        } catch (err: unknown) {
            let msg = 'Error al conectar con el asistente logístico.';
            if (err && typeof err === 'object' && 'response' in err) {
                const ae = err as { response?: { data?: { message?: string } } };
                msg = ae.response?.data?.message ?? msg;
            }
            setError(msg);
            setState('error');
        }
    }

    return (
        <>
            <style>{`
                @keyframes skeletonPulse {
                    0%, 100% { opacity: 0.3; }
                    50%      { opacity: 0.7; }
                }
            `}</style>

            {/* Botón de generación */}
            <div style={{
                display:     'flex',
                alignItems:  'center',
                gap:         '14px',
                marginBottom:'24px',
            }}>
                <button
                    onClick={generarInforme}
                    disabled={state === 'loading'}
                    className="btn btn-primary"
                    style={{
                        opacity: state === 'loading' ? 0.6 : 1,
                        cursor:  state === 'loading' ? 'not-allowed' : 'pointer',
                    }}
                >
                    {state === 'loading' ? 'GENERANDO INFORME…' : '▤ GENERAR INFORME'}
                </button>

                {informe && (
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        color:         'var(--text-muted)',
                        letterSpacing: '0.04em',
                    }}>
                        {informe.productos_afectados} productos afectados ·{' '}
                        {new Date(informe.generado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            {/* Estado: cargando */}
            {state === 'loading' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {['Analizando stock…', 'Consultando proveedores…', 'Calculando impacto…'].map((label, i) => (
                        <div key={i}>
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '10px',
                                color:         'var(--text-muted)',
                                letterSpacing: '0.06em',
                                marginBottom:  '8px',
                            }}>{label}</div>
                            <SkeletonBlock lines={3} />
                        </div>
                    ))}
                </div>
            )}

            {/* Estado: error */}
            {state === 'error' && (
                <div style={{
                    padding:      '14px 16px',
                    background:   'rgba(255,51,85,0.06)',
                    border:       '1px solid var(--accent-danger)',
                    borderRadius: 'var(--radius-lg)',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '12px',
                    color:        'var(--accent-danger)',
                    display:      'flex',
                    gap:          '8px',
                    lineHeight:   1.5,
                }}>
                    <span>▲</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Estado: resultado */}
            {state === 'done' && informe && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionCard
            title="Alertas Críticas"
            icon="⛔"
            content={Array.isArray(informe.alertas_criticas)
                ? (informe.alertas_criticas as string[]).join('\n')
                : String(informe.alertas_criticas ?? '')}
            accent="var(--accent-danger)"
        />
        <SectionCard
            title="Plan de Pedidos"
            icon="▤"
            content={Array.isArray(informe.plan_pedidos)
                ? (informe.plan_pedidos as Array<{proveedor: string; productos: string[]; urgencia: string}>)
                    .map(p => `${p.proveedor} [${p.urgencia}]\n${p.productos.join(', ')}`)
                    .join('\n\n')
                : String(informe.plan_pedidos ?? '')}
            accent="var(--accent-cyan)"
        />
        <SectionCard
            title="Previsión de Impacto en Ingresos"
            icon="€"
            content={String(informe.prevision_ingresos ?? informe.prevision_impacto ?? '')}
            accent="var(--accent-primary)"
        />
    </div>
)}

            {/* Estado: idle */}
            {state === 'idle' && (
                <div style={{
                    textAlign:  'center',
                    padding:    '48px 24px',
                    color:      'var(--text-muted)',
                }}>
                    <div style={{ fontSize: '40px', opacity: 0.12, marginBottom: '12px' }}>▤</div>
                    <div style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '11px',
                        fontWeight:    700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        lineHeight:    1.6,
                    }}>
                        Pulsa Generar Informe para analizar el estado del stock
                    </div>
                    <div style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        color:         'var(--border-default)',
                        marginTop:     '8px',
                        letterSpacing: '0.06em',
                    }}>
                        Gemini analiza productos bajo mínimo y sugiere pedidos a proveedores
                    </div>
                </div>
            )}
        </>
    );
}