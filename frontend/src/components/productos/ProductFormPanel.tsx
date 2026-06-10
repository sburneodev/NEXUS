/**
 * components/productos/ProductFormPanel.tsx
 *
 * Formulario de alta/edición de producto integrado nativamente en el panel
 * central — no es un modal. Reemplaza la tabla al activarse.
 *
 * Soporta modo RETRO (prop modoRetro=true) para La Bóveda Retro:
 * muestra campos extra (estado conservación, plataforma, año) y
 * establece tipoProducto='RETRO' en creación.
 */

import {
    useState, useEffect,
    type FormEvent, type ReactNode, type InputHTMLAttributes, type CSSProperties,
} from 'react';
import type { Producto } from '../../types/models';
import type { ProductForm } from './ProductModal';
import { UbicacionPicker }       from './UbicacionPicker';
import type { UbicacionOption }  from './UbicacionPicker';
import api from '../../services/api';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ProductFormPanelProps {
    producto:      Producto | null;
    onCancel:      () => void;
    onSave:        (data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>) => void;
    initialValues?: Partial<ProductForm>;
    /** true → modo Bóveda Retro: campos extra, badge dorado, tipoProducto='RETRO' al crear */
    modoRetro?:    boolean;
}

const EMPTY: ProductForm = {
    sku: '', nombre: '', descripcion: '',
    precioCoste: '', precioVenta: '',
    stockActual: '', stockMinimo: '', stockMaximo: '',
    tipoProducto: 'ESTANDAR', estadoConservacion: '',
    activo: true,
    idProveedor: '', idCategoria: '', idUbicacion: '',
    plataforma: '', anio: '', tasacionIaEur: '',
};

// ── Componente principal ──────────────────────────────────────────────────────

