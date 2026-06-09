/**
 * pages/ProductosNuevoPage.tsx
 *
 * Wizard de creación de producto estándar — 4 pasos:
 *   1 · Información  →  2 · Precios & Stock  →  3 · Ubicación  →  4 · Confirmar
 *
 * Ruta: /productos/nuevo
 * Tras crear con éxito navega a /productos con state { created: true }.
 */

import {
    useState, useEffect, Fragment,
    type ReactNode, type CSSProperties, type InputHTMLAttributes,
} from 'react';
import { useNavigate }                   from 'react-router-dom';
import { UbicacionPicker }               from '../components/productos/UbicacionPicker';
import type { UbicacionOption }          from '../components/productos/UbicacionPicker';
import { productoService }               from '../services/productoService';
import api                               from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface WizardData {
    // Paso 1
    sku:         string;
    nombre:      string;
    descripcion: string;
    idProveedor: string;
    idCategoria: string;
    activo:      boolean;
    // Paso 2
    precioCoste: string;
    precioVenta: string;
    stockActual: string;
    stockMinimo: string;
    stockMaximo: string;
    // Paso 3
    idUbicacion: string;
}

const EMPTY: WizardData = {
    sku: '', nombre: '', descripcion: '',
    idProveedor: '', idCategoria: '', activo: true,
    precioCoste: '', precioVenta: '',
    stockActual: '0', stockMinimo: '5', stockMaximo: '999',
    idUbicacion: '',
};

const STEP_LABELS = ['INFORMACIÓN', 'PRECIOS & STOCK', 'UBICACIÓN', 'CONFIRMAR'];

// ── Página principal ──────────────────────────────────────────────────────────

