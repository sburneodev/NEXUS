/**
 * components/productos/ProductModal.tsx — UI-05
 *
 * Modal reutilizable para alta y edición de productos.
 * Props tipadas con ProductModalProps.
 * Validación básica: campos requeridos y tipos numéricos.
 */

import { useState, useEffect, FormEvent } from 'react';
import type { Producto, TipoProducto, EstadoConservacion } from '../../types/models';

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
};

// ── Componente ────────────────────────────────────────────────────────

export function ProductModal({ producto, isOpen, onClose, onSave, initialValues }: ProductModalProps): JSX.Element | null {

    const [form, setForm]     = useState<ProductForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});

    useEffect(() => {
        if (producto) {
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
            tipoProducto:         form.tipoProducto,
            estadoConservacion:   form.estadoConservacion || null,
            activo:               form.activo,
            atributosEspecificos: null,
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
                            {producto ? '✎ EDITAR PRODUCTO' : '+ NUEVO PRODUCTO'}
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

                        {/* Tipo producto */}
                        <div>
                            <label style={labelStyle}>Tipo Producto</label>
                            <select
                                value={form.tipoProducto}
                                onChange={e => setForm(prev => ({ ...prev, tipoProducto: e.target.value as TipoProducto }))}
                                style={inputStyle}
                            >
                                <option value="ESTANDAR">ESTÁNDAR</option>
                                <option value="RETRO">RETRO — La Bóveda</option>
                            </select>
                        </div>

                        {/* Estado conservación (solo RETRO) */}
                        <div>
                            <label style={labelStyle}>Estado Conservación</label>
                            <select
                                value={form.estadoConservacion}
                                onChange={e => setForm(prev => ({ ...prev, estadoConservacion: e.target.value as EstadoConservacion | '' }))}
                                disabled={form.tipoProducto !== 'RETRO'}
                                style={{ ...inputStyle, opacity: form.tipoProducto !== 'RETRO' ? 0.4 : 1 }}
                            >
                                <option value="">— No aplica —</option>
                                <option value="MINT">MINT</option>
                                <option value="CIB">CIB</option>
                                <option value="LOOSE">LOOSE</option>
                                <option value="LOOSE_D">LOOSE_D</option>
                            </select>
                        </div>

                        {/* IDs de relaciones FK */}
                        {field('ID Proveedor', 'idProveedor', 'number', '1')}
                        {field('ID Categoría', 'idCategoria', 'number', '1')}
                        <div style={{ gridColumn: '1 / -1' }}>
                            {field('ID Ubicación en Almacén', 'idUbicacion', 'number', '1')}
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