export function ProductFormPanel({
    producto, onCancel, onSave, initialValues, modoRetro = false,
}: ProductFormPanelProps): JSX.Element {

    // Es RETRO si estamos en modo retro O si editamos un producto ya RETRO
    const isRetro = modoRetro || (producto?.tipoProducto === 'RETRO');

    const [form,   setForm]   = useState<ProductForm>(EMPTY);
    const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});

    const [ubicaciones,        setUbicaciones]        = useState<UbicacionOption[]>([]);
    const [ubicacionesLoading, setUbicacionesLoading] = useState(false);
    const [ubicacionesError,   setUbicacionesError]   = useState(false);
    const [ubicacionesRetry,   setUbicacionesRetry]   = useState(0);

    // Carga ubicaciones al montar
    useEffect(() => {
        setUbicacionesLoading(true);
        setUbicacionesError(false);
        api.get<UbicacionOption[]>('/almacen/ubicaciones')
            .then(r => setUbicaciones(Array.isArray(r.data) ? r.data : []))
            .catch(() => { setUbicacionesError(true); setUbicaciones([]); })
            .finally(() => setUbicacionesLoading(false));
    }, [ubicacionesRetry]);

    // Rellena el formulario al editar
    useEffect(() => {
        if (producto) {
            const attrs = producto.atributosEspecificos as Record<string, unknown> | null;
            setForm({
                sku:                producto.sku,
                nombre:             producto.nombre,
                descripcion:        producto.descripcion ?? '',
                precioCoste:        String(producto.precioCoste),
                precioVenta:        String(producto.precioVenta),
                stockActual:        String(producto.stockActual),
                stockMinimo:        String(producto.stockMinimo),
                stockMaximo:        String(producto.stockMaximo),
                tipoProducto:       producto.tipoProducto,
                estadoConservacion: producto.estadoConservacion ?? '',
                activo:             producto.activo,
                idProveedor:        producto.idProveedor != null ? String(producto.idProveedor) : '',
                idCategoria:        producto.idCategoria != null ? String(producto.idCategoria) : '',
                idUbicacion:        producto.idUbicacion != null ? String(producto.idUbicacion) : '',
                plataforma:         (attrs?.['plataforma'] as string | undefined) ?? '',
                anio:               attrs?.['anio'] != null ? String(attrs['anio']) : '',
            });
        } else {
            setForm({ ...EMPTY, ...initialValues });
        }
        setErrors({});
    }, [producto, initialValues]);

    // ── Validación ────────────────────────────────────────────────────────────

    function validate(): boolean {
        const e: Partial<Record<keyof ProductForm, string>> = {};
        if (!form.sku.trim())    e.sku    = 'Obligatorio';
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (isNaN(Number(form.precioCoste)) || Number(form.precioCoste) < 0)
            e.precioCoste = 'Valor no válido';
        if (isNaN(Number(form.precioVenta)) || Number(form.precioVenta) < 0)
            e.precioVenta = 'Valor no válido';
        if (isNaN(Number(form.stockActual)) || Number(form.stockActual) < 0)
            e.stockActual = 'Valor no válido';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function handleSubmit(e: FormEvent): void {
        e.preventDefault();
        if (!validate()) return;
        // Atributos específicos RETRO
        const atributosRetro = isRetro
            ? {
                ...(producto?.atributosEspecificos as Record<string, unknown> || {}),
                ...(form.plataforma.trim() ? { plataforma: form.plataforma.trim() } : {}),
                ...(form.anio.trim() ? { anio: Number(form.anio) } : {}),
                ...(form.tasacionIaEur && !isNaN(Number(form.tasacionIaEur))
                    ? { tasacion_ia_eur: Number(form.tasacionIaEur) } : {}),
              }
            : null;

        onSave({
            sku:                  form.sku.trim().toUpperCase(),
            nombre:               form.nombre.trim(),
            descripcion:          form.descripcion.trim() || null,
            idProveedor:          form.idProveedor ? Number(form.idProveedor) : null,
            idCategoria:          form.idCategoria ? Number(form.idCategoria) : null,
            idUbicacion:          form.idUbicacion ? Number(form.idUbicacion) : null,
            precioCoste:          Number(form.precioCoste),
            precioVenta:          Number(form.precioVenta),
            stockActual:          Number(form.stockActual),
            stockMinimo:          Number(form.stockMinimo) || 0,
            stockMaximo:          Number(form.stockMaximo) || 999,
            tipoProducto:         isRetro ? 'RETRO' : 'ESTANDAR',
            estadoConservacion:   isRetro
                ? ((form.estadoConservacion || null) as Producto['estadoConservacion'])
                : null,
            activo:               form.activo,
            categoriaNombre:      null,
            atributosEspecificos: isRetro ? atributosRetro : (producto ? producto.atributosEspecificos : null),
        });
    }

    const set = (key: keyof ProductForm) =>
        (e: { target: { value: string } }) =>
            setForm(p => ({ ...p, [key]: e.target.value }));

    const isEdit = producto !== null;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: 0 }}>

            {/* ── Cabecera ─────────────────────────────────────────────────── */}
            <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginBottom:   '20px',
                paddingBottom:  '16px',
                borderBottom:   '1px solid var(--border-subtle)',
            }}>
                {/* Breadcrumb */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                background: 'transparent', border: 'none', padding: 0,
                                fontFamily: 'var(--font-mono)', fontSize: '11px',
                                color: 'var(--text-muted)', cursor: 'pointer',
                                letterSpacing: '0.04em',
                                transition: 'color 140ms ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                        >
                            {isRetro ? 'Bóveda Retro' : 'Productos'}
                        </button>
                        <span style={{ color: 'var(--border-default)', fontSize: '10px' }}>›</span>
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '11px',
                            color:         isRetro ? 'var(--accent-gold)' : 'var(--accent-cyan)',
                            letterSpacing: '0.04em',
                        }}>
                            {isEdit ? `Editar · ${producto!.sku}` : (isRetro ? 'Nueva pieza retro' : 'Nuevo producto estándar')}
                        </span>
                    </div>
                    <h1 style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '18px',
                        fontWeight:    700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:         'var(--text-primary)',
                        margin:        0,
                        lineHeight:    1.1,
                    }}>
                        {isEdit ? producto!.nombre : '+ Nuevo Producto'}
                    </h1>
                </div>

                {/* Badge tipo + botón cancelar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        fontWeight:    700,
                        letterSpacing: '0.12em',
                        color:         isRetro ? 'var(--accent-gold)' : 'var(--accent-cyan)',
                        border:        `1px solid ${isRetro ? 'var(--accent-gold)' : 'var(--accent-cyan)'}`,
                        borderRadius:  '4px',
                        padding:       '3px 10px',
                        background:    isRetro ? 'rgba(251,191,36,0.06)' : 'rgba(56,189,248,0.06)',
                    }}>
                        {isRetro ? '★ RETRO' : 'ESTÁNDAR'}
                    </span>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            background:    'transparent',
                            border:        '1px solid var(--border-default)',
                            borderRadius:  '6px',
                            color:         'var(--text-muted)',
                            cursor:        'pointer',
                            padding:       '6px 14px',
                            fontFamily:    'var(--font-display)',
                            fontSize:      '11px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            transition:    'all 160ms ease',
                        }}
                        onMouseEnter={e => {
                            const b = e.currentTarget as HTMLButtonElement;
                            b.style.borderColor = 'var(--border-default)';
                            b.style.color = 'var(--text-secondary)';
                        }}
                        onMouseLeave={e => {
                            const b = e.currentTarget as HTMLButtonElement;
                            b.style.borderColor = 'var(--border-default)';
                            b.style.color = 'var(--text-muted)';
                        }}
                    >
                        ✕ Cancelar
                    </button>
                </div>
            </div>

            {/* ── Cuerpo del formulario ─────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

                {/* Fila 1: Identificación + Precios & Stock */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                    {/* ── Identificación ── */}
                    <Section icon="◈" title="Identificación">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                            <Field label="SKU" required error={errors.sku}>
                                <Input
                                    placeholder="STD-PS5-001"
                                    value={form.sku}
                                    onChange={set('sku')}
                                    hasError={!!errors.sku}
                                    style={{ textTransform: 'uppercase', fontWeight: 600 }}
                                />
                            </Field>
                            <Field label="Nombre del producto" required error={errors.nombre}>
                                <Input
                                    placeholder="God of War Ragnarök — PS5"
                                    value={form.nombre}
                                    onChange={set('nombre')}
                                    hasError={!!errors.nombre}
                                />
                            </Field>
                        </div>
                    </Section>

                    {/* ── Precios & Stock ── */}
                    <Section icon="▦" title="Precios & Stock">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Field label="Precio Coste (€)" required error={errors.precioCoste}>
                                <Input
                                    type="number" placeholder="0.00" step="0.01"
                                    value={form.precioCoste} onChange={set('precioCoste')}
                                    hasError={!!errors.precioCoste}
                                />
                            </Field>
                            <Field label="Precio Venta (€)" required error={errors.precioVenta}>
                                <Input
                                    type="number" placeholder="0.00" step="0.01"
                                    value={form.precioVenta} onChange={set('precioVenta')}
                                    hasError={!!errors.precioVenta}
                                />
                            </Field>
                            <Field label="Stock Actual" required error={errors.stockActual}>
                                <Input
                                    type="number" placeholder="0"
                                    value={form.stockActual} onChange={set('stockActual')}
                                    hasError={!!errors.stockActual}
                                />
                            </Field>
                            <Field label="Stock Mínimo">
                                <Input
                                    type="number" placeholder="5"
                                    value={form.stockMinimo} onChange={set('stockMinimo')}
                                />
                            </Field>
                        </div>
                    </Section>
                </div>

                {/* Fila 2: Clasificación + Almacén */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                    {/* ── Clasificación ── */}
                    <Section icon="◎" title="Clasificación">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                            <Field label="ID Proveedor">
                                <Input
                                    type="number" placeholder="—"
                                    value={form.idProveedor} onChange={set('idProveedor')}
                                />
                            </Field>
                            <Field label="ID Categoría">
                                <Input
                                    type="number" placeholder="—"
                                    value={form.idCategoria} onChange={set('idCategoria')}
                                />
                            </Field>
                        </div>

                        {/* Toggle Activo */}
                        <div style={{
                            display:      'flex',
                            alignItems:   'center',
                            justifyContent: 'space-between',
                            background:   'var(--bg-elevated)',
                            border:       '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            padding:      '10px 14px',
                        }}>
                            <div>
                                <div style={{
                                    fontFamily: 'var(--font-display)', fontSize: '11px',
                                    fontWeight: 700, letterSpacing: '0.08em',
                                    textTransform: 'uppercase', color: 'var(--text-primary)',
                                }}>
                                    Producto activo
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {form.activo ? 'Visible y disponible en el sistema' : 'Oculto e inactivo'}
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={form.activo}
                                onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                                style={{
                                    width:        '44px',
                                    height:       '24px',
                                    borderRadius: '12px',
                                    background:   form.activo ? 'var(--accent-primary)' : 'var(--bg-overlay)',
                                    border:       `1px solid ${form.activo ? 'var(--accent-primary)' : 'var(--border-default)'}`,
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
                                    marginLeft:   form.activo ? 'auto' : '0',
                                    transition:   'margin 200ms ease',
                                    boxShadow:    '0 1px 3px rgba(0,0,0,0.30)',
                                }} />
                            </button>
                        </div>
                    </Section>

                    {/* ── Almacén & Logística ── */}
                    <Section icon="▤" title="Almacén & Logística">
                        <Field label="Zona de almacén">
                            <UbicacionPicker
                                ubicaciones={ubicaciones}
                                loading={ubicacionesLoading}
                                error={ubicacionesError}
                                value={form.idUbicacion}
                                onChange={id => setForm(p => ({ ...p, idUbicacion: id }))}
                                onRetry={() => setUbicacionesRetry(n => n + 1)}
                            />
                        </Field>
                    </Section>
                </div>

                {/* Fila 3: Campos exclusivos RETRO */}
                {isRetro && (
                    <Section icon="★" title="Datos Retro">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>

                            {/* Estado de conservación */}
                            <Field label="Estado de conservación">
                                <select
                                    value={form.estadoConservacion}
                                    onChange={set('estadoConservacion')}
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        fontFamily: 'var(--font-mono)', fontSize: '13px',
                                        color: form.estadoConservacion ? 'var(--text-primary)' : 'var(--text-muted)',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-default)', borderRadius: '6px',
                                        padding: '9px 12px', outline: 'none', cursor: 'pointer',
                                        transition: 'border-color 160ms ease, box-shadow 160ms ease',
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.10)'; }}
                                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <option value="">— Sin especificar</option>
                                    <option value="MINT">MINT — Precintado de fábrica</option>
                                    <option value="CIB">CIB — Caja + cartucho + manual</option>
                                    <option value="LOOSE">LOOSE — Solo cartucho/disco</option>
                                    <option value="LOOSE_D">DMG — Con daños visibles</option>
                                </select>
                            </Field>

                            {/* Plataforma */}
                            <Field label="Plataforma">
                                <Input
                                    placeholder="ej. PlayStation 2"
                                    value={form.plataforma}
                                    onChange={set('plataforma')}
                                />
                            </Field>

                            {/* Año */}
                            <Field label="Año de lanzamiento">
                                <Input
                                    type="number"
                                    placeholder="ej. 2001"
                                    value={form.anio}
                                    onChange={set('anio')}
                                />
                            </Field>
                        </div>
                    </Section>
                )}

                {/* Fila 4: Descripción — ancho completo */}
                <Section icon="◧" title="Descripción">
                    <textarea
                        rows={3}
                        value={form.descripcion}
                        onChange={set('descripcion')}
                        placeholder="Descripción opcional del producto..."
                        style={{
                            width:         '100%',
                            boxSizing:     'border-box',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '13px',
                            color:         'var(--text-primary)',
                            background:    'var(--bg-elevated)',
                            border:        '1px solid var(--border-default)',
                            borderRadius:  '6px',
                            padding:       '10px 12px',
                            outline:       'none',
                            caretColor:    'var(--accent-cyan)',
                            resize:        'vertical',
                            transition:    'border-color 160ms ease, box-shadow 160ms ease',
                            lineHeight:    1.6,
                        }}
                        onFocus={e  => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-cyan-glow)'; }}
                        onBlur={e   => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                </Section>
            </div>

            {/* ── Footer de acciones ────────────────────────────────────────── */}
            <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginTop:      '20px',
                paddingTop:     '16px',
                borderTop:      '1px solid var(--border-subtle)',
            }}>
                <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '10px',
                    color:         'var(--text-muted)',
                    letterSpacing: '0.04em',
                }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>*</span> Campos obligatorios
                </span>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
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
                            transition:    'all 160ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; }}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        style={{
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
                            display:       'flex',
                            alignItems:    'center',
                            gap:           '8px',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                    >
                        {isEdit ? '✓ Guardar Cambios' : (isRetro ? '◆ Añadir Pieza Retro' : '+ Crear Producto')}
                    </button>
                </div>
            </div>
        </form>
    );
}

