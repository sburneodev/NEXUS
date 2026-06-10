/**
 * components/productos/ProductModal.tsx — UI-05
 *
 * Modal reutilizable para alta y edición de productos.
 * Props tipadas con ProductModalProps.
 * Validación básica: campos requeridos y tipos numéricos.
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Producto, TipoProducto, EstadoConservacion } from '../../types/models';
import api from '../../services/api';

// ── Tipo de ubicación devuelta por GET /almacen/ubicaciones ───────────
// Modelo zona compartida: una ubicación puede tener varios productos.
interface UbicacionOption {
    id:           number;
    pasillo:      string;
    estanteria:   string;
    nivel:        number;
    numProductos: number;
}

// ── Tipos ─────────────────────────────────────────────────────────────

/** Datos del formulario — Partial de Producto sin campos de auditoría */
export interface ProductForm {
    sku:                string;
    nombre:             string;
    descripcion:        string;
    precioCoste:        string;   // string para el input, se convierte a number al guardar
    precioVenta:        string;
    stockActual:        string;
    stockMinimo:        string;
    stockMaximo:        string;
    tipoProducto:       TipoProducto;
    estadoConservacion: EstadoConservacion | '';
    activo:             boolean;
    idProveedor:        string;   // string para el input, convertido a number|null al guardar
    idCategoria:        string;
    idUbicacion:        string;
    // ── Atributos retro (almacenados en atributosEspecificos) ─────────
    plataforma:         string;
    anio:               string;
    tasacionIaEur?:     string;   // precio recomendado IA → se guarda en atributosEspecificos
}

