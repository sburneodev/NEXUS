/**
 * pages/StockPage.tsx — Control de Stock ACID
 *
 * ── DIAGNÓSTICO DEL "BUG" ────────────────────────────────────────────
 * La ruta /stock apuntaba a <ComingSoon> — la página no existía.
 * El StockController (Épica 4) SOLO expone endpoints POST:
 *   POST /api/stock/movimiento   → CRUD-06
 *   POST /api/stock/transaccion  → CRUD-07 (alias del mismo SP)
 * No hay GET de listado; el stock se lee de MOCK_PRODUCTOS y se
 * actualiza localmente con el valor "stockNuevo" que devuelve el SP.
 *
 * ── FLUJO ────────────────────────────────────────────────────────────
 * 1. Tabla izquierda muestra todos los productos con su stock actual.
 * 2. El usuario hace clic en un producto → se selecciona.
 * 3. Panel derecho muestra el formulario: tipo ENTRADA/SALIDA/AJUSTE,
 *    cantidad, precio, referencia, notas, cliente/proveedor opcionales.
 * 4. POST /api/stock/movimiento → SP ACID responde con:
 *      { resultado: "OK: 42 → 41", stockNuevo: 41 }
 *    o lanza 409 Conflict con "ERROR: stock insuficiente".
 * 5. Si OK: stockActual del producto se actualiza en estado local.
 *
 * ── ROLES PERMITIDOS ────────────────────────────────────────────────
 * CAJERO · GESTOR_INVENTARIO · ADMIN  (definido en @PreAuthorize del backend)
 */

import { useState, useMemo, useCallback } from 'react';
import api from '../services/api';
import type { Producto, TipoMovimiento, TipoProducto } from '../types/models';
import { MOCK_PRODUCTOS } from '../mocks/mockProductos';

// ── Helpers de estado de stock ─────────────────────────────────────────

type StockEstado = 'OK' | 'BAJO' | 'CRITICO';

/**
 * Los productos RETRO siempre tienen stock = 1 por diseño (son piezas únicas).
 * No se consideran críticos aunque stock === stockMinimo — se tratan como OK.
 * Esto alinea con la lógica de AlmacenPage (criticos excluye RETRO).
 */
function getEstado(p: Producto): StockEstado {
    if (p.tipoProducto === 'RETRO')              return 'OK';
    if (p.stockActual <= p.stockMinimo)          return 'CRITICO';
    if (p.stockActual <= p.stockMinimo * 2)      return 'BAJO';
    return 'OK';
}

const ESTADO_COLOR: Record<StockEstado, string> = {
    OK:      'var(--accent-primary)',
    BAJO:    'var(--accent-gold)',
    CRITICO: 'var(--accent-danger)',
};

/**
 * Color del número de stock en la tabla:
 * · RETRO   → siempre dorado (stock=1 es normal, no es alerta)
 * · ESTÁNDAR → rojo/amarillo/verde según nivel
 */
function getStockColor(p: Producto): string {
    if (p.tipoProducto === 'RETRO') return 'var(--accent-gold)';
    return ESTADO_COLOR[getEstado(p)];
}

/**
 * Badge del estado:
 * · RETRO   → "★ RETRO" en dorado (pieza única, sin semáforo de stock)
 * · ESTÁNDAR → ● OK / ⚠ BAJO / ⛔ CRÍTICO con su color habitual
 */
function getEstadoBadge(p: Producto): { text: string; color: string } {
    if (p.tipoProducto === 'RETRO') {
        return { text: '★ RETRO', color: 'var(--accent-gold)' };
    }
    const e = getEstado(p);
    return {
        text:  e === 'OK' ? '● OK' : e === 'BAJO' ? '⚠ BAJO' : '⛔ CRÍTICO',
        color: ESTADO_COLOR[e],
    };
}

const TIPO_COLOR: Record<TipoMovimiento, string> = {
    ENTRADA: 'var(--accent-primary)',
    SALIDA:  'var(--accent-danger)',
    AJUSTE:  'var(--accent-gold)',
};

// ── Tipos del formulario ───────────────────────────────────────────────

interface MovimientoForm {
    tipoMovimiento: TipoMovimiento;
    cantidad:       string;
    precioUnitario: string;
    idCliente:      string;
    idProveedor:    string;
    referencia:     string;
    notas:          string;
}

const EMPTY_FORM: MovimientoForm = {
    tipoMovimiento: 'ENTRADA',
    cantidad:       '',
    precioUnitario: '',
    idCliente:      '',
    idProveedor:    '',
    referencia:     '',
    notas:          '',
};

