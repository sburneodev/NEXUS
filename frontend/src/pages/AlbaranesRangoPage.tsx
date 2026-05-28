/**
 * pages/AlbaranesRangoPage.tsx
 *
 * Genera un ÚNICO albarán consolidado con todos los movimientos
 * del rango temporal y tipo seleccionados.
 *
 * Roles: ADMIN · GESTOR_INVENTARIO · CONTABLE
 */

import { useState }           from 'react';
import { createPortal }       from 'react-dom';
import api                    from '../services/api';
import { AlbaranTemplate }    from '../components/albaran/AlbaranTemplate';
import type { AlbaranData }   from '../components/albaran/AlbaranTemplate';
import { AlbaranModal }       from '../components/stock/AlbaranModal';
import type { AlbaranInfo }   from '../components/stock/AlbaranModal';

// ── Empresa emisora ───────────────────────────────────────────────────
const EMPRESA_NEXUS = {
    markUrl:   '/nexus-mark.svg',
    brandName: 'NEXUS',
    tagline:   'ERP · LEVELUP',
    nombre:    'NEXUS Distribución S.L.',
    nif:       'B-12345678',
    direccion: 'C/ Tecnología 14, Nave 3 — 28001 Madrid',
    telefono:  '+34 91 000 00 00',
    email:     'operaciones@nexus-erp.com',
};

// ── Tipos ─────────────────────────────────────────────────────────────
type TipoFiltro = 'TODOS' | 'ENTRADA' | 'SALIDA';

interface AlbaranItem {
    idTransaccion:       number;
    numero:              string;
    tipo:                'ENTRADA' | 'SALIDA';
    fecha:               string;
    productoSku:         string;
    productoNombre:      string;
    productoDescripcion: string;
    productoTipo:        string;
    entidadNombre:       string;
    entidadNif:          string | null;
    entidadDireccion:    string | null;
    entidadTelefono:     string | null;
    entidadEmail:        string | null;
    cantidad:            number;
    stockAntes:          number;
    stockDespues:        number;
    precioUnitario:      number | null;
    referencia:          string | null;
    notas:               string | null;
}

interface RangoResponse {
    albaranes:  AlbaranItem[];
    total:      number;
    desde:      string;
    hasta:      string;
    tipoFiltro: string | null;
}

