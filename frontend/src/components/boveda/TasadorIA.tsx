import { useState } from 'react';
import type { FormEvent } from 'react';
import api from '../../services/api';
import type { EstadoConservacion } from '../../types/models';
import type { ProductForm } from '../productos/ProductModal';

// ── Tipos ─────────────────────────────────────────────────────────────
interface TasacionResult {
    precioMin:       number;
    precioPropuesto: number;
    precioMax:       number;
    descripcion:     string;
    skuSugerido?:    string;
    confianza?:      'alta' | 'media' | 'baja';
}

type TasadorState = 'idle' | 'loading' | 'done' | 'error';

const ESTADOS: { value: EstadoConservacion; label: string }[] = [
    { value: 'MINT',    label: 'MINT — Precintado'       },
    { value: 'CIB',     label: 'CIB — Caja + Manual'     },
    { value: 'LOOSE',   label: 'LOOSE — Solo cartucho'   },
    { value: 'LOOSE_D', label: 'LOOSE-D — Con daños'     },
];

const CONFIANZA_STYLE: Record<string, { label: string; color: string }> = {
    alta:  { label: 'CONFIANZA ALTA',  color: 'var(--accent-primary)' },
    media: { label: 'CONFIANZA MEDIA', color: 'var(--accent-gold)'    },
    baja:  { label: 'CONFIANZA BAJA',  color: 'var(--accent-danger)'  },
};

// ── Props ─────────────────────────────────────────────────────────────
interface TasadorIAProps {
    onRegistrar: (prefill: Partial<ProductForm>) => void;
}