export interface ProductModalProps {
    /** null = modo alta, Producto = modo edición */
    producto:       Producto | null;
    isOpen:         boolean;
    onClose:        () => void;
    /**
     * Datos del formulario listos para enviar al backend.
     * Excluye campos de solo lectura: id, creadoEn, actualizadoEn, proveedorNombre.
     */
    onSave:         (data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn' | 'proveedorNombre'>) => void;
    /** Valores precargados por IA (solo en modo alta) */
    initialValues?: Partial<ProductForm>;
    /**
     * Contexto de creación — fija el tipo automáticamente y adapta el UI.
     * · 'ESTANDAR' → desde Productos (tipo fijo ESTANDAR, sin estadoConservacion)
     * · 'RETRO'    → desde Bóveda/Tasador (tipo fijo RETRO, con estadoConservacion)
     * · undefined  → modo edición (tipo read-only, estadoConservacion si es RETRO)
     */
    modoCreacion?:  'ESTANDAR' | 'RETRO';
}

const EMPTY_FORM: ProductForm = {
    sku:                '',
    nombre:             '',
    descripcion:        '',
    precioCoste:        '',
    precioVenta:        '',
    stockActual:        '',
    stockMinimo:        '',
    stockMaximo:        '',
    tipoProducto:       'ESTANDAR',
    estadoConservacion: '',
    activo:             true,
    idProveedor:        '',
    idCategoria:        '',
    idUbicacion:        '',
    plataforma:         '',
    anio:               '',
};

// ── Componente ────────────────────────────────────────────────────────

export function ProductModal({ producto, isOpen, onClose, onSave, initialValues, modoCreacion }: ProductModalProps): JSX.Element | null {

    const [form, setForm]         = useState<ProductForm>(EMPTY_FORM);
    const [errors, setErrors]     = useState<Partial<Record<keyof ProductForm, string>>>({});
    const [ubicaciones,        setUbicaciones]        = useState<UbicacionOption[]>([]);
    const [ubicacionesLoading, setUbicacionesLoading] = useState(false);
    const [ubicacionesError,   setUbicacionesError]   = useState(false);
    const [ubicacionesRetry,   setUbicacionesRetry]   = useState(0);

    // Carga las ubicaciones del almacén al abrir el modal (o al pulsar Reintentar)
    useEffect(() => {
        if (!isOpen) return;
        setUbicacionesLoading(true);
        setUbicacionesError(false);
        api.get<UbicacionOption[]>('/almacen/ubicaciones')
            .then(r => {
                // Validar que la respuesta es un array antes de usarla
                const data = Array.isArray(r.data) ? r.data : [];
                setUbicaciones(data);
            })
            .catch((err: unknown) => {
                const status = (err as { response?: { status?: number } })?.response?.status;
                console.error('[ProductModal] Error cargando ubicaciones:', status, err);
                setUbicacionesError(true);
                setUbicaciones([]);
            })
            .finally(() => setUbicacionesLoading(false));
    }, [isOpen, ubicacionesRetry]);

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
        } else if (initialValues) {
            setForm({ ...EMPTY_FORM, ...initialValues });
        } else {
            setForm(EMPTY_FORM);
        }
        setErrors({});
    }, [producto, isOpen, initialValues]);

    if (!isOpen) return null;

    function validate(): boolean {
        const newErrors: Partial<Record<keyof ProductForm, string>> = {};
        if (!form.sku.trim())    newErrors.sku    = 'El SKU es obligatorio';
        if (!form.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
        if (isNaN(Number(form.precioCoste)) || Number(form.precioCoste) < 0)
            newErrors.precioCoste = 'Precio no válido';
        if (isNaN(Number(form.precioVenta)) || Number(form.precioVenta) < 0)
            newErrors.precioVenta = 'Precio no válido';
        if (isNaN(Number(form.stockActual)) || Number(form.stockActual) < 0)
            newErrors.stockActual = 'Stock no válido';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function handleSubmit(e: FormEvent): void {
        e.preventDefault();
        if (!validate()) return;
        const esRetro = (modoCreacion ?? form.tipoProducto) === 'RETRO';
        const atributosRetro = esRetro
            ? {
                ...(form.plataforma.trim() ? { plataforma: form.plataforma.trim() } : {}),
                ...(form.anio.trim()       ? { anio: Number(form.anio) }            : {}),
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
            tipoProducto:         modoCreacion ?? form.tipoProducto,
            estadoConservacion:   form.estadoConservacion || null,
            activo:               form.activo,
            categoriaNombre:      null,   // solo lectura — lo rellena el backend en GET
            atributosEspecificos: atributosRetro,
        });
    }

    function field(
        label: string,
        key: keyof ProductForm,
        type: string = 'text',
        placeholder: string = ''
    ): JSX.Element {
        const val = form[key];
        return (
            <div>
                <label style={labelStyle}>{label}</label>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={typeof val === 'boolean' ? '' : val}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
                        ...inputStyle,
                        borderColor: errors[key] ? 'var(--accent-danger)' : undefined,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-cyan-glow)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors[key] ? 'var(--accent-danger)' : 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                {errors[key] && <p style={errorStyle}>{errors[key]}</p>}
            </div>
        );
    }

    return (
        <>
            {/* Overlay + centrado: un único contenedor fixed que hace de backdrop y flex-center */}
            <div
                onClick={onClose}
                style={{
                    position:        'fixed',
                    inset:           0,
                    zIndex:          100,
                    background:      'rgba(0,0,0,0.7)',
                    backdropFilter:  'blur(4px)',
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    padding:         '16px',
                }}
            >
            {/* Modal — detenemos la propagación para que click interior no cierre */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width:        '100%',
                    maxWidth:     '560px',
                    maxHeight:    '90dvh',
                    overflowY:    'auto',
                    background:   'var(--bg-surface)',
                    border:       '1px solid var(--border-default)',
                    borderRadius: '12px',
                    boxShadow:    '0 24px 64px rgba(0,0,0,0.6)',
                    animation:    'fadeInUp 0.2s ease both',
                    flexShrink:   0,
                }}>

                {/* Cabecera */}
                <div style={{
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'space-between',
                    padding:      '20px 24px',
                    borderBottom: '1px solid var(--border-subtle)',
                    position:     'sticky',
                    top:          0,
                    background:   'var(--bg-surface)',
                    zIndex:       1,
                }}>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                            {producto
                                ? '✎ EDITAR PRODUCTO'
                                : modoCreacion === 'RETRO'
                                    ? '◆ NUEVA PIEZA RETRO'
                                    : '+ NUEVO PRODUCTO ESTÁNDAR'}
                        </h2>
                        {producto && (
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', margin: '2px 0 0', letterSpacing: '0.06em' }}>
                                {producto.sku}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} aria-label="Cerrar modal" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                        {/* SKU — ancho completo */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            {field('SKU *', 'sku', 'text', 'STD-PS5-001')}
                        </div>

                        {/* Nombre — ancho completo */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            {field('Nombre *', 'nombre', 'text', 'God of War Ragnarök — PS5')}
                        </div>

                        {field('Precio Coste (€) *', 'precioCoste', 'number', '0.00')}
                        {field('Precio Venta (€) *', 'precioVenta', 'number', '0.00')}
                        {field('Stock Actual *', 'stockActual', 'number', '0')}
                        {field('Stock Mínimo', 'stockMinimo', 'number', '5')}

                        {/* ── Tipo: badge read-only en edición ────────────────── */}
                        {producto && (
                            <div>
                                <label style={labelStyle}>Tipo Producto</label>
                                <div style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '12px',
                                    fontWeight:    700,
                                    letterSpacing: '0.08em',
                                    color:         form.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--accent-cyan)',
                                    border:        `1px solid ${form.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--accent-cyan)'}`,
                                    borderRadius:  '6px',
                                    padding:       '9px 12px',
                                    background:    form.tipoProducto === 'RETRO' ? 'rgba(251,191,36,0.06)' : 'rgba(56,189,248,0.06)',
                                    userSelect:    'none',
                                }}>
                                    {form.tipoProducto === 'RETRO' ? '◆ RETRO — La Bóveda' : '● ESTÁNDAR'}
                                </div>
                            </div>
                        )}

                        {/* ── Campos exclusivos RETRO ──────────────────────────── */}
                        {(modoCreacion === 'RETRO' || (producto && form.tipoProducto === 'RETRO')) && (
                            <>
                                <div>
                                    <label style={labelStyle}>Estado Conservación</label>
                                    <select
                                        value={form.estadoConservacion}
                                        onChange={e => setForm(prev => ({ ...prev, estadoConservacion: e.target.value as EstadoConservacion | '' }))}
                                        style={inputStyle}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-cyan-glow)'; }}
                                        onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <option value="">— Sin especificar —</option>
                                        <option value="MINT">MINT — Precintado</option>
                                        <option value="CIB">CIB — Caja + Manual</option>
                                        <option value="LOOSE">LOOSE — Solo cartucho</option>
                                        <option value="LOOSE_D">LOOSE-D — Con daños</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={labelStyle}>Plataforma</label>
                                    <input
                                        type="text"
                                        placeholder="SNES, N64, PS1, Game Boy…"
                                        value={form.plataforma}
                                        onChange={e => setForm(prev => ({ ...prev, plataforma: e.target.value }))}
                                        style={inputStyle}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-cyan-glow)'; }}
                                        onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>

                                <div>
                                    <label style={labelStyle}>Año de lanzamiento</label>
                                    <input
                                        type="number"
                                        placeholder="1996"
                                        min={1970}
                                        max={2010}
                                        value={form.anio}
                                        onChange={e => setForm(prev => ({ ...prev, anio: e.target.value }))}
                                        style={inputStyle}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-cyan-glow)'; }}
                                        onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </>
                        )}

                        {/* IDs de relaciones FK */}
                        {field('ID Proveedor', 'idProveedor', 'number', '1')}
                        {field('ID Categoría', 'idCategoria', 'number', '1')}

                        {/* ── Selector de ubicación en almacén ───────────────── */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Zona de Almacén</label>
                            <UbicacionPicker
                                ubicaciones={ubicaciones}
                                loading={ubicacionesLoading}
                                error={ubicacionesError}
                                value={form.idUbicacion}
                                onChange={id => setForm(prev => ({ ...prev, idUbicacion: id }))}
                                onRetry={() => setUbicacionesRetry(n => n + 1)}
                            />
                        </div>

                        {/* Descripción — ancho completo */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Descripción</label>
                            <textarea
                                rows={2}
                                value={form.descripcion}
                                onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        {/* Activo */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                id="activo"
                                checked={form.activo}
                                onChange={e => setForm(prev => ({ ...prev, activo: e.target.checked }))}
                                style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="activo" style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-secondary)', cursor: 'pointer', textTransform: 'uppercase' }}>
                                Producto activo
                            </label>
                        </div>
                    </div>

                    {/* ── Banner informativo — al final, fuera del grid ── */}
                    {!producto && modoCreacion === 'ESTANDAR' && (
                        <div style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.20)', borderRadius: '7px', padding: '10px 14px' }}>
                            <span style={{ color: 'var(--accent-cyan)', fontSize: '14px', flexShrink: 0, lineHeight: 1.4 }}>ℹ</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.02em', lineHeight: 1.55 }}>
                                Solo se pueden crear <strong style={{ color: 'var(--text-primary)' }}>productos estándar</strong> desde este módulo.
                                Los productos retro se registran a través del módulo{' '}
                                <strong style={{ color: 'var(--accent-primary)' }}>Bóveda</strong>.
                            </span>
                        </div>
                    )}
                    {!producto && modoCreacion === 'RETRO' && (
                        <div style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '7px', padding: '10px 14px' }}>
                            <span style={{ color: 'var(--accent-primary)', fontSize: '14px', flexShrink: 0, lineHeight: 1.4 }}>◆</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.02em', lineHeight: 1.55 }}>
                                Este producto se registrará como <strong style={{ color: 'var(--accent-primary)' }}>pieza retro</strong> en{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>La Bóveda</strong>.
                                El tipo se asigna automáticamente.
                            </span>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{
                        display:        'flex',
                        justifyContent: 'flex-end',
                        gap:            '10px',
                        padding:        '16px 24px',
                        borderTop:      '1px solid var(--border-subtle)',
                        position:       'sticky',
                        bottom:         0,
                        background:     'var(--bg-surface)',
                    }}>
                        <button type="button" onClick={onClose} style={cancelBtnStyle}>
                            CANCELAR
                        </button>
                        <button type="submit" style={saveBtnStyle}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                        >
                            {producto ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
                        </button>
                    </div>
                </form>
            </div>
            </div>
        </>
    );
}