// ── Componentes de apoyo ──────────────────────────────────────────────────────

/** Tarjeta de sección con título e icono */
function Section({
    icon, title, children,
}: {
    icon: string;
    title: string;
    children: ReactNode;
}): JSX.Element {
    return (
        <div style={{
            background:   'var(--bg-surface)',
            border:       '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding:      '16px 18px',
        }}>
            {/* Header de sección */}
            <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '7px',
                marginBottom:  '14px',
            }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', opacity: 0.7 }}>
                    {icon}
                </span>
                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '9px',
                    fontWeight:    700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color:         'var(--text-muted)',
                }}>
                    {title}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>
            {children}
        </div>
    );
}

/** Campo de formulario con label y mensaje de error */
function Field({
    label, required = false, error, children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}): JSX.Element {
    return (
        <div>
            <label style={{
                display:       'block',
                fontFamily:    'var(--font-display)',
                fontSize:      '9px',
                fontWeight:    700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:         required ? 'var(--accent-cyan)' : 'var(--text-muted)',
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

/** Input estilizado */
function Input({
    hasError = false,
    style: extraStyle,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }): JSX.Element {
    return (
        <input
            {...props}
            style={{
                width:         '100%',
                boxSizing:     'border-box',
                fontFamily:    'var(--font-mono)',
                fontSize:      '13px',
                color:         'var(--text-primary)',
                background:    'var(--bg-elevated)',
                border:        `1px solid ${hasError ? 'var(--accent-danger)' : 'var(--border-default)'}`,
                borderRadius:  '6px',
                padding:       '9px 12px',
                outline:       'none',
                caretColor:    'var(--accent-cyan)',
                transition:    'border-color 160ms ease, box-shadow 160ms ease',
                ...extraStyle,
            }}
            onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                e.currentTarget.style.boxShadow  = '0 0 0 3px var(--accent-cyan-glow)';
            }}
            onBlur={e => {
                e.currentTarget.style.borderColor = hasError ? 'var(--accent-danger)' : 'var(--border-default)';
                e.currentTarget.style.boxShadow  = 'none';
            }}
        />
    );
}