// ── Componente ────────────────────────────────────────────────────────
export function TasadorIA({ onRegistrar }: TasadorIAProps): JSX.Element {
    const [nombre,     setNombre]     = useState('');
    const [plataforma, setPlataforma] = useState('');
    const [estado,     setEstado]     = useState<EstadoConservacion>('CIB');
    const [anio,       setAnio]       = useState('');
    const [tasState,   setTasState]   = useState<TasadorState>('idle');
    const [result,     setResult]     = useState<TasacionResult | null>(null);
    const [errorMsg,   setErrorMsg]   = useState('');

    async function handleConsultar(e: FormEvent): Promise<void> {
        e.preventDefault();
        if (!nombre.trim()) return;
        setTasState('loading');
        setResult(null);
        setErrorMsg('');

        try {
            const { data } = await api.post<TasacionResult>('/ai/tasar', {
                nombre:     nombre.trim(),
                plataforma: plataforma.trim() || undefined,
                estado,
                anio:       anio ? Number(anio) : undefined,
            });
            setResult(data);
            setTasState('done');
        } catch {
            setErrorMsg('El servicio de tasación no está disponible. Comprueba la conexión con el backend.');
            setTasState('error');
        }
    }

    function handleRegistrar(): void {
        if (!result) return;
        const sku = result.skuSugerido
            ?? `RET-${plataforma.replace(/\s+/g, '').toUpperCase().slice(0, 4) || 'GEN'}-${String(Date.now()).slice(-4)}`;

        onRegistrar({
            sku,
            nombre:             nombre.trim(),
            descripcion:        result.descripcion,
            precioVenta:        String(result.precioPropuesto),
            precioCoste:        String(Math.round(result.precioPropuesto * 0.55)),
            stockActual:        '1',
            stockMinimo:        '1',
            stockMaximo:        '1',
            tipoProducto:       'RETRO',
            estadoConservacion: estado,
            activo:             true,
        });
    }

    function handleReset(): void {
        setNombre('');
        setPlataforma('');
        setEstado('CIB');
        setAnio('');
        setResult(null);
        setTasState('idle');
        setErrorMsg('');
    }

    const inputCss: React.CSSProperties = {
        fontFamily:   'var(--font-mono)',
        fontSize:     '13px',
        color:        'var(--text-primary)',
        background:   'var(--bg-elevated)',
        border:       '1px solid var(--border-default)',
        borderRadius: 'var(--radius-base)',
        padding:      '9px 13px',
        outline:      'none',
        caretColor:   'var(--accent-primary)',
        transition:   'border-color 160ms, box-shadow 160ms',
        width:        '100%',
        boxSizing:    'border-box',
    };

    const focusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void => {
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
        e.currentTarget.style.boxShadow  = '0 0 0 3px var(--accent-primary-glow)';
    };
    const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.boxShadow  = 'none';
    };

    return (
        <div style={{
            background:   'var(--bg-surface)',
            border:       '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding:      'var(--space-4) var(--space-6)',
            marginBottom: 'var(--space-4)',
            position:     'relative',
            overflow:     'hidden',
        }}>
            {/* Borde superior degradado */}
            <div style={{
                position:   'absolute',
                top:        0,
                left:       0,
                right:      0,
                height:     '2px',
                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))',
            }} />
            {/* Cabecera — título y subtítulo en la misma fila */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '13px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    flexShrink: 0,
                }}>◇</span>
                <h2 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '15px',
                    fontWeight:    700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color:         'var(--text-primary)',
                    margin:        0,
                    flexShrink:    0,
                }}>Tasador Inteligente</h2>
                <span style={{
                    width:      '1px',
                    height:     '14px',
                    background: 'var(--border-default)',
                    flexShrink: 0,
                }} />
                <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '11px',
                    color:         'var(--text-muted)',
                    letterSpacing: '0.04em',
                }}>
                    Consulta el precio de mercado antes de registrar una nueva adquisición retro.
                </span>
            </div>

            {/* Formulario */}
            <form onSubmit={handleConsultar}>
                <div style={{
                    display:             'grid',
                    gridTemplateColumns: '2fr 1.2fr 1.2fr 0.7fr auto',
                    gap:                 '10px',
                    alignItems:          'end',
                }}>
                    {/* Nombre */}
                    <div>
                        <label style={labelStyle}>Nombre del juego *</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Super Mario World"
                            required
                            disabled={tasState === 'loading'}
                            style={inputCss}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        />
                    </div>

                    {/* Plataforma */}
                    <div>
                        <label style={labelStyle}>Plataforma</label>
                        <input
                            type="text"
                            value={plataforma}
                            onChange={e => setPlataforma(e.target.value)}
                            placeholder="SNES, N64, PS1…"
                            disabled={tasState === 'loading'}
                            style={inputCss}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        />
                    </div>

                    {/* Estado */}
                    <div>
                        <label style={labelStyle}>Estado</label>
                        <select
                            value={estado}
                            onChange={e => setEstado(e.target.value as EstadoConservacion)}
                            disabled={tasState === 'loading'}
                            style={{ ...inputCss }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        >
                            {ESTADOS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Año */}
                    <div>
                        <label style={labelStyle}>Año</label>
                        <input
                            type="number"
                            value={anio}
                            onChange={e => setAnio(e.target.value)}
                            placeholder="1990"
                            min={1970}
                            max={2010}
                            disabled={tasState === 'loading'}
                            style={inputCss}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        />
                    </div>

                    {/* Botón */}
                    <button
                        type="submit"
                        disabled={!nombre.trim() || tasState === 'loading'}
                        className="btn btn-primary"
                        style={{
                            opacity:     !nombre.trim() || tasState === 'loading' ? 0.4 : 1,
                            cursor:      !nombre.trim() || tasState === 'loading' ? 'not-allowed' : 'pointer',
                            whiteSpace:  'nowrap',
                        }}
                    >
                        {tasState === 'loading' ? 'CONSULTANDO' : 'CONSULTAR TASACIÓN'}
                    </button>
                </div>
            </form>

            {/* Error */}
            {tasState === 'error' && (
                <div style={{
                    marginTop:  'var(--space-4)',
                    padding:    '12px 14px',
                    background: 'rgba(255,68,102,0.06)',
                    border:     '1px solid var(--accent-danger)',
                    borderRadius: 'var(--radius-base)',
                    display:    'flex',
                    gap:        '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '12px',
                    color:      'var(--accent-danger)',
                }}>
                    <span>▲</span>
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Resultado */}
            {tasState === 'done' && result && (
                <div style={{
                    marginTop:    'var(--space-5)',
                    borderTop:    '1px solid var(--border-subtle)',
                    paddingTop:   'var(--space-5)',
                    animation:    'fadeInUp 0.22s ease both',
                }}>
                    {/* Confianza */}
                    {result.confianza && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <span style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '10px',
                                fontWeight:    600,
                                letterSpacing: '0.10em',
                                color:         CONFIANZA_STYLE[result.confianza]?.color ?? 'var(--text-muted)',
                                border:        `1px solid ${CONFIANZA_STYLE[result.confianza]?.color ?? 'var(--border-default)'}`,
                                borderRadius:  'var(--radius-sm)',
                                padding:       '2px 8px',
                            }}>
                                {CONFIANZA_STYLE[result.confianza]?.label ?? 'TASACIÓN IA'}
                            </span>
                        </div>
                    )}

                    {/* Tres cajas de precio */}
                    <div style={{
                        display:             'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap:                 '12px',
                        marginBottom:        'var(--space-4)',
                    }}>
                        <PriceBox label="MÍNIMO"       value={result.precioMin}       variant="muted"   />
                        <PriceBox label="RECOMENDADO"  value={result.precioPropuesto} variant="primary" />
                        <PriceBox label="MÁXIMO"       value={result.precioMax}       variant="muted"   />
                    </div>

                    {/* Descripción generada */}
                    {result.descripcion && (
                        <p style={{
                            fontFamily:   'var(--font-body)',
                            fontSize:     '13px',
                            color:        'var(--text-secondary)',
                            lineHeight:   1.6,
                            margin:       '0 0 var(--space-5)',
                            padding:      '12px 14px',
                            background:   'var(--bg-elevated)',
                            border:       '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-base)',
                        }}>
                            {result.descripcion}
                        </p>
                    )}

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            onClick={handleRegistrar}
                            className="btn btn-primary"
                            style={{ flexShrink: 0 }}
                        >
                            REGISTRAR EN CATÁLOGO
                        </button>
                        <button
                            onClick={handleReset}
                            className="btn btn-ghost"
                        >
                            NUEVA TASACIÓN
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Caja de precio ────────────────────────────────────────────────────
function PriceBox({ label, value, variant }: {
    label:   string;
    value:   number;
    variant: 'primary' | 'muted';
}): JSX.Element {
    const isPrimary = variant === 'primary';
    return (
        <div style={{
            background:   isPrimary ? 'rgba(0,255,136,0.05)' : 'var(--bg-elevated)',
            border:       isPrimary
                ? '1px solid rgba(0,255,136,0.35)'
                : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-base)',
            padding:      '14px 16px',
            textAlign:    'center',
            boxShadow:    isPrimary ? '0 0 20px rgba(0,255,136,0.10)' : 'none',
            position:     'relative',
        }}>
            {isPrimary && (
                <div style={{
                    position:      'absolute',
                    top:           '-1px',
                    left:          '50%',
                    transform:     'translateX(-50%)',
                    height:        '2px',
                    width:         '60%',
                    background:    'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
                    borderRadius:  '0 0 2px 2px',
                }} />
            )}
            <div style={{
                fontFamily:    'var(--font-display)',
                fontSize:      '9px',
                fontWeight:    700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color:         isPrimary ? 'var(--accent-primary)' : 'var(--text-muted)',
                marginBottom:  '6px',
            }}>{label}</div>
            <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      isPrimary ? '24px' : '20px',
                fontWeight:    700,
                color:         isPrimary ? 'var(--accent-primary)' : 'var(--text-secondary)',
                letterSpacing: '-0.02em',
                textShadow:    isPrimary ? '0 0 16px rgba(0,255,136,0.35)' : 'none',
            }}>
                €{value.toFixed(2)}
            </div>
        </div>
    );
}

// ── Estilos locales ───────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
    display:       'block',
    fontFamily:    'var(--font-display)',
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color:         'var(--text-secondary)',
    marginBottom:  '5px',
};