// ── Estilos reutilizables ─────────────────────────────────────────────
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

const inputStyle: React.CSSProperties = {
    width:         '100%',
    boxSizing:     'border-box',
    fontFamily:    'var(--font-mono)',
    fontSize:      '13px',
    color:         'var(--text-primary)',
    background:    'var(--bg-elevated)',
    border:        '1px solid var(--border-default)',
    borderRadius:  '6px',
    padding:       '9px 12px',
    outline:       'none',
    caretColor:    'var(--accent-cyan)',
    transition:    'border-color 160ms ease, box-shadow 160ms ease',
};

const errorStyle: React.CSSProperties = {
    fontFamily:    'var(--font-mono)',
    fontSize:      '10px',
    color:         'var(--accent-danger)',
    margin:        '4px 0 0',
    letterSpacing: '0.02em',
};

const cancelBtnStyle: React.CSSProperties = {
    fontFamily:    'var(--font-display)',
    fontSize:      '12px',
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    padding:       '9px 20px',
    background:    'transparent',
    color:         'var(--text-secondary)',
    border:        '1px solid var(--border-default)',
    borderRadius:  '6px',
    cursor:        'pointer',
    transition:    'all 160ms ease',
};

const saveBtnStyle: React.CSSProperties = {
    fontFamily:    'var(--font-display)',
    fontSize:      '12px',
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    padding:       '9px 20px',
    background:    'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))',
    color:         'var(--text-inverse)',
    border:        'none',
    borderRadius:  '6px',
    cursor:        'pointer',
    transition:    'opacity 160ms ease',
    boxShadow:     '0 0 16px var(--accent-primary-glow)',
};