interface OpResult {
    ok:         boolean;
    mensaje:    string;
    stockNuevo?: number;
}

// ── Estilos reutilizables (fuera del componente para no recrearlos) ────

const labelStyle: React.CSSProperties = {
    fontFamily:    'var(--font-display)',
    fontSize:      '12px',
    fontWeight:    700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    color:         'var(--text-muted)',
    display:       'block',
    marginBottom:  '5px',
};

const inputStyle: React.CSSProperties = {
    width:         '100%',
    fontFamily:    'var(--font-mono)',
    fontSize:      '13px',
    color:         'var(--text-primary)',
    background:    'var(--bg-surface)',
    border:        '1px solid var(--border-default)',
    borderRadius:  '6px',
    padding:       '9px 12px',
    outline:       'none',
    caretColor:    'var(--accent-cyan)',
    transition:    'border-color 160ms ease, box-shadow 160ms ease',
    boxSizing:     'border-box',
};

// Focus/blur handlers reutilizables
const onFocusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(0,212,255,0.10)';
};
const onBlurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-default)';
    e.currentTarget.style.boxShadow   = 'none';
};

// ═══════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════

export function StockPage(): JSX.Element {
    // Estado de la lista — se actualiza con stockNuevo tras cada operación OK
    const [productos, setProductos]       = useState<Producto[]>(MOCK_PRODUCTOS);
    const [selected,  setSelected]        = useState<Producto | null>(null);
    const [form,      setForm]            = useState<MovimientoForm>(EMPTY_FORM);
    const [isSaving,  setIsSaving]        = useState(false);
    const [result,    setResult]          = useState<OpResult | null>(null);
    const [filterTipo,    setFilterTipo]    = useState<TipoProducto | 'TODOS'>('TODOS');
    const [filterEstado,  setFilterEstado]  = useState<StockEstado | 'TODOS'>('TODOS');

    // ── Filtrado de la tabla ───────────────────────────────────────────
    const filtered = useMemo(() => productos.filter(p => {
        const okTipo   = filterTipo   === 'TODOS' || p.tipoProducto === filterTipo;
        const okEstado = filterEstado === 'TODOS' || getEstado(p)   === filterEstado;
        return okTipo && okEstado;
    }), [productos, filterTipo, filterEstado]);

    // ── Selección de producto ──────────────────────────────────────────
    const handleSelect = useCallback((p: Producto) => {
        setSelected(p);
        setResult(null);
        setForm(prev => ({ ...prev, cantidad: '', precioUnitario: '', referencia: '', idCliente: '', idProveedor: '', notas: '' }));
    }, []);

    // ── Cambio de campo ────────────────────────────────────────────────
    function setField<K extends keyof MovimientoForm>(key: K, val: MovimientoForm[K]): void {
        setForm(prev => ({ ...prev, [key]: val }));
        setResult(null);
    }

    // ── Envío del formulario → POST /api/stock/movimiento ─────────────
    const handleSubmit = useCallback(async () => {
        if (!selected) return;

        const cantidadNum = parseInt(form.cantidad, 10);
        if (!cantidadNum || cantidadNum < 1) {
            setResult({ ok: false, mensaje: 'La cantidad debe ser un número entero positivo.' });
            return;
        }

        setIsSaving(true);
        setResult(null);

        // Construir el body según el DTO StockMovimientoRequest del backend
        const body: Record<string, unknown> = {
            idProducto:     selected.id,
            tipoMovimiento: form.tipoMovimiento,
            cantidad:       cantidadNum,
        };

        const precio = parseFloat(form.precioUnitario);
        if (!isNaN(precio) && precio > 0)              body.precioUnitario = precio;
        if (form.referencia.trim())                    body.referencia     = form.referencia.trim();
        if (form.notas.trim())                         body.notas          = form.notas.trim();
        if (form.tipoMovimiento === 'SALIDA'  && form.idCliente.trim())
            body.idCliente   = parseInt(form.idCliente,   10);
        if (form.tipoMovimiento === 'ENTRADA' && form.idProveedor.trim())
            body.idProveedor = parseInt(form.idProveedor, 10);

        try {
            const { data } = await api.post<{ resultado: string; stockNuevo: number }>(
                '/stock/movimiento',
                body
            );

            // El SP devuelve "OK: 42 → 41" o similar
            console.log('[NEXUS:Stock] SP resultado:', data.resultado, '| stockNuevo:', data.stockNuevo);

            // Actualizar el stockActual en la lista local con el valor ACID del SP
            setProductos(prev =>
                prev.map(p => p.id === selected.id ? { ...p, stockActual: data.stockNuevo } : p)
            );
            // Actualizar también el producto seleccionado para reflejar el nuevo stock en el panel
            setSelected(prev =>
                prev?.id === selected.id ? { ...prev, stockActual: data.stockNuevo } : prev
            );

            setResult({ ok: true, mensaje: data.resultado, stockNuevo: data.stockNuevo });
            setForm(EMPTY_FORM);

        } catch (err: unknown) {
            // Extraer mensaje del servidor y loguear para diagnóstico
            let msg = 'Error de red o servidor no disponible.';

            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as {
                    response?: { status?: number; data?: { message?: string } };
                };
                const status    = axiosErr.response?.status;
                const serverMsg = axiosErr.response?.data?.message ?? '';

                console.error('[NEXUS:Stock] Error API — status:', status, '| mensaje:', serverMsg);

                if (status === 409) {
                    // El SP ejecutó correctamente pero devolvió "ERROR:..." (ej: stock insuficiente)
                    msg = `Operación rechazada por el SP: ${serverMsg || 'stock insuficiente'}`;
                } else if (status === 403) {
                    msg = 'Sin permiso. Roles requeridos: CAJERO · GESTOR_INVENTARIO · ADMIN';
                } else if (status === 401) {
                    msg = 'Sesión expirada. Redirigiendo al login…';
                } else {
                    msg = `Error ${status ?? 'desconocido'}${serverMsg ? ': ' + serverMsg : ''}`;
                }
            } else {
                console.error('[NEXUS:Stock] Error desconocido (posible problema de red):', err);
            }

            setResult({ ok: false, mensaje: msg });
        } finally {
            setIsSaving(false);
        }
    }, [selected, form]);

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div style={{
            display:             'grid',
            gridTemplateColumns: '62% 38%',
            gap:                 '16px',
            height:              'calc(100dvh - 104px)',
            minHeight:           0,
        }}>

            {/* ══ COLUMNA IZQUIERDA — Lista de productos con stock ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>

                {/* Cabecera */}
                <div style={{ flexShrink: 0 }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,2vw,22px)',
                        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: 'var(--text-primary)', margin: 0,
                    }}>
                        Control de Stock
                    </h1>
                    <p style={{
                        fontFamily: 'var(--font-mono)', fontSize: '11px',
                        color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.04em',
                    }}>
                        Transacciones ACID via Stored Procedure · Selecciona un producto para operar
                    </p>
                </div>

                {/* Filtros */}
                <div style={{ flexShrink: 0, display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(['TODOS', 'ESTANDAR', 'RETRO'] as const).map(t => (
                        <button key={t} onClick={() => setFilterTipo(t)} style={{
                            fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px',
                            background:  filterTipo === t ? 'var(--accent-primary)' : 'transparent',
                            color:       filterTipo === t ? 'var(--text-inverse)'   : 'var(--text-muted)',
                            border:      `1px solid ${filterTipo === t ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                            borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease',
                        }}>{t}</button>
                    ))}

                    <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />

                    {(['TODOS', 'CRITICO', 'BAJO', 'OK'] as const).map(e => {
                        const color = e !== 'TODOS' ? ESTADO_COLOR[e] : 'var(--accent-cyan)';
                        const active = filterEstado === e;
                        return (
                            <button key={e} onClick={() => setFilterEstado(e)} style={{
                                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px',
                                background:   active ? color : 'transparent',
                                color:        active ? 'var(--text-inverse)' : color,
                                border:       `1px solid ${active ? color : 'var(--border-default)'}`,
                                borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease',
                            }}>{e}</button>
                        );
                    })}

                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
                        {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Tabla con overflow scroll */}
                <div style={{
                    flex: 1, minHeight: 0, overflowY: 'auto',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px', overflow: 'hidden',
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                                {['SKU', 'Producto', 'Tipo', 'Stock', 'Mín.', 'Estado'].map(h => (
                                    <th key={h} style={{
                                        padding: '10px 12px', textAlign: 'left',
                                        fontFamily: 'var(--font-display)', fontSize: '10px',
                                        fontWeight: 700, letterSpacing: '0.12em',
                                        textTransform: 'uppercase', color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const estado     = getEstado(p);
                                const isSelected = selected?.id === p.id;
                                return (
                                    <tr
                                        key={p.id}
                                        onClick={() => handleSelect(p)}
                                        style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                            background:   isSelected
                                                ? 'rgba(0,212,255,0.08)'
                                                : 'transparent',
                                            cursor:       'pointer',
                                            transition:   'background 120ms ease',
                                            outline:      isSelected ? '2px solid rgba(0,212,255,0.30)' : 'none',
                                            outlineOffset: '-2px',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected)
                                                (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-overlay)';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected)
                                                (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                                        }}
                                    >
                                        {/* SKU */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
                                                {p.sku}
                                            </span>
                                        </td>
                                        {/* Nombre */}
                                        <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.nombre}
                                            </div>
                                        </td>
                                        {/* Tipo */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em',
                                                color:   p.tipoProducto === 'RETRO' ? 'var(--accent-gold)'    : 'var(--text-secondary)',
                                                border: `1px solid ${p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                                                borderRadius: '3px', padding: '2px 6px',
                                            }}>
                                                {p.tipoProducto}
                                            </span>
                                        </td>
                                        {/* Stock actual */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   '13px',
                                                fontWeight: 700,
                                                color:      getStockColor(p),
                                                letterSpacing: '-0.01em',
                                            }}>
                                                {p.stockActual}
                                            </span>
                                        </td>
                                        {/* Stock mínimo */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {p.stockMinimo}
                                            </span>
                                        </td>
                                        {/* Estado badge */}
                                        <td style={{ padding: '10px 12px' }}>
                                            {(() => {
                                                const badge = getEstadoBadge(p);
                                                return (
                                                    <span style={{
                                                        fontFamily:    'var(--font-mono)',
                                                        fontSize:      '10px',
                                                        fontWeight:    700,
                                                        letterSpacing: '0.06em',
                                                        color:         badge.color,
                                                        background:    `${badge.color}18`,
                                                        border:        `1px solid ${badge.color}`,
                                                        borderRadius:  '3px',
                                                        padding:       '2px 8px',
                                                        whiteSpace:    'nowrap',
                                                    }}>
                                                        {badge.text}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══ COLUMNA DERECHA — Panel de registro de movimiento ══ */}
            <div style={{
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px', overflow: 'hidden',
                height: '100%', minHeight: 0,
            }}>

                {/* Cabecera del panel */}
                <div style={{
                    padding: '14px 18px',
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink: 0,
                }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                        ◈ REGISTRAR MOVIMIENTO
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: selected ? 'var(--text-primary)' : 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        {selected ? selected.sku : '— Selecciona un producto —'}
                    </div>
                    {selected && (
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {selected.nombre}
                        </div>
                    )}
                </div>

                {/* Cuerpo scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', paddingBottom: '104px' }}>
                    {!selected ? (

                        // ── Estado vacío ───────────────────────────────────
                        <div style={{
                            height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '12px', textAlign: 'center', padding: '32px 16px',
                        }}>
                            <div style={{ fontSize: '40px', opacity: 0.12 }}>◈</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Selecciona un producto de la tabla para registrar una entrada, salida o ajuste
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--border-default)', letterSpacing: '0.06em' }}>
                                Las transacciones son ACID via Stored Procedure
                            </div>
                        </div>

                    ) : (

                        // ── Formulario ─────────────────────────────────────
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Stock actual del producto seleccionado */}
                            <div style={{
                                display: 'flex', gap: '0', overflow: 'hidden',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                            }}>
                                {[
                                    { label: 'STOCK ACTUAL', value: String(selected.stockActual),         color: getStockColor(selected) },
                                    { label: 'MÍNIMO',       value: String(selected.stockMinimo),         color: 'var(--text-secondary)' },
                                    { label: 'ESTADO',       value: getEstadoBadge(selected).text.replace(/^[^\s]+\s/, ''), color: getEstadoBadge(selected).color },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        flex: 1, padding: '10px 12px', textAlign: 'center',
                                        borderRight: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                                    }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>
                                            {item.label}
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: i === 2 ? '13px' : '22px', fontWeight: 700, color: item.color, lineHeight: 1 }}>
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Selector de tipo de movimiento */}
                            <div>
                                <label style={labelStyle}>Tipo de Movimiento</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {(['ENTRADA', 'SALIDA', 'AJUSTE'] as TipoMovimiento[]).map(t => {
                                        const active = form.tipoMovimiento === t;
                                        return (
                                            <button key={t} onClick={() => setField('tipoMovimiento', t)} style={{
                                                flex: 1, fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                                                letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 4px',
                                                background:   active ? TIPO_COLOR[t] : 'transparent',
                                                color:        active ? 'var(--text-inverse)' : TIPO_COLOR[t],
                                                border:       `1px solid ${TIPO_COLOR[t]}`,
                                                borderRadius: '6px', cursor: 'pointer', transition: 'all 140ms ease',
                                            }}>{t}</button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Cantidad (obligatorio) */}
                            <div>
                                <label style={labelStyle}>Cantidad *</label>
                                <input
                                    type="number" min={1} placeholder="Introduce la cantidad…"
                                    value={form.cantidad}
                                    onChange={e => setField('cantidad', e.target.value)}
                                    style={inputStyle}
                                    onFocus={onFocusInput} onBlur={onBlurInput}
                                />
                            </div>

                            {/* Precio unitario — visible para ENTRADA y SALIDA */}
                            {form.tipoMovimiento !== 'AJUSTE' && (
                                <div>
                                    <label style={labelStyle}>Precio unitario (€) <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <input
                                        type="number" min={0} step="0.01" placeholder="0.00"
                                        value={form.precioUnitario}
                                        onChange={e => setField('precioUnitario', e.target.value)}
                                        style={inputStyle}
                                        onFocus={onFocusInput} onBlur={onBlurInput}
                                    />
                                </div>
                            )}

                            {/* ID Proveedor — solo para ENTRADA */}
                            {form.tipoMovimiento === 'ENTRADA' && (
                                <div>
                                    <label style={labelStyle}>ID Proveedor <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <input
                                        type="number" min={1} placeholder="ID numérico del proveedor"
                                        value={form.idProveedor}
                                        onChange={e => setField('idProveedor', e.target.value)}
                                        style={inputStyle}
                                        onFocus={onFocusInput} onBlur={onBlurInput}
                                    />
                                </div>
                            )}

                            {/* ID Cliente — solo para SALIDA */}
                            {form.tipoMovimiento === 'SALIDA' && (
                                <div>
                                    <label style={labelStyle}>ID Cliente <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <input
                                        type="number" min={1} placeholder="ID numérico del cliente"
                                        value={form.idCliente}
                                        onChange={e => setField('idCliente', e.target.value)}
                                        style={inputStyle}
                                        onFocus={onFocusInput} onBlur={onBlurInput}
                                    />
                                </div>
                            )}

                            {/* Referencia */}
                            <div>
                                <label style={labelStyle}>Referencia <span style={{ fontWeight: 400, opacity: 0.55 }}>— albarán, factura…</span></label>
                                <input
                                    type="text" placeholder="ej. ALB-2026-0042"
                                    value={form.referencia}
                                    onChange={e => setField('referencia', e.target.value)}
                                    style={inputStyle}
                                    onFocus={onFocusInput} onBlur={onBlurInput}
                                />
                            </div>

                            {/* Notas */}
                            <div>
                                <label style={labelStyle}>Notas <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                <textarea
                                    placeholder="Información adicional del movimiento…"
                                    rows={2}
                                    value={form.notas}
                                    onChange={e => setField('notas', e.target.value)}
                                    style={{ ...inputStyle, resize: 'vertical', minHeight: '52px' }}
                                    onFocus={onFocusInput} onBlur={onBlurInput}
                                />
                            </div>

                            {/* Resultado de la última operación */}
                            {result && (
                                <div style={{
                                    padding:      '10px 14px',
                                    background:   result.ok ? 'var(--accent-primary-glow)' : 'var(--accent-danger-glow)',
                                    border:       `1px solid ${result.ok ? 'var(--accent-primary)' : 'var(--accent-danger)'}`,
                                    borderRadius: '6px',
                                    fontFamily:   'var(--font-mono)', fontSize: '11px',
                                    color:        result.ok ? 'var(--accent-primary)' : 'var(--accent-danger)',
                                    letterSpacing: '0.02em', lineHeight: 1.5,
                                    wordBreak: 'break-word',
                                }}>
                                    {result.ok ? '✓ ' : '✕ '}{result.mensaje}
                                    {result.stockNuevo !== undefined && (
                                        <span style={{ display: 'block', marginTop: '3px', opacity: 0.75, fontSize: '10px' }}>
                                            Stock nuevo: <strong>{result.stockNuevo}</strong>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Botón de envío */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="btn btn-primary"
                                style={{
                                    width: '100%', fontSize: '12px', letterSpacing: '0.12em',
                                    opacity:  isSaving ? 0.6 : 1,
                                    cursor:   isSaving ? 'not-allowed' : 'pointer',
                                    marginTop: '4px',
                                }}
                            >
                                {isSaving ? 'PROCESANDO…' : `REGISTRAR ${form.tipoMovimiento}`}
                            </button>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