export function ProductosNuevoPage(): JSX.Element {
    const navigate = useNavigate();

    const [step,      setStep]      = useState(1);
    const [data,      setData]      = useState<WizardData>(EMPTY);
    const [errors,    setErrors]    = useState<Partial<Record<keyof WizardData, string>>>({});
    const [saving,    setSaving]    = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Ubicaciones
    const [ubicaciones,  setUbicaciones]  = useState<UbicacionOption[]>([]);
    const [ubicLoading,  setUbicLoading]  = useState(false);
    const [ubicError,    setUbicError]    = useState(false);
    const [ubicRetry,    setUbicRetry]    = useState(0);

    useEffect(() => {
        setUbicLoading(true);
        setUbicError(false);
        api.get<UbicacionOption[]>('/almacen/ubicaciones')
            .then(r => setUbicaciones(Array.isArray(r.data) ? r.data : []))
            .catch(() => { setUbicError(true); setUbicaciones([]); })
            .finally(() => setUbicLoading(false));
    }, [ubicRetry]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const set = (key: keyof WizardData) =>
        (val: string | boolean) => setData(p => ({ ...p, [key]: val }));

    function validateStep(s: number): boolean {
        const e: Partial<Record<keyof WizardData, string>> = {};
        if (s === 1) {
            if (!data.sku.trim())    e.sku    = 'Obligatorio';
            if (!data.nombre.trim()) e.nombre = 'Obligatorio';
        }
        if (s === 2) {
            if (isNaN(Number(data.precioCoste)) || Number(data.precioCoste) < 0) e.precioCoste = 'Valor no válido';
            if (isNaN(Number(data.precioVenta)) || Number(data.precioVenta) < 0) e.precioVenta = 'Valor no válido';
            if (isNaN(Number(data.stockActual)) || Number(data.stockActual) < 0) e.stockActual = 'Valor no válido';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function next() {
        if (validateStep(step)) { setErrors({}); setStep(s => s + 1); }
    }
    function prev() { setErrors({}); setStep(s => s - 1); }

    async function handleCreate() {
        setSaving(true);
        setSaveError(null);
        try {
            await productoService.crear({
                sku:                  data.sku.trim().toUpperCase(),
                nombre:               data.nombre.trim(),
                descripcion:          data.descripcion.trim() || null,
                idProveedor:          data.idProveedor ? Number(data.idProveedor) : null,
                idCategoria:          data.idCategoria ? Number(data.idCategoria) : null,
                idUbicacion:          data.idUbicacion ? Number(data.idUbicacion) : null,
                precioCoste:          Number(data.precioCoste || 0),
                precioVenta:          Number(data.precioVenta || 0),
                stockActual:          Number(data.stockActual || 0),
                stockMinimo:          Number(data.stockMinimo || 0),
                stockMaximo:          Number(data.stockMaximo || 999),
                tipoProducto:         'ESTANDAR',
                estadoConservacion:   null,
                activo:               data.activo,
                categoriaNombre:      null,
                atributosEspecificos: null,
            } as any);
            navigate('/productos', { state: { created: true } });
        } catch {
            setSaveError('Error al crear el producto. Comprueba los datos e inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    }

    const ubicacion = ubicaciones.find(u => String(u.id) === data.idUbicacion) ?? null;
    const canSave   = !ubicError;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '40px' }}>

            {/* ── Cabecera ─── */}
            <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginBottom:   '28px',
            }}>
                <button
                    onClick={() => navigate('/productos')}
                    style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '6px',
                        background: 'transparent',
                        border:     'none',
                        cursor:     'pointer',
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '11px',
                        color:      'var(--text-muted)',
                        padding:    0,
                        transition: 'color 140ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                >
                    ← Productos
                </button>
                <div style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '10px',
                    fontWeight:    700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         'var(--accent-cyan)',
                    border:        '1px solid var(--accent-cyan)',
                    borderRadius:  '4px',
                    padding:       '3px 10px',
                    background:    'rgba(56,189,248,0.06)',
                }}>
                    ESTÁNDAR
                </div>
            </div>

            {/* ── Wizard stepper ─── */}
            <WizardStepper step={step} />

            {/* ── Contenido del paso ─── */}
            <div style={{
                background:   'var(--bg-surface)',
                border:       '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding:      '28px 32px',
                marginBottom: '16px',
                minHeight:    '300px',
            }}>
                {step === 1 && <StepInfo data={data} errors={errors} set={set} />}
                {step === 2 && <StepPreciosStock data={data} errors={errors} set={set} />}
                {step === 3 && (
                    <StepUbicacion
                        data={data}
                        set={set}
                        ubicaciones={ubicaciones}
                        loading={ubicLoading}
                        error={ubicError}
                        onRetry={() => setUbicRetry(n => n + 1)}
                    />
                )}
                {step === 4 && (
                    <StepConfirmar
                        data={data}
                        ubicacion={ubicacion}
                        saveError={saveError}
                        ubicError={ubicError}
                        onEditStep={setStep}
                    />
                )}
            </div>

            {/* ── Navegación ─── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                    type="button"
                    onClick={step > 1 ? prev : () => navigate('/productos')}
                    style={navBtnSecondary}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; }}
                >
                    ← {step > 1 ? 'Anterior' : 'Cancelar'}
                </button>

                {step < 4 ? (
                    <button type="button" onClick={next} style={navBtnPrimary}>
                        Siguiente →
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={saving || !canSave}
                        style={{
                            ...navBtnPrimary,
                            background:  saving || !canSave
                                ? 'var(--bg-elevated)'
                                : 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))',
                            color:       saving || !canSave ? 'var(--text-muted)' : 'var(--text-inverse)',
                            cursor:      saving || !canSave ? 'not-allowed' : 'pointer',
                            boxShadow:   saving || !canSave ? 'none' : '0 0 20px var(--accent-primary-glow)',
                            border:      saving || !canSave ? '1px solid var(--border-subtle)' : 'none',
                        }}
                    >
                        {saving ? '· Creando…' : '✓ Crear Producto'}
                    </button>
                )}
            </div>

            {/* ── Aviso de ubicaciones caídas (paso 4) ─── */}
            {step === 4 && ubicError && (
                <div style={{
                    marginTop:    '12px',
                    padding:      '10px 14px',
                    background:   'rgba(248,113,113,0.06)',
                    border:       '1px solid rgba(248,113,113,0.25)',
                    borderRadius: '8px',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '11px',
                    color:        'var(--accent-danger)',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '8px',
                }}>
                    ⚠ El mapa de almacén no está disponible. Vuelve al <button
                        onClick={() => setStep(3)}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)',
                            fontSize: '11px', padding: 0, textDecoration: 'underline',
                        }}
                    >paso 3</button> y reintenta antes de guardar.
                </div>
            )}
        </div>
    );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function WizardStepper({ step }: { step: number }): JSX.Element {
    return (
        <div style={{
            display:       'flex',
            alignItems:    'flex-start',
            marginBottom:  '28px',
            padding:       '0 4px',
        }}>
            {STEP_LABELS.map((label, i) => {
                const num    = i + 1;
                const done   = num < step;
                const active = num === step;
                return (
                    <Fragment key={label}>
                        {i > 0 && (
                            <div style={{
                                flex:       1,
                                height:     '2px',
                                marginTop:  '17px',
                                background: done
                                    ? 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))'
                                    : 'var(--border-subtle)',
                                transition: 'background 400ms ease',
                            }} />
                        )}
                        <div style={{
                            display:       'flex',
                            flexDirection: 'column',
                            alignItems:    'center',
                            gap:           '8px',
                        }}>
                            {/* Círculo */}
                            <div style={{
                                width:        '36px',
                                height:       '36px',
                                borderRadius: '50%',
                                display:      'flex',
                                alignItems:   'center',
                                justifyContent: 'center',
                                background:   done ? 'var(--accent-primary)' : 'transparent',
                                border:       `2px solid ${
                                    done   ? 'var(--accent-primary)'
                                    : active ? 'var(--accent-cyan)'
                                    : 'var(--border-default)'
                                }`,
                                boxShadow:    active ? '0 0 0 5px var(--accent-cyan-glow)' : 'none',
                                transition:   'all 300ms ease',
                                fontFamily:   'var(--font-mono)',
                                fontSize:     '13px',
                                fontWeight:   700,
                                color:        done   ? '#fff'
                                            : active ? 'var(--accent-cyan)'
                                            : 'var(--text-muted)',
                            }}>
                                {done ? '✓' : num}
                            </div>
                            {/* Etiqueta */}
                            <div style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '10px',          /* mínimo legible en stepper */
                                fontWeight:    700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color:         active ? 'var(--accent-cyan)'
                                             : done   ? 'var(--text-secondary)'
                                             : 'var(--text-muted)',
                                transition:    'color 300ms ease',
                                whiteSpace:    'nowrap',
                                textAlign:     'center',
                            }}>
                                {label}
                            </div>
                        </div>
                    </Fragment>
                );
            })}
        </div>
    );
}

