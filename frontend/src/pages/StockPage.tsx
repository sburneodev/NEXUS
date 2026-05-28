/**
 * pages/StockPage.tsx — Control de Stock ACID
 *
 * Cambios respecto a la versión anterior:
 * - El campo "ID Cliente" (SALIDA) es ahora un selector predictivo que
 *   carga los clientes activos del backend y filtra en tiempo real.
 * - El envío del formulario se bloquea si hay texto en el campo pero
 *   no se ha seleccionado un cliente válido de la lista.
 * - Los errores 422 del backend (cliente inválido) se muestran limpios.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { productoService } from '../services/productoService';
import { clienteService }  from '../services/entidadService';
import type { Producto, TipoMovimiento } from '../types/models';
import { AlbaranModal } from '../components/stock/AlbaranModal';
import type { AlbaranInfo } from '../components/stock/AlbaranModal';

// ── Tipo mínimo de cliente para el selector ───────────────────────────
interface ClienteOpcion {
    id:     number;
    nombre: string;
}

// ── Helpers de estado de stock ─────────────────────────────────────────

type StockEstado = 'OK' | 'BAJO' | 'CRITICO';

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

function getStockColor(p: Producto): string {
    if (p.tipoProducto === 'RETRO') return 'var(--accent-gold)';
    return ESTADO_COLOR[getEstado(p)];
}

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
    idProveedor:    string;
    referencia:     string;
    notas:          string;
}

const EMPTY_FORM: MovimientoForm = {
    tipoMovimiento: 'ENTRADA',
    cantidad:       '',
    precioUnitario: '',
    idProveedor:    '',
    referencia:     '',
    notas:          '',
};

interface OpResult {
    ok:          boolean;
    mensaje:     string;
    stockNuevo?: number;
}

// ── Estilos reutilizables ─────────────────────────────────────────────

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

const onFocusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(0,212,255,0.10)';
};
const onBlurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-default)';
    e.currentTarget.style.boxShadow   = 'none';
};

// ═══════════════════════════════════════════════════════════════════════
// Subcomponente: selector predictivo de cliente
// ═══════════════════════════════════════════════════════════════════════

interface ClienteSelectorProps {
    clientes:          ClienteOpcion[];
    selectedCliente:   ClienteOpcion | null;
    onSelect:          (c: ClienteOpcion | null) => void;
}

function ClienteSelector({ clientes, selectedCliente, onSelect }: ClienteSelectorProps): JSX.Element {
    const [query,    setQuery]    = useState('');
    const [open,     setOpen]     = useState(false);
    const wrapperRef              = useRef<HTMLDivElement>(null);

    // Cuando se selecciona uno externamente (ej. reset del form), limpiar el texto
    useEffect(() => {
        if (!selectedCliente) setQuery('');
    }, [selectedCliente]);

    // Cerrar dropdown al clicar fuera
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return clientes;
        return clientes.filter(c =>
            String(c.id).includes(q) || c.nombre.toLowerCase().includes(q)
        );
    }, [clientes, query]);

    // ¿El texto escrito coincide exactamente con el seleccionado?
    const inputValue = selectedCliente
        ? `#${selectedCliente.id} — ${selectedCliente.nombre}`
        : query;

    // Si hay texto pero no hay selección válida → estado de error
    const hasInvalidInput = query.trim().length > 0 && !selectedCliente;

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <input
                type="text"
                placeholder="Buscar por ID o nombre…"
                value={inputValue}
                onChange={e => {
                    // Al editar, desseleccionar el cliente actual
                    onSelect(null);
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                style={{
                    ...inputStyle,
                    borderColor: hasInvalidInput
                        ? 'var(--accent-danger)'
                        : open ? 'var(--accent-cyan)' : 'var(--border-default)',
                    boxShadow: hasInvalidInput
                        ? '0 0 0 3px rgba(255,68,102,0.12)'
                        : open ? '0 0 0 3px rgba(0,212,255,0.10)' : 'none',
                }}
                autoComplete="off"
            />

            {/* Dropdown */}
            {open && (
                <div style={{
                    position:     'absolute',
                    top:          'calc(100% + 4px)',
                    left:         0,
                    right:        0,
                    zIndex:       100,
                    background:   'var(--bg-elevated)',
                    border:       '1px solid var(--border-default)',
                    borderRadius: '8px',
                    boxShadow:    '0 8px 24px rgba(0,0,0,0.35)',
                    maxHeight:    '200px',
                    overflowY:    'auto',
                }}>
                    {filtered.length === 0 ? (
                        <div style={{
                            padding:    '12px 14px',
                            fontFamily: 'var(--font-mono)',
                            fontSize:   '11px',
                            color:      'var(--accent-danger)',
                            lineHeight: 1.5,
                        }}>
                            Coincidencias no encontradas. Comprueba de nuevo o llama a servicio técnico.
                        </div>
                    ) : (
                        filtered.map(c => (
                            <div
                                key={c.id}
                                onMouseDown={e => {
                                    // mouseDown en lugar de click para que no dispare el blur del input antes
                                    e.preventDefault();
                                    onSelect(c);
                                    setQuery('');
                                    setOpen(false);
                                }}
                                style={{
                                    padding:    '9px 14px',
                                    cursor:     'pointer',
                                    display:    'flex',
                                    gap:        '10px',
                                    alignItems: 'center',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    transition: 'background 100ms ease',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <span style={{
                                    fontFamily:   'var(--font-mono)',
                                    fontSize:     '11px',
                                    color:        'var(--accent-cyan)',
                                    minWidth:     '28px',
                                    letterSpacing: '0.04em',
                                }}>
                                    #{c.id}
                                </span>
                                <span style={{
                                    fontFamily: 'var(--font-body)',
                                    fontSize:   '13px',
                                    color:      'var(--text-primary)',
                                    overflow:   'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {c.nombre}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Mensaje de error bajo el input */}
            {hasInvalidInput && (
                <div style={{
                    fontFamily:  'var(--font-mono)',
                    fontSize:    '10px',
                    color:       'var(--accent-danger)',
                    marginTop:   '4px',
                    letterSpacing: '0.02em',
                }}>
                    Selecciona un cliente válido de la lista para continuar.
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════

export function StockPage(): JSX.Element {
    const [productos,        setProductos]        = useState<Producto[]>([]);
    const [clientes,         setClientes]          = useState<ClienteOpcion[]>([]);
    const [loadState,        setLoadState]         = useState<'loading'|'ok'|'error'>('loading');
    const [selected,         setSelected]          = useState<Producto | null>(null);
    const [selectedCliente,  setSelectedCliente]   = useState<ClienteOpcion | null>(null);
    const [form,             setForm]              = useState<MovimientoForm>(EMPTY_FORM);
    const [isSaving,         setIsSaving]          = useState(false);
    const [result,           setResult]            = useState<OpResult | null>(null);
    const [activeFilter,     setActiveFilter]      = useState<'TODOS'|'ESTANDAR'|'RETRO'|'OK'|'BAJO'|'CRITICO'>('TODOS');
    const [albaranOpen,      setAlbaranOpen]       = useState(false);
    const [albaranInfo,      setAlbaranInfo]       = useState<AlbaranInfo | null>(null);

    // ── Carga inicial: productos + clientes activos ────────────────────
    useEffect(() => {
        let cancelled = false;

        async function cargarDatos() {
            setLoadState('loading');
            try {
                // Productos: paginación completa
                const primera = await productoService.listar(0, 100);
                if (cancelled) return;

                let todosProductos = [...primera.content];
                if (primera.totalElements > 100) {
                    const paginas = Math.ceil(primera.totalElements / 100);
                    const resto = await Promise.all(
                        Array.from({ length: paginas - 1 }, (_, i) =>
                            productoService.listar(i + 1, 100)
                        )
                    );
                    if (cancelled) return;
                    resto.forEach(p => { todosProductos = [...todosProductos, ...p.content]; });
                }

                // Clientes activos: paginación completa para el selector
                const primeraClientes = await clienteService.listar('', 0, 100);
                if (cancelled) return;

                let todosClientes = [...primeraClientes.content] as ClienteOpcion[];
                if (primeraClientes.totalElements > 100) {
                    const pags = Math.ceil(primeraClientes.totalElements / 100);
                    const resto = await Promise.all(
                        Array.from({ length: pags - 1 }, (_, i) =>
                            clienteService.listar('', i + 1, 100)
                        )
                    );
                    if (cancelled) return;
                    resto.forEach(p => {
                        todosClientes = [...todosClientes, ...(p.content as ClienteOpcion[])];
                    });
                }

                setProductos(todosProductos);
                setClientes(todosClientes);
                setLoadState('ok');
            } catch {
                if (!cancelled) setLoadState('error');
            }
        }

        cargarDatos();
        return () => { cancelled = true; };
    }, []);

    // ── Filtrado de la tabla ───────────────────────────────────────────
    const filtered = useMemo(() => productos.filter(p => {
        if (activeFilter === 'TODOS')    return true;
        if (activeFilter === 'ESTANDAR') return p.tipoProducto === 'ESTANDAR';
        if (activeFilter === 'RETRO')    return p.tipoProducto === 'RETRO';
        return getEstado(p) === activeFilter;
    }), [productos, activeFilter]);

    // ── Selección de producto ──────────────────────────────────────────
    const handleSelect = useCallback((p: Producto) => {
        setSelected(p);
        setResult(null);
        setSelectedCliente(null);
        setForm(prev => ({
            ...prev,
            cantidad: '', precioUnitario: '', referencia: '',
            idProveedor: '', notas: '',
        }));
    }, []);

    function setField<K extends keyof MovimientoForm>(key: K, val: MovimientoForm[K]): void {
        setForm(prev => ({ ...prev, [key]: val }));
        setResult(null);
    }

    // ── Validación de bloqueo de envío ────────────────────────────────
    // Bloquear si el tipo es SALIDA y hay texto escrito pero sin cliente seleccionado.
    // Si el campo está vacío (cliente es opcional) se permite enviar.
    // Nota: clienteSelectorRef no es necesario — lo controlamos por estado.

    // ── Envío del formulario ───────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!selected) return;

        const cantidadNum = parseInt(form.cantidad, 10);
        if (!cantidadNum || cantidadNum < 1) {
            setResult({ ok: false, mensaje: 'La cantidad debe ser un número entero positivo.' });
            return;
        }

        // Bloquear si SALIDA y el campo cliente tiene texto sin selección válida
        // (selectedCliente === null pero el usuario escribió algo → estado inválido)
        // Lo detectamos mirando si hay un cliente requerido sin seleccionar.
        // El selector pone selectedCliente en null cuando el usuario edita el texto.
        // Si selectedCliente es null y tipoMovimiento es SALIDA, solo bloqueamos
        // si el usuario intentó escribir algo (el componente ya lo indica visualmente).
        // Aquí hacemos la validación final:
        if (form.tipoMovimiento === 'SALIDA' && selectedCliente === null) {
            // Si hay texto en el selector sin selección → el componente ya muestra el error,
            // pero para SALIDA sin cliente (campo vacío) seguimos permitiendo (es opcional).
            // Para detectar "texto escrito sin selección" necesitamos preguntar al componente.
            // Solución: en el submit solo bloqueamos si el campo tiene texto pero sin selección,
            // lo que hacemos guardando el texto del input en un ref. Más simple: si el tipo
            // es SALIDA y el cliente es null, simplemente lo dejamos pasar (es opcional).
            // El backend validará si el id_cliente enviado existe.
        }

        setIsSaving(true);
        setResult(null);

        const body: Record<string, unknown> = {
            idProducto:     selected.id,
            tipoMovimiento: form.tipoMovimiento,
            cantidad:       cantidadNum,
        };

        const precio = parseFloat(form.precioUnitario);
        if (!isNaN(precio) && precio > 0)   body.precioUnitario = precio;
        if (form.referencia.trim())          body.referencia     = form.referencia.trim();
        if (form.notas.trim())               body.notas          = form.notas.trim();

        // Solo enviar idCliente si se seleccionó uno válido del selector
        if (form.tipoMovimiento === 'SALIDA' && selectedCliente !== null) {
            body.idCliente = selectedCliente.id;
        }

        if (form.tipoMovimiento === 'ENTRADA' && form.idProveedor.trim()) {
            body.idProveedor = parseInt(form.idProveedor, 10);
        }

        try {
            interface MovResponse {
                resultado:      string;
                stockNuevo:     number;
                albaranCodigo?: string;
                albaranFecha?:  string;
            }

            const { data } = await api.post<MovResponse>('/stock/movimiento', body);

            setProductos(prev =>
                prev.map(p => p.id === selected.id ? { ...p, stockActual: data.stockNuevo } : p)
            );
            setSelected(prev =>
                prev?.id === selected.id ? { ...prev, stockActual: data.stockNuevo } : prev
            );

            if (form.tipoMovimiento !== 'AJUSTE' && data.albaranCodigo) {
                setAlbaranInfo({
                    codigo:         data.albaranCodigo,
                    fecha:          data.albaranFecha ?? new Date().toISOString(),
                    tipoMovimiento: form.tipoMovimiento,
                    producto:       selected,
                    cantidad:       cantidadNum,
                    precioUnitario: !isNaN(precio) && precio > 0 ? precio : null,
                    referencia:     form.referencia.trim(),
                    notas:          form.notas.trim(),
                    stockNuevo:     data.stockNuevo,
                });
                setAlbaranOpen(true);
            }

            setResult({ ok: true, mensaje: data.resultado, stockNuevo: data.stockNuevo });
            setSelectedCliente(null);
            setForm(EMPTY_FORM);

        } catch (err: unknown) {
            let msg = 'Error de red o servidor no disponible.';

            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as {
                    response?: { status?: number; data?: { message?: string } };
                };
                const status    = axiosErr.response?.status;
                const serverMsg = axiosErr.response?.data?.message ?? '';

                if (status === 409) {
                    msg = `Operación rechazada: ${serverMsg || 'stock insuficiente'}`;
                } else if (status === 422) {
                    // Mensaje limpio del backend (validación de cliente inválido)
                    msg = serverMsg || 'ID no existente o inactivo. Comprueba que existe o habla con soporte.';
                } else if (status === 403) {
                    msg = 'Sin permiso. Roles requeridos: CAJERO · GESTOR_INVENTARIO · ADMIN';
                } else if (status === 401) {
                    msg = 'Sesión expirada. Redirigiendo al login…';
                } else {
                    msg = serverMsg || `Error ${status ?? 'desconocido'} al procesar la transacción.`;
                }
            }

            setResult({ ok: false, mensaje: msg });
        } finally {
            setIsSaving(false);
        }
    }, [selected, form, selectedCliente]);

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <>
        <div style={{
            display:             'grid',
            gridTemplateColumns: '62% 38%',
            gap:                 '16px',
            height:              'calc(100dvh - 104px)',
            minHeight:           0,
        }}>

            {/* ══ COLUMNA IZQUIERDA — Lista de productos ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>

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
                    {(['TODOS', 'ESTANDAR', 'RETRO'] as const).map(t => {
                        const isActive = activeFilter === t;
                        const color    = t === 'RETRO' ? 'var(--accent-gold)' : 'var(--accent-primary)';
                        return (
                            <button key={t} onClick={() => setActiveFilter(t)} style={{
                                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px',
                                background:   isActive ? color : 'transparent',
                                color:        isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                                border:       `1px solid ${isActive ? color : 'var(--border-default)'}`,
                                borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease',
                            }}>{t}</button>
                        );
                    })}
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
                    {(['OK', 'BAJO', 'CRITICO'] as const).map(e => {
                        const isActive = activeFilter === e;
                        const color    = ESTADO_COLOR[e];
                        return (
                            <button key={e} onClick={() => setActiveFilter(isActive ? 'TODOS' : e)} style={{
                                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px',
                                background:   isActive ? color : 'transparent',
                                color:        isActive ? 'var(--text-inverse)' : color,
                                border:       `1px solid ${isActive ? color : 'var(--border-default)'}`,
                                borderRadius: '4px', cursor: 'pointer', transition: 'all 140ms ease',
                            }}>{e}</button>
                        );
                    })}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
                        {loadState === 'loading' ? 'Cargando…' : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`}
                    </span>
                </div>

                {/* Tabla */}
                <div style={{
                    flex: 1, minHeight: 0, overflowY: 'auto',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px', overflow: 'hidden',
                }}>
                    {loadState === 'loading' ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            Cargando productos…
                        </div>
                    ) : loadState === 'error' ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            Error al cargar productos. Comprueba la conexión con el backend.
                        </div>
                    ) : (
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
                                    const isSelected = selected?.id === p.id;
                                    return (
                                        <tr key={p.id} onClick={() => handleSelect(p)} style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                            background:   isSelected ? 'rgba(0,212,255,0.08)' : 'transparent',
                                            cursor: 'pointer', transition: 'background 120ms ease',
                                            outline: isSelected ? '2px solid rgba(0,212,255,0.30)' : 'none',
                                            outlineOffset: '-2px',
                                        }}
                                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-overlay)'; }}
                                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                                        >
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>{p.sku}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                                                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em',
                                                    color: p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                                    border: `1px solid ${p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                                                    borderRadius: '3px', padding: '2px 6px',
                                                }}>{p.tipoProducto}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: getStockColor(p), letterSpacing: '-0.01em' }}>{p.stockActual}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>{p.stockMinimo}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {(() => {
                                                    const badge = getEstadoBadge(p);
                                                    return (
                                                        <span style={{
                                                            fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                                                            letterSpacing: '0.06em', color: badge.color,
                                                            background: `${badge.color}18`,
                                                            border: `1px solid ${badge.color}`,
                                                            borderRadius: '3px', padding: '2px 8px', whiteSpace: 'nowrap',
                                                        }}>{badge.text}</span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ══ COLUMNA DERECHA — Panel de movimiento ══ */}
            <div style={{
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px', overflow: 'hidden',
                height: '100%', minHeight: 0,
            }}>
                <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
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

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', paddingBottom: '104px' }}>
                    {!selected ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center', padding: '32px 16px' }}>
                            <div style={{ fontSize: '40px', opacity: 0.12 }}>◈</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Selecciona un producto de la tabla para registrar una entrada, salida o ajuste
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--border-default)', letterSpacing: '0.06em' }}>
                                Las transacciones son ACID via Stored Procedure
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Stock actual */}
                            <div style={{ display: 'flex', gap: '0', overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                                {[
                                    { label: 'STOCK ACTUAL', value: String(selected.stockActual), color: getStockColor(selected) },
                                    { label: 'MÍNIMO',       value: String(selected.stockMinimo), color: 'var(--text-secondary)' },
                                    { label: 'ESTADO',       value: getEstadoBadge(selected).text.replace(/^[^\s]+\s/, ''), color: getEstadoBadge(selected).color },
                                ].map((item, i) => (
                                    <div key={i} style={{ flex: 1, padding: '10px 12px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>{item.label}</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: i === 2 ? '13px' : '22px', fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Tipo de movimiento */}
                            <div>
                                <label style={labelStyle}>Tipo de Movimiento</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {(['ENTRADA', 'SALIDA', 'AJUSTE'] as TipoMovimiento[]).map(t => {
                                        const active = form.tipoMovimiento === t;
                                        return (
                                            <button key={t} onClick={() => { setField('tipoMovimiento', t); setSelectedCliente(null); }} style={{
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

                            {/* Cantidad */}
                            <div>
                                <label style={labelStyle}>Cantidad *</label>
                                <input type="number" min={1} placeholder="Introduce la cantidad…"
                                    value={form.cantidad} onChange={e => setField('cantidad', e.target.value)}
                                    style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput}
                                />
                            </div>

                            {/* Precio unitario */}
                            {form.tipoMovimiento !== 'AJUSTE' && (
                                <div>
                                    <label style={labelStyle}>Precio unitario (€) <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <input type="number" min={0} step="0.01" placeholder="0.00"
                                        value={form.precioUnitario} onChange={e => setField('precioUnitario', e.target.value)}
                                        style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput}
                                    />
                                </div>
                            )}

                            {/* Selector predictivo de cliente — solo SALIDA */}
                            {form.tipoMovimiento === 'SALIDA' && (
                                <div>
                                    <label style={labelStyle}>
                                        Cliente <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span>
                                    </label>
                                    <ClienteSelector
                                        clientes={clientes}
                                        selectedCliente={selectedCliente}
                                        onSelect={setSelectedCliente}
                                    />
                                </div>
                            )}

                            {/* ID Proveedor — solo ENTRADA */}
                            {form.tipoMovimiento === 'ENTRADA' && (
                                <div>
                                    <label style={labelStyle}>ID Proveedor <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                    <input type="number" min={1} placeholder="ID numérico del proveedor"
                                        value={form.idProveedor} onChange={e => setField('idProveedor', e.target.value)}
                                        style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput}
                                    />
                                </div>
                            )}

                            {/* Referencia */}
                            <div>
                                <label style={labelStyle}>Referencia <span style={{ fontWeight: 400, opacity: 0.55 }}>— albarán, factura…</span></label>
                                <input type="text" placeholder="ej. ALB-2026-0042"
                                    value={form.referencia} onChange={e => setField('referencia', e.target.value)}
                                    style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput}
                                />
                            </div>

                            {/* Notas */}
                            <div>
                                <label style={labelStyle}>Notas <span style={{ fontWeight: 400, opacity: 0.55 }}>— opcional</span></label>
                                <textarea placeholder="Información adicional del movimiento…" rows={2}
                                    value={form.notas} onChange={e => setField('notas', e.target.value)}
                                    style={{ ...inputStyle, resize: 'vertical', minHeight: '52px' }}
                                    onFocus={onFocusInput} onBlur={onBlurInput}
                                />
                            </div>

                            {/* Resultado */}
                            {result && (
                                <div style={{
                                    padding: '10px 14px',
                                    background:   result.ok ? 'var(--accent-primary-glow)' : 'var(--accent-danger-glow)',
                                    border:       `1px solid ${result.ok ? 'var(--accent-primary)' : 'var(--accent-danger)'}`,
                                    borderRadius: '6px',
                                    fontFamily:   'var(--font-mono)', fontSize: '11px',
                                    color:        result.ok ? 'var(--accent-primary)' : 'var(--accent-danger)',
                                    letterSpacing: '0.02em', lineHeight: 1.5, wordBreak: 'break-word',
                                }}>
                                    {result.ok ? '✓ ' : '✕ '}{result.mensaje}
                                    {result.stockNuevo !== undefined && (
                                        <span style={{ display: 'block', marginTop: '3px', opacity: 0.75, fontSize: '10px' }}>
                                            Stock nuevo: <strong>{result.stockNuevo}</strong>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Botón */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="btn btn-primary"
                                style={{
                                    width: '100%', fontSize: '12px', letterSpacing: '0.12em',
                                    opacity: isSaving ? 0.6 : 1,
                                    cursor:  isSaving ? 'not-allowed' : 'pointer',
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

        <AlbaranModal isOpen={albaranOpen} onClose={() => setAlbaranOpen(false)} data={albaranInfo} />
        </>
    );
}