// ── UbicacionPicker — selector de zona de almacén (modelo 1:N) ────────
// Una zona puede albergar varios productos. Se muestra el conteo actual
// como referencia, pero no bloquea la selección.

interface UbicacionPickerProps {
    ubicaciones: UbicacionOption[];
    loading:     boolean;
    error:       boolean;
    value:       string;
    onChange:    (id: string) => void;
    onRetry:     () => void;
}

function UbicacionPicker({
    ubicaciones, loading, error, value, onChange, onRetry,
}: UbicacionPickerProps): JSX.Element {
    const [open, setOpen] = useState(false);
    const ref             = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const selected = ubicaciones.find(u => String(u.id) === value) ?? null;
    const pasillos = Array.from(new Set(ubicaciones.map(u => u.pasillo)));

    /** Badge de disponibilidad: siempre verde LIBRE (modelo 1:N — todas las zonas aceptan más productos).
     *  Si ya tiene productos, muestra el conteo como dato informativo pero sigue siendo LIBRE. */
    function BadgeZona({ n, small = false }: { n: number; small?: boolean }) {
        return (
            <span style={{
                fontFamily:    'var(--font-display)',
                fontSize:      small ? '9px' : '10px',
                fontWeight:    700,
                letterSpacing: '0.08em',
                padding:       small ? '2px 6px' : '2px 8px',
                borderRadius:  '3px',
                flexShrink:    0,
                background:    'rgba(34,197,94,0.12)',
                color:         '#22C55E',
                border:        '1px solid rgba(34,197,94,0.30)',
            }}>
                {n > 0 ? `LIBRE · ${n}` : 'LIBRE'}
            </span>
        );
    }

    // ── Estado de error ────────────────────────────────────────────────
    if (error) {
        return (
            <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                gap:            '10px',
                background:     'rgba(248,113,113,0.06)',
                border:         '1px solid rgba(248,113,113,0.25)',
                borderRadius:   '6px',
                padding:        '9px 12px',
            }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                    ⚠ Zonas de almacén no disponibles temporalmente
                </span>
                <button
                    type="button"
                    onClick={onRetry}
                    style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '10px',
                        fontWeight:    700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding:       '4px 10px',
                        background:    'transparent',
                        color:         'var(--accent-cyan)',
                        border:        '1px solid var(--accent-cyan)',
                        borderRadius:  '4px',
                        cursor:        'pointer',
                        flexShrink:    0,
                    }}
                >
                    ↺ Reintentar
                </button>
            </div>
        );
    }

    // ── Trigger ────────────────────────────────────────────────────────
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(p => !p)}
                style={{
                    ...inputStyle,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    cursor:         loading ? 'wait' : 'pointer',
                    opacity:        loading ? 0.6 : 1,
                    textAlign:      'left',
                    gap:            '8px',
                }}
            >
                {loading ? (
                    <span style={{ color: 'var(--text-muted)' }}>Cargando zonas…</span>
                ) : selected ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            Pasillo {selected.pasillo} · Est. {selected.estanteria} · Nivel {selected.nivel}
                        </span>
                        <BadgeZona n={selected.numProductos} small />
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>— Sin zona asignada —</span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
            </button>

            {/* ── Lista desplegable ──────────────────────────────────── */}
            {open && (
                <div style={{
                    position:     'absolute',
                    top:          'calc(100% + 4px)',
                    left:         0,
                    right:        0,
                    zIndex:       500,
                    background:   'var(--bg-elevated)',
                    border:       '1px solid var(--border-default)',
                    borderRadius: '8px',
                    boxShadow:    'var(--shadow-lg)',
                    maxHeight:    '260px',
                    overflowY:    'auto',
                    animation:    'fadeInUp 0.12s cubic-bezier(0.23,1,0.32,1) both',
                }}>
                    {/* Opción vacía */}
                    <div
                        onClick={() => { onChange(''); setOpen(false); }}
                        style={{
                            padding:      '9px 14px',
                            fontFamily:   'var(--font-mono)',
                            fontSize:     '12px',
                            color:        'var(--text-muted)',
                            cursor:       'pointer',
                            borderBottom: '1px solid var(--border-subtle)',
                            transition:   'background 120ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-overlay)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                        — Sin zona asignada —
                    </div>

                    {/* Grupos por pasillo */}
                    {pasillos.map(pasillo => (
                        <div key={pasillo}>
                            <div style={{
                                padding:       '6px 14px 3px',
                                fontFamily:    'var(--font-display)',
                                fontSize:      '9px',
                                fontWeight:    700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color:         'var(--text-muted)',
                                opacity:       0.7,
                            }}>
                                Pasillo {pasillo}
                            </div>

                            {ubicaciones
                                .filter(u => u.pasillo === pasillo)
                                .map(u => {
                                    const isSelected = String(u.id) === value;
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => { onChange(String(u.id)); setOpen(false); }}
                                            style={{
                                                display:        'flex',
                                                alignItems:     'center',
                                                justifyContent: 'space-between',
                                                gap:            '10px',
                                                padding:        '8px 14px',
                                                cursor:         'pointer',
                                                background:     isSelected ? 'rgba(56,189,248,0.08)' : 'transparent',
                                                borderLeft:     isSelected ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                                                transition:     'background 120ms ease',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLDivElement).style.background =
                                                    isSelected ? 'rgba(56,189,248,0.10)' : 'var(--bg-overlay)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLDivElement).style.background =
                                                    isSelected ? 'rgba(56,189,248,0.08)' : 'transparent';
                                            }}
                                        >
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   '12px',
                                                color:      isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                                            }}>
                                                Est. {u.estanteria} · Nivel {u.nivel}
                                            </span>
                                            <BadgeZona n={u.numProductos} small />
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