// ── Pasos ─────────────────────────────────────────────────────────────────────

type SetFn = (key: keyof WizardData) => (val: string | boolean) => void;

/* Paso 1 — Información */
function StepInfo({ data, errors, set }: { data: WizardData; errors: Errs; set: SetFn }): JSX.Element {
    return (
        <div>
            <StepHeader icon="◈" title="Información Básica"
                        desc="Introduce el identificador único y el nombre del producto." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                <WField label="SKU" required error={errors.sku}>
                    <WInput
                        value={data.sku}
                        onChange={e => set('sku')(e.target.value)}
                        placeholder="STD-NSW-002"
                        hasError={!!errors.sku}
                        style={{ textTransform: 'uppercase', fontWeight: 600 }}
                    />
                </WField>
                <WField label="Nombre" required error={errors.nombre}>
                    <WInput
                        value={data.nombre}
                        onChange={e => set('nombre')(e.target.value)}
                        placeholder="Mario Kart 8 Deluxe — Switch"
                        hasError={!!errors.nombre}
                    />
                </WField>
            </div>
            <WField label="Descripción" style={{ marginBottom: '14px' }}>
                <textarea
                    rows={3}
                    value={data.descripcion}
                    onChange={e => set('descripcion')(e.target.value)}
                    placeholder="Descripción opcional del producto..."
                    style={textareaStyle}
                    onFocus={e  => { e.currentTarget.style.borderColor = 'var(--focus-color, #3B82F6)'; e.currentTarget.style.boxShadow = '0 0 0 4px var(--focus-glow, rgba(59,130,246,0.22))'; }}
                    onBlur={e   => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
            </WField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <WField label="ID Proveedor">
                    <WInput type="number" value={data.idProveedor} onChange={e => set('idProveedor')(e.target.value)} placeholder="—" />
                </WField>
                <WField label="ID Categoría">
                    <WInput type="number" value={data.idCategoria} onChange={e => set('idCategoria')(e.target.value)} placeholder="—" />
                </WField>
            </div>
            {/* Toggle activo */}
            <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                background:     'var(--bg-elevated)',
                border:         '1px solid var(--border-subtle)',
                borderRadius:   '8px',
                padding:        '12px 16px',
            }}>
                <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                        Producto activo
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {data.activo ? 'Visible y disponible en el sistema' : 'Oculto e inactivo'}
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={data.activo}
                    onClick={() => set('activo')(!data.activo)}
                    style={{
                        width:        '44px',
                        height:       '24px',
                        borderRadius: '12px',
                        background:   data.activo ? 'var(--accent-primary)' : 'var(--bg-overlay)',
                        border:       `1px solid ${data.activo ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                        display:      'flex',
                        alignItems:   'center',
                        padding:      '2px',
                        cursor:       'pointer',
                        transition:   'background 200ms ease, border-color 200ms ease',
                        flexShrink:   0,
                    }}
                >
                    <div style={{
                        width:        '18px',
                        height:       '18px',
                        borderRadius: '50%',
                        background:   '#fff',
                        marginLeft:   data.activo ? 'auto' : '0',
                        transition:   'margin 200ms ease',
                        boxShadow:    '0 1px 3px rgba(0,0,0,0.30)',
                    }} />
                </button>
            </div>
        </div>
    );
}

/* Paso 2 — Precios & Stock */
function StepPreciosStock({ data, errors, set }: { data: WizardData; errors: Errs; set: SetFn }): JSX.Element {
    return (
        <div>
            <StepHeader icon="▦" title="Precios & Stock"
                        desc="Define el margen comercial y las cantidades de inventario." />
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    PRECIOS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <WField label="Precio Coste (€)" required error={errors.precioCoste}>
                        <WInput type="number" step="0.01" placeholder="0.00" value={data.precioCoste} onChange={e => set('precioCoste')(e.target.value)} hasError={!!errors.precioCoste} />
                    </WField>
                    <WField label="Precio Venta (€)" required error={errors.precioVenta}>
                        <WInput type="number" step="0.01" placeholder="0.00" value={data.precioVenta} onChange={e => set('precioVenta')(e.target.value)} hasError={!!errors.precioVenta} />
                    </WField>
                </div>
                {/* Margen calculado */}
                {data.precioCoste && data.precioVenta && Number(data.precioCoste) > 0 && (
                    <div style={{
                        marginTop:    '8px',
                        padding:      '8px 12px',
                        background:   'rgba(56,189,248,0.06)',
                        border:       '1px solid rgba(56,189,248,0.18)',
                        borderRadius: '6px',
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '11px',
                        color:        'var(--accent-cyan)',
                        display:      'flex',
                        gap:          '16px',
                    }}>
                        <span>Margen bruto: <strong>€{(Number(data.precioVenta) - Number(data.precioCoste)).toFixed(2)}</strong></span>
                        <span>·</span>
                        <span>Rentabilidad: <strong>{(((Number(data.precioVenta) - Number(data.precioCoste)) / Number(data.precioCoste)) * 100).toFixed(1)}%</strong></span>
                    </div>
                )}
            </div>
            <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    INVENTARIO
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <WField label="Stock Inicial" required error={errors.stockActual}>
                        <WInput type="number" placeholder="0" value={data.stockActual} onChange={e => set('stockActual')(e.target.value)} hasError={!!errors.stockActual} />
                    </WField>
                    <WField label="Stock Mínimo">
                        <WInput type="number" placeholder="5" value={data.stockMinimo} onChange={e => set('stockMinimo')(e.target.value)} />
                    </WField>
                    <WField label="Stock Máximo">
                        <WInput type="number" placeholder="999" value={data.stockMaximo} onChange={e => set('stockMaximo')(e.target.value)} />
                    </WField>
                </div>
            </div>
        </div>
    );
}

/* Paso 3 — Ubicación */
function StepUbicacion({ data, set, ubicaciones, loading, error, onRetry }: {
    data:        WizardData;
    set:         SetFn;
    ubicaciones: UbicacionOption[];
    loading:     boolean;
    error:       boolean;
    onRetry:     () => void;
}): JSX.Element {
    return (
        <div>
            <StepHeader icon="▤" title="Almacén & Ubicación"
                        desc="Asigna una zona del almacén. Puedes dejarlo sin asignar y configurarlo más tarde." />
            <WField label="Zona de almacén">
                <UbicacionPicker
                    ubicaciones={ubicaciones}
                    loading={loading}
                    error={error}
                    value={data.idUbicacion}
                    onChange={id => set('idUbicacion')(id)}
                    onRetry={onRetry}
                />
            </WField>

            {!error && !loading && (
                <div style={{
                    marginTop:  '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '11px',
                    color:      'var(--text-muted)',
                    lineHeight: 1.6,
                }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>◉</span>{' '}
                    {ubicaciones.length} zonas disponibles en el almacén · La asignación es opcional.
                </div>
            )}
        </div>
    );
}

/* Paso 4 — Confirmar */
function StepConfirmar({ data, ubicacion, saveError, ubicError, onEditStep }: {
    data:      WizardData;
    ubicacion: UbicacionOption | null;
    saveError: string | null;
    ubicError: boolean;
    onEditStep:(s: number) => void;
}): JSX.Element {
    const margen = Number(data.precioCoste) > 0
        ? (((Number(data.precioVenta) - Number(data.precioCoste)) / Number(data.precioCoste)) * 100).toFixed(1)
        : '—';

    return (
        <div>
            {/* Intro */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', color: 'var(--accent-cyan)', marginBottom: '8px', opacity: 0.7 }}>◉</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Listo para crear
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Revisa los datos antes de confirmar. Puedes volver a cualquier paso.
                </div>
            </div>

            {/* Grid de tarjetas resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {/* Identificación */}
                <ConfirmCard title="Identificación" onEdit={() => onEditStep(1)}>
                    <ConfirmRow label="SKU"     value={<code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>{data.sku.toUpperCase()}</code>} />
                    <ConfirmRow label="Nombre"  value={data.nombre} />
                    <ConfirmRow label="Estado"  value={
                        <span style={{ color: data.activo ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                            {data.activo ? '● Activo' : '○ Inactivo'}
                        </span>
                    } />
                    {data.idProveedor && <ConfirmRow label="Proveedor ID" value={data.idProveedor} />}
                    {data.idCategoria && <ConfirmRow label="Categoría ID" value={data.idCategoria} />}
                </ConfirmCard>

                {/* Precios & Stock */}
                <ConfirmCard title="Precios & Stock" onEdit={() => onEditStep(2)}>
                    <ConfirmRow label="Precio coste" value={`€${Number(data.precioCoste || 0).toFixed(2)}`} />
                    <ConfirmRow label="Precio venta" value={<strong>€{Number(data.precioVenta || 0).toFixed(2)}</strong>} />
                    <ConfirmRow label="Margen"       value={`${margen}%`} />
                    <ConfirmRow label="Stock inicial" value={data.stockActual || '0'} />
                    <ConfirmRow label="Stock mínimo"  value={data.stockMinimo || '5'} />
                </ConfirmCard>
            </div>

            {/* Ubicación — ancho completo */}
            <ConfirmCard title="Ubicación" onEdit={() => onEditStep(3)}>
                {ubicacion ? (
                    <ConfirmRow label="Zona" value={
                        `Pasillo ${ubicacion.pasillo} · Estantería ${ubicacion.estanteria} · Nivel ${ubicacion.nivel}`
                    } />
                ) : (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Sin zona asignada — se puede configurar después desde la tabla.
                    </div>
                )}
                {ubicError && (
                    <div style={{
                        marginTop:    '8px',
                        padding:      '8px 12px',
                        background:   'rgba(248,113,113,0.08)',
                        border:       '1px solid rgba(248,113,113,0.25)',
                        borderRadius: '6px',
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '10px',
                        color:        'var(--accent-danger)',
                    }}>
                        ⚠ El mapa de almacén no está disponible. Vuelve al paso 3 y reintenta, o crea el producto sin ubicación.
                    </div>
                )}
            </ConfirmCard>

            {/* Descripción */}
            {data.descripcion && (
                <div style={{ marginTop: '10px' }}>
                    <ConfirmCard title="Descripción" onEdit={() => onEditStep(1)}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {data.descripcion}
                        </div>
                    </ConfirmCard>
                </div>
            )}

            {/* Error de guardado */}
            {saveError && (
                <div style={{
                    marginTop:    '16px',
                    padding:      '12px 16px',
                    background:   'rgba(248,113,113,0.08)',
                    border:       '1px solid rgba(248,113,113,0.30)',
                    borderRadius: '8px',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '12px',
                    color:        'var(--accent-danger)',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '10px',
                }}>
                    <span>⚠</span>
                    <span>{saveError}</span>
                </div>
            )}
        </div>
    );
}

// ── Componentes de apoyo ──────────────────────────────────────────────────────

type Errs = Partial<Record<keyof WizardData, string>>;

function StepHeader({ icon, title, desc }: { icon: string; title: string; desc: string }): JSX.Element {
    return (
        <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-cyan)', opacity: 0.6 }}>{icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    {title}
                </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {desc}
            </div>
        </div>
    );
}

function WField({ label, required = false, error, style, children }: {
    label:     string;
    required?: boolean;
    error?:    string;
    style?:    CSSProperties;
    children:  ReactNode;
}): JSX.Element {
    return (
        <div style={style}>
            <label style={{
                display:       'block',
                fontFamily:    'var(--font-display)',
                fontSize:      '11px',              /* mínimo AAA para labels */
                fontWeight:    700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color:         required ? 'var(--accent-primary)' : 'var(--text-secondary)',
                marginBottom:  '5px',
            }}>
                {label}{required && <span style={{ marginLeft: '2px', opacity: 0.7 }}>*</span>}
            </label>
            {children}
            {error && (
                <p style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '10px',
                    color:         'var(--accent-danger)',
                    margin:        '4px 0 0',
                    letterSpacing: '0.02em',
                }}>
                    ▲ {error}
                </p>
            )}
        </div>
    );
}

function WInput({
    hasError = false,
    style: extra,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }): JSX.Element {
    return (
        <input
            {...props}
            style={{
                width:        '100%',
                boxSizing:    'border-box',
                fontFamily:   'var(--font-mono)',
                fontSize:     '14px',              /* WCAG AAA — mínimo datos de formulario */
                color:        'var(--text-primary)',
                background:   'var(--bg-elevated)',
                border:       `1px solid ${hasError ? 'var(--accent-danger)' : 'var(--border-default)'}`,
                borderRadius: '6px',
                padding:      '9px 12px',
                outline:      'none',
                caretColor:   'var(--focus-color, #3B82F6)',
                transition:   'border-color 160ms ease, box-shadow 160ms ease',
                ...extra,
            }}
            onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--focus-color, #3B82F6)';
                e.currentTarget.style.boxShadow  = '0 0 0 4px var(--focus-glow, rgba(59,130,246,0.22))';
            }}
            onBlur={e => {
                e.currentTarget.style.borderColor = hasError ? 'var(--accent-danger)' : 'var(--border-default)';
                e.currentTarget.style.boxShadow  = 'none';
            }}
        />
    );
}

function ConfirmCard({ title, onEdit, children }: {
    title:    string;
    onEdit:   () => void;
    children: ReactNode;
}): JSX.Element {
    return (
        <div style={{
            background:   'var(--bg-elevated)',
            border:       '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding:      '14px 16px',
        }}>
            <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginBottom:   '10px',
            }}>
                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '11px',            /* AAA — labels de sección  */
                    fontWeight:    700,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color:         'var(--text-secondary)',
                }}>
                    {title}
                </span>
                <button
                    type="button"
                    onClick={onEdit}
                    style={{
                        background:    'transparent',
                        border:        'none',
                        cursor:        'pointer',
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '11px',
                        color:         'var(--accent-cyan)',
                        opacity:       0.7,
                        padding:       '0',
                        transition:    'opacity 140ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
                >
                    ✎ editar
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {children}
            </div>
        </div>
    );
}

function ConfirmRow({ label, value }: { label: string; value: ReactNode }): JSX.Element {
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                {label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: 500 }}>
                {value}
            </span>
        </div>
    );
}

// ── Estilos estáticos ─────────────────────────────────────────────────────────

const navBtnSecondary: CSSProperties = {
    fontFamily:    'var(--font-display)',
    fontSize:      '11px',
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    padding:       '10px 22px',
    background:    'transparent',
    color:         'var(--text-secondary)',
    border:        '1px solid var(--border-default)',
    borderRadius:  '6px',
    cursor:        'pointer',
    transition:    'border-color 160ms ease',
};

const navBtnPrimary: CSSProperties = {
    fontFamily:    'var(--font-display)',
    fontSize:      '11px',
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    padding:       '10px 28px',
    background:    'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))',
    color:         'var(--text-inverse)',
    border:        'none',
    borderRadius:  '6px',
    cursor:        'pointer',
    transition:    'opacity 160ms ease',
    boxShadow:     '0 0 20px var(--accent-primary-glow)',
};

const textareaStyle: CSSProperties = {
    width:        '100%',
    boxSizing:    'border-box',
    fontFamily:   'var(--font-mono)',
    fontSize:     '14px',              /* WCAG AAA mínimo                       */
    color:        'var(--text-primary)',
    background:   'var(--bg-elevated)',
    border:       '1px solid var(--border-default)',
    borderRadius: '6px',
    padding:      '10px 12px',
    outline:      'none',
    caretColor:   'var(--focus-color, #3B82F6)',
    resize:       'vertical',
    transition:   'border-color 160ms ease, box-shadow 160ms ease',
    lineHeight:   1.65,
};