// ── CSS de impresión ──────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
    body { background: white !important; }
    html { background: white !important; }
    #root                       { display: none !important; }
    #albaran-consolidado-root   { display: block !important; }
    @page { size: A4 portrait; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
@media screen {
    #albaran-consolidado-root   { display: none !important; }
}
`;

// ── Conversión de la lista de items → un único AlbaranData ───────────
//
// Cada item se convierte en una LineaAlbaran. El número del albarán
// consolidado es único por rango: ALBC-YYYYMMDD-YYYYMMDD[-TIPO]
//
function toAlbaranConsolidado(
    items:    AlbaranItem[],
    desde:    string,
    hasta:    string,
    tipoFiltro: TipoFiltro,
): AlbaranData {

    const desdeFmt = desde.replace(/-/g, '');
    const hastaFmt = hasta.replace(/-/g, '');
    const sufTipo  = tipoFiltro !== 'TODOS' ? `-${tipoFiltro}` : '';
    const numero   = `ALBC-${desdeFmt}-${hastaFmt}${sufTipo}`;

    // Tipo del documento: ENTRADA si solo hay entradas, SALIDA si solo salidas,
    // ENTRADA como fallback para mixto (el badge se sobreescribirá en notas).
    const tipos    = new Set(items.map(i => i.tipo));
    const tipoDoc: 'ENTRADA' | 'SALIDA' = tipos.size === 1 && tipos.has('SALIDA')
        ? 'SALIDA'
        : 'ENTRADA';

    const lineas = items.map(item => {
        const precioStr = item.precioUnitario != null
            ? ` | P.Unit.: €${item.precioUnitario.toFixed(2)}`
            : '';
        const entidadStr = item.entidadNombre !== 'Sin entidad'
            ? ` | ${item.tipo === 'ENTRADA' ? 'Prov.' : 'Cliente'}: ${item.entidadNombre}`
            : '';
        const stockStr = `Stock: ${item.stockAntes}→${item.stockDespues}`;

        return {
            codigo:        item.productoSku,
            descripcion:   item.productoNombre,
            cantidad:      item.cantidad,
            unidad:        'uds.',
            observaciones: `${item.tipo}${entidadStr}${precioStr} | ${stockStr}`
                + (item.referencia ? ` | Ref: ${item.referencia}` : ''),
        };
    });

    const totalEntradas = items.filter(i => i.tipo === 'ENTRADA').reduce((a, i) => a + i.cantidad, 0);
    const totalSalidas  = items.filter(i => i.tipo === 'SALIDA') .reduce((a, i) => a + i.cantidad, 0);

    const labelTipo = tipoFiltro === 'TODOS'   ? 'Todos los movimientos'
                    : tipoFiltro === 'ENTRADA' ? 'Entradas de mercancía'
                    :                            'Salidas / Ventas';

    return {
        numero,
        tipo:             tipoDoc,
        fecha:            new Date().toISOString(),
        referenciaPedido: `Rango: ${desde} / ${hasta}`,
        almacen:          'Almacén Central — NEXUS',
        notas:
            `Albarán consolidado — ${labelTipo}\n` +
            `Período: ${desde} → ${hasta} · ${items.length} movimiento${items.length !== 1 ? 's' : ''}` +
            (tipoFiltro === 'TODOS'
                ? ` (${items.filter(i => i.tipo === 'ENTRADA').length} entradas · ${items.filter(i => i.tipo === 'SALIDA').length} salidas)`
                : '') +
            `\nTotal uds. entradas: ${totalEntradas} · Total uds. salidas: ${totalSalidas}`,
        empresa: EMPRESA_NEXUS,
        entidad: {
            nombre: tipoFiltro === 'ENTRADA' ? 'Varios proveedores'
                  : tipoFiltro === 'SALIDA'  ? 'Varios clientes'
                  :                            'Varios (ver columna Observaciones)',
        },
        lineas,
        textoLegal:
            `Documento generado automáticamente por NEXUS ERP. ` +
            `Período: ${desde} → ${hasta}. ` +
            `${items.length} movimiento${items.length !== 1 ? 's' : ''} incluido${items.length !== 1 ? 's' : ''}. ` +
            `Este documento no tiene valor fiscal ni comercial.`,
    };
}

// ── Estilos base ──────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.10em', textTransform: 'uppercase',
    color: 'var(--text-muted)', display: 'block', marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: '13px',
    color: 'var(--text-primary)', background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)', borderRadius: '6px',
    padding: '9px 12px', outline: 'none', caretColor: 'var(--accent-cyan)',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    boxSizing: 'border-box', width: '100%',
};

const focusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(0,212,255,0.10)';
};
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-default)';
    e.currentTarget.style.boxShadow   = 'none';
};

// ═══════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════

export function AlbaranesRangoPage(): JSX.Element {
    const today   = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [desde,       setDesde]       = useState(weekAgo);
    const [hasta,       setHasta]       = useState(today);
    const [tipoFiltro,  setTipoFiltro]  = useState<TipoFiltro>('TODOS');
    const [resultado,   setResultado]   = useState<RangoResponse | null>(null);
    const [loadState,   setLoadState]   = useState<'idle'|'loading'|'ok'|'error'>('idle');
    const [errorMsg,    setErrorMsg]    = useState('');
    const [modalOpen,   setModalOpen]   = useState(false);
    const [modalInfo,   setModalInfo]   = useState<AlbaranInfo | null>(null);

    // ── Convertir AlbaranItem → AlbaranInfo para el AlbaranModal ─────
    function abrirAlbaranModal(item: AlbaranItem) {
        // El modal necesita un objeto Producto mínimo con los campos que usa
        const producto = {
            id:                  item.idTransaccion,   // aproximación: no tenemos el id real del producto aquí
            sku:                 item.productoSku,
            nombre:              item.productoNombre,
            descripcion:         item.productoDescripcion ?? null,
            tipoProducto:        item.productoTipo as 'ESTANDAR' | 'RETRO',
            stockActual:         item.stockDespues,
            stockMinimo:         0,
            stockMaximo:         9999,
            precioCoste:         0,
            precioVenta:         item.precioUnitario ?? 0,
            estadoConservacion:  null,
            activo:              true,
            idProveedor:         null, proveedorNombre: null,
            idCategoria:         null, categoriaNombre: null,
            idUbicacion:         null,
            atributosEspecificos: null,
        };
        const info: AlbaranInfo = {
            codigo:         item.numero,
            fecha:          item.fecha,
            tipoMovimiento: item.tipo,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            producto:       producto as any,
            cantidad:       item.cantidad,
            precioUnitario: item.precioUnitario,
            referencia:     item.referencia ?? '',
            notas:          item.notas      ?? '',
            stockNuevo:     item.stockDespues,
        };
        setModalInfo(info);
        setModalOpen(true);
    }

    // ── Buscar ────────────────────────────────────────────────────────
    async function buscar() {
        if (!desde || !hasta) return;
        setLoadState('loading');
        setResultado(null);
        setErrorMsg('');

        const tipoParam = tipoFiltro !== 'TODOS' ? `&tipo=${tipoFiltro}` : '';

        try {
            const { data } = await api.get<RangoResponse>(
                `/stock/albaranes-rango?desde=${desde}&hasta=${hasta}${tipoParam}`
            );
            setResultado(data);
            setLoadState('ok');
        } catch (err: unknown) {
            let msg = 'Error al conectar con el servidor.';
            if (err && typeof err === 'object' && 'response' in err) {
                const ae = err as { response?: { status?: number; data?: { message?: string } } };
                const st = ae.response?.status;
                const sm = ae.response?.data?.message ?? '';
                if      (st === 403) msg = 'Sin permiso. Roles: ADMIN · GESTOR_INVENTARIO · CONTABLE';
                else if (st === 400) msg = sm || 'Rango de fechas no válido.';
                else                 msg = sm || `Error ${st ?? 'desconocido'}.`;
            }
            setErrorMsg(msg);
            setLoadState('error');
        }
    }

    const albaranes       = resultado?.albaranes ?? [];
    const albaranData     = albaranes.length > 0
        ? toAlbaranConsolidado(albaranes, resultado!.desde, resultado!.hasta, tipoFiltro)
        : null;

    const nEntradas       = albaranes.filter(a => a.tipo === 'ENTRADA').length;
    const nSalidas        = albaranes.filter(a => a.tipo === 'SALIDA').length;

    // ── Render ────────────────────────────────────────────────────────
    return (
        <>
            {/* CSS de impresión + documento consolidado via portal */}
            {albaranData && !modalOpen && createPortal(<style>{PRINT_CSS}</style>, document.head)}
            {albaranData && !modalOpen && createPortal(
                <div id="albaran-consolidado-root">
                    <AlbaranTemplate data={albaranData} />
                </div>,
                document.body
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100dvh - 104px)', minHeight: 0 }}>

                {/* Cabecera */}
                <div style={{ flexShrink: 0 }}>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,2vw,22px)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        Albarán Consolidado
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
                        Agrupa todos los movimientos del período en un único documento · ADMIN · GESTOR_INVENTARIO · CONTABLE
                    </p>
                </div>

                {/* Panel de filtros */}
                <div style={{ flexShrink: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '16px', alignItems: 'flex-end' }}>

                        {/* Fecha inicio */}
                        <div>
                            <label style={labelStyle}>Fecha de inicio</label>
                            <input type="date" value={desde} max={hasta}
                                onChange={e => setDesde(e.target.value)}
                                style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>

                        {/* Fecha fin */}
                        <div>
                            <label style={labelStyle}>Fecha de fin</label>
                            <input type="date" value={hasta} min={desde} max={today}
                                onChange={e => setHasta(e.target.value)}
                                style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>

                        {/* Tipo de movimiento */}
                        <div>
                            <label style={labelStyle}>Tipo de movimiento</label>
                            <select
                                value={tipoFiltro}
                                onChange={e => setTipoFiltro(e.target.value as TipoFiltro)}
                                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                                onFocus={focusIn} onBlur={focusOut}
                            >
                                <option value="TODOS">Todos</option>
                                <option value="ENTRADA">Entradas</option>
                                <option value="SALIDA">Salidas</option>
                            </select>
                        </div>

                        {/* Botón buscar */}
                        <button
                            onClick={buscar}
                            disabled={loadState === 'loading' || !desde || !hasta}
                            className="btn btn-primary"
                            style={{ fontSize: '12px', letterSpacing: '0.10em', whiteSpace: 'nowrap', opacity: loadState === 'loading' ? 0.6 : 1 }}
                        >
                            {loadState === 'loading' ? 'BUSCANDO…' : 'GENERAR'}
                        </button>

                        {/* Botón imprimir */}
                        {albaranData && (
                            <button
                                onClick={() => window.print()}
                                className="btn btn-ghost"
                                style={{ fontSize: '12px', letterSpacing: '0.10em', whiteSpace: 'nowrap', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                            >
                                🖨 IMPRIMIR
                            </button>
                        )}
                    </div>

                    {loadState === 'error' && (
                        <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(255,68,102,0.07)', border: '1px solid var(--accent-danger)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-danger)' }}>
                            ✕ {errorMsg}
                        </div>
                    )}
                </div>

                {/* Área de resultados */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

                    {loadState === 'idle' && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '40px', opacity: 0.10 }}>🖨</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                Selecciona un rango y tipo, luego pulsa Generar
                            </div>
                        </div>
                    )}

                    {loadState === 'ok' && albaranes.length === 0 && (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            No se encontraron movimientos en ese rango con el filtro seleccionado.
                        </div>
                    )}

                    {loadState === 'ok' && albaranes.length > 0 && albaranData && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Resumen */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                                padding: '10px 16px',
                                background: 'rgba(0,212,255,0.06)',
                                border: '1px solid rgba(0,212,255,0.20)',
                                borderRadius: '8px',
                                fontFamily: 'var(--font-mono)', fontSize: '12px',
                                color: 'var(--accent-cyan)', letterSpacing: '0.04em', flexShrink: 0,
                            }}>
                                <span style={{ fontWeight: 700 }}>
                                    {albaranes.length} movimiento{albaranes.length !== 1 ? 's' : ''}
                                </span>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span>{resultado!.desde} → {resultado!.hasta}</span>
                                {tipoFiltro === 'TODOS' && (
                                    <>
                                        <span style={{ opacity: 0.4 }}>·</span>
                                        <span style={{ color: 'var(--accent-primary)' }}>▲ {nEntradas} entradas</span>
                                        <span style={{ opacity: 0.4 }}>·</span>
                                        <span style={{ color: 'var(--accent-danger)' }}>▼ {nSalidas} salidas</span>
                                    </>
                                )}
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ color: 'var(--text-muted)' }}>Nº {albaranData.numero}</span>
                            </div>

                            {/* Tabla de vista previa de los movimientos incluidos */}
                            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                        Movimientos incluidos en el albarán consolidado
                                    </span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                                            {['Fecha', 'Tipo', 'SKU', 'Producto', 'Entidad', 'Cant.', 'Stock'].map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {albaranes.map(item => {
                                            const tc = item.tipo === 'ENTRADA' ? 'var(--accent-primary)' : 'var(--accent-danger)';
                                            const fecha = new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <tr key={item.idTransaccion}
                                                    onClick={() => abrirAlbaranModal(item)}
                                                    title="Clic para ver el albarán de este movimiento"
                                                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 120ms ease' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fecha}</span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: tc, background: `${tc}15`, border: `1px solid ${tc}`, borderRadius: '3px', padding: '2px 7px' }}>
                                                            {item.tipo === 'ENTRADA' ? '▲' : '▼'} {item.tipo}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)' }}>{item.productoSku}</span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', maxWidth: '180px' }}>
                                                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{item.productoNombre}</span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', maxWidth: '140px' }}>
                                                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{item.entidadNombre}</span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: tc }}>{item.cantidad}</span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{item.stockAntes}</span>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.stockDespues}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            <AlbaranModal isOpen={modalOpen} onClose={() => setModalOpen(false)} data={modalInfo} />
        </>
    );
}