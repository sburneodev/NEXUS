/**
 * components/albaran/AlbaranTemplate.tsx
 *
 * Plantilla de albarán corporativo — formato A4, imprimible.
 * Estética limpia y profesional (sans-serif, navy #1a2b4c).
 *
 * Uso:
 *   <AlbaranTemplate data={albaranData} />
 *   window.print()  ← activa @media print automáticamente
 */

import styles from './AlbaranTemplate.module.css';

// ── Generador de código de barras I2of5 ───────────────────────────────────────
//
// Interleaved 2-of-5 (ISO/IEC 16390): solo dígitos, cada par de dígitos se
// codifica entrelazando las barras de un dígito con los espacios del siguiente.
// Estándar habitual en albaranes, notas de entrega y logística.

/** Patrones I2of5: cada dígito → 5 elementos (1=ancho, 0=estrecho) */
const I25: readonly number[][] = [
    [0, 0, 1, 1, 0], // 0
    [1, 0, 0, 0, 1], // 1
    [0, 1, 0, 0, 1], // 2
    [1, 1, 0, 0, 0], // 3
    [0, 0, 1, 0, 1], // 4
    [1, 0, 1, 0, 0], // 5
    [0, 1, 1, 0, 0], // 6
    [0, 0, 0, 1, 1], // 7
    [1, 0, 0, 1, 0], // 8
    [0, 1, 0, 1, 0], // 9
];

const NARROW = 2; // px — módulo estrecho
const WIDE   = 5; // px — módulo ancho (ratio 2.5:1, mínimo ISO)

/** Calcula las anchuras (px) alternando barra/espacio para el string numérico */
function calcI25Widths(digits: string): number[] {
    const d   = digits.length % 2 !== 0 ? '0' + digits : digits;
    const out: number[] = [NARROW, NARROW, NARROW, NARROW]; // inicio: nbnsNbns
    for (let i = 0; i < d.length; i += 2) {
        const bars   = I25[+d[i]];
        const spaces = I25[+d[i + 1]];
        for (let j = 0; j < 5; j++) {
            out.push(bars[j]   ? WIDE : NARROW); // barra
            out.push(spaces[j] ? WIDE : NARROW); // espacio
        }
    }
    out.push(WIDE, NARROW, NARROW); // fin: barra ancha, espacio estrecho, barra estrecha
    return out;
}

/** Deriva un código numérico único a partir del número de albarán + tipo */
function buildBarcodeDigits(numero: string, tipo: 'ENTRADA' | 'SALIDA'): string {
    const prefix   = tipo === 'ENTRADA' ? '1' : '2';
    const digits   = numero.replace(/\D/g, '');
    const combined = prefix + digits;
    return combined.length % 2 === 0 ? combined : '0' + combined;
}

interface BarcodeI25Props {
    value:   string;   // dígitos ya procesados (longitud par)
    height?: number;   // px
    label?:  string;   // texto legible bajo el código
}

function BarcodeI25({ value, height = 40, label }: BarcodeI25Props): JSX.Element {
    const widths = calcI25Widths(value);
    const totalW = widths.reduce((a, b) => a + b, 0);

    // Pre-calcular posiciones X para evitar estado mutable en el render
    let x = 0;
    const positions = widths.map(w => { const px = x; x += w; return px; });

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <svg
                width={totalW}
                height={height}
                viewBox={`0 0 ${totalW} ${height}`}
                style={{ display: 'block' }}
            >
                {widths.map((w, i) =>
                    i % 2 === 0
                        ? <rect key={i} x={positions[i]} y={0} width={w} height={height} fill="#1a2b4c" />
                        : null
                )}
            </svg>
            {label && (
                <span style={{
                    fontFamily:    "'Courier New', 'Lucida Console', monospace",
                    fontSize:      '7px',
                    letterSpacing: '0.10em',
                    color:         '#1a2b4c',
                    textAlign:     'center',
                    whiteSpace:    'nowrap',
                }}>
                    {label}
                </span>
            )}
        </div>
    );
}

// ── Tipos de datos del componente ─────────────────────────────────────────────

export interface EmpresaInfo {
    /** Nombre legal de la empresa emisora */
    nombre:    string;
    /** NIF / CIF */
    nif:       string;
    /** Dirección completa */
    direccion: string;
    /** Teléfono de contacto */
    telefono?: string;
    /** Email de contacto */
    email?:    string;
    /** URL del logotipo completo (se renderiza con filtro navy para fondo blanco) */
    logoUrl?:  string;
    /**
     * URL del isotipo / marca (solo el símbolo, sin texto).
     * Se renderiza SIN filtro, manteniendo sus colores originales.
     * Si se provee, el nombre de empresa se muestra como texto junto al símbolo.
     * Tiene precedencia sobre logoUrl.
     */
    markUrl?:   string;
    /**
     * Nombre de marca corto para mostrar en el bloque del logo (junto al isotipo).
     * Si no se provee, se usa `nombre`.
     * Ejemplo: 'NEXUS' (en lugar de 'NEXUS Distribución S.L.')
     */
    brandName?: string;
    /** Tagline o eslogan (opcional) */
    tagline?:   string;
}

export interface EntidadInfo {
    /** Nombre del cliente o proveedor */
    nombre:    string;
    /** NIF / CIF de la entidad */
    nif?:      string;
    /** Dirección de la entidad */
    direccion?: string;
    /** Teléfono */
    telefono?: string;
    /** Email */
    email?:    string;
    /** Persona de contacto */
    contacto?: string;
}

export interface LineaAlbaran {
    /** Código / referencia del artículo */
    codigo:       string;
    /** Descripción del artículo */
    descripcion:  string;
    /** Cantidad */
    cantidad:     number;
    /** Unidad de medida (uds., kg, cajas…) */
    unidad?:      string;
    /** Observaciones de línea */
    observaciones?: string;
}

export interface AlbaranData {
    /** Número de albarán (p. ej. "ALB-2024-0042") */
    numero:            string;
    /** Tipo: entrada de mercancía o salida */
    tipo:              'ENTRADA' | 'SALIDA';
    /** Fecha del albarán (ISO o cadena legible) */
    fecha:             string;
    /** Referencia del pedido asociado (opcional) */
    referenciaPedido?: string;
    /** Almacén / ubicación origen o destino */
    almacen?:          string;
    /** Transportista (opcional) */
    transportista?:    string;
    /** Matrícula o código de transporte (opcional) */
    matricula?:        string;
    /** Notas generales del albarán */
    notas?:            string;
    /** Datos de la empresa emisora */
    empresa:           EmpresaInfo;
    /** Datos del cliente / proveedor */
    entidad:           EntidadInfo;
    /** Líneas de artículos */
    lineas:            LineaAlbaran[];
    /** Texto legal / pie de página personalizado (opcional) */
    textoLegal?:       string;
}

export interface AlbaranTemplateProps {
    data: AlbaranData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function totalUnidades(lineas: LineaAlbaran[]): number {
    return lineas.reduce((acc, l) => acc + l.cantidad, 0);
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AlbaranTemplate({ data }: AlbaranTemplateProps): JSX.Element {
    const { empresa, entidad, lineas } = data;
    const esEntrada = data.tipo === 'ENTRADA';

    const textoLegalDefault =
        'Este documento acredita la recepción / entrega de la mercancía descrita. ' +
        'Cualquier discrepancia deberá notificarse en un plazo máximo de 48 horas. ' +
        'Documento generado por NEXUS ERP — ' + empresa.nombre + '.';

    // Código de barras único para este albarán
    const barcodeDigits = buildBarcodeDigits(data.numero, data.tipo);

    return (
        <div className={styles.root}>

            {/* ── CABECERA ────────────────────────────────────────────────── */}
            <header className={styles.header}>

                {/* Bloque izquierdo: isotipo / logo / nombre */}
                <div className={styles.logoBlock}>
                    {empresa.markUrl ? (
                        /* Isotipo en colores originales + nombre/brand como texto */
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                                src={empresa.markUrl}
                                alt=""
                                aria-hidden="true"
                                className={styles.markImg}
                            />
                            <div>
                                <div className={styles.logoFallback}>{empresa.brandName ?? empresa.nombre}</div>
                                {empresa.tagline && (
                                    <span className={styles.logoTagline}>{empresa.tagline}</span>
                                )}
                            </div>
                        </div>
                    ) : empresa.logoUrl ? (
                        /* Logo completo con filtro navy para fondo blanco */
                        <>
                            <img
                                src={empresa.logoUrl}
                                alt={`Logo ${empresa.nombre}`}
                                className={styles.logoImg}
                            />
                            {empresa.tagline && (
                                <span className={styles.logoTagline}>{empresa.tagline}</span>
                            )}
                        </>
                    ) : (
                        /* Fallback texto */
                        <>
                            <div className={styles.logoFallback}>{empresa.brandName ?? empresa.nombre}</div>
                            {empresa.tagline && (
                                <span className={styles.logoTagline}>{empresa.tagline}</span>
                            )}
                        </>
                    )}
                </div>

                {/* Bloque derecho: datos de la empresa */}
                <div className={styles.companyInfo}>
                    <div className={styles.companyName}>{empresa.nombre}</div>
                    <div>NIF: {empresa.nif}</div>
                    <div>{empresa.direccion}</div>
                    {empresa.telefono && <div>Tel. {empresa.telefono}</div>}
                    {empresa.email    && <div>{empresa.email}</div>}
                </div>

            </header>

            {/* ── TÍTULO + CÓDIGO DE BARRAS ────────────────────────────────── */}
            <div className={styles.docTitle}>

                <span className={styles.docTitleText}>
                    Albarán de {esEntrada ? 'Entrada' : 'Salida'}
                </span>

                {/* Código de barras I2of5 — único por albarán */}
                <div className={styles.docBarcodeBlock}>
                    <BarcodeI25
                        value={barcodeDigits}
                        height={34}
                        label={data.numero}
                    />
                </div>

                <span className={`${styles.docBadge} ${esEntrada ? styles.docBadgeEntrada : styles.docBadgeSalida}`}>
                    {esEntrada ? '▲ ENTRADA' : '▼ SALIDA'}
                </span>

            </div>

            {/* ── BLOQUE DE DATOS (albarán + entidad) ─────────────────────── */}
            <div className={styles.dataGrid}>

                {/* Bloque 1 — Datos del albarán */}
                <div className={styles.dataBlock}>
                    <div className={styles.dataBlockTitle}>Datos del albarán</div>

                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Número</span>
                        <span className={styles.dataValueStrong}>{data.numero}</span>
                    </div>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Fecha</span>
                        <span className={styles.dataValue}>{formatDate(data.fecha)}</span>
                    </div>
                    {data.referenciaPedido && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Ref. pedido</span>
                            <span className={styles.dataValue}>{data.referenciaPedido}</span>
                        </div>
                    )}
                    {data.almacen && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Almacén</span>
                            <span className={styles.dataValue}>{data.almacen}</span>
                        </div>
                    )}
                    {data.transportista && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Transportista</span>
                            <span className={styles.dataValue}>{data.transportista}</span>
                        </div>
                    )}
                    {data.matricula && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Matrícula</span>
                            <span className={styles.dataValue}>{data.matricula}</span>
                        </div>
                    )}
                </div>

                {/* Bloque 2 — Datos del cliente / proveedor */}
                <div className={styles.dataBlock}>
                    <div className={styles.dataBlockTitle}>
                        {esEntrada ? 'Proveedor' : 'Cliente / Destinatario'}
                    </div>

                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Nombre</span>
                        <span className={styles.dataValueStrong}>{entidad.nombre}</span>
                    </div>
                    {entidad.nif && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>NIF / CIF</span>
                            <span className={styles.dataValue}>{entidad.nif}</span>
                        </div>
                    )}
                    {entidad.direccion && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Dirección</span>
                            <span className={styles.dataValue}>{entidad.direccion}</span>
                        </div>
                    )}
                    {entidad.contacto && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Contacto</span>
                            <span className={styles.dataValue}>{entidad.contacto}</span>
                        </div>
                    )}
                    {entidad.telefono && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Teléfono</span>
                            <span className={styles.dataValue}>{entidad.telefono}</span>
                        </div>
                    )}
                    {entidad.email && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Email</span>
                            <span className={styles.dataValue}>{entidad.email}</span>
                        </div>
                    )}
                </div>

            </div>

            {/* ── NOTAS (si existen) ───────────────────────────────────────── */}
            {data.notas && (
                <>
                    <hr className={styles.separator} />
                    <div className={styles.dataBlock} style={{ marginBottom: '18px' }}>
                        <div className={styles.dataBlockTitle}>Notas</div>
                        <p style={{ margin: 0, fontSize: '10.5px', lineHeight: 1.6, color: '#1a1d23' }}>
                            {data.notas}
                        </p>
                    </div>
                </>
            )}

            {/* ── TABLA DE LÍNEAS ──────────────────────────────────────────── */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr>
                            <th style={{ width: '100px' }}>Código</th>
                            <th>Descripción</th>
                            <th className={styles.colCenter} style={{ width: '64px' }}>Cantidad</th>
                            <th style={{ width: '56px' }}>Unidad</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody className={styles.tbody}>
                        {lineas.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.tableEmpty}>
                                    Sin artículos registrados
                                </td>
                            </tr>
                        ) : (
                            lineas.map((linea, idx) => (
                                <tr key={idx}>
                                    <td className={styles.cellCodigo}>{linea.codigo}</td>
                                    <td>{linea.descripcion}</td>
                                    <td className={styles.cellCantidad}>{linea.cantidad}</td>
                                    <td>{linea.unidad ?? 'uds.'}</td>
                                    <td className={styles.cellObs}>{linea.observaciones ?? '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {lineas.length > 0 && (
                    <div className={styles.tableFooter}>
                        Total artículos: {lineas.length} referencia{lineas.length !== 1 ? 's' : ''}
                        &nbsp;·&nbsp;
                        Total unidades: {totalUnidades(lineas).toLocaleString('es-ES')}
                    </div>
                )}
            </div>

            {/* ── PIE DE PÁGINA ────────────────────────────────────────────── */}
            <footer className={styles.footer}>

                <div className={styles.signatureRow}>
                    <div className={styles.signatureBox}>
                        <span className={styles.signatureLabel}>
                            Firma y sello — {esEntrada ? 'Proveedor' : 'Empresa emisora'}
                        </span>
                    </div>
                    <div className={styles.signatureBox}>
                        <span className={styles.signatureLabel}>
                            Firma y sello — {esEntrada ? 'Almacén receptor' : 'Cliente / Destinatario'}
                        </span>
                    </div>
                    <div className={styles.signatureBox}>
                        <span className={styles.signatureLabel}>
                            Fecha de recepción / entrega
                        </span>
                    </div>
                </div>

                <p className={styles.legalNote}>
                    {data.textoLegal ?? textoLegalDefault}
                </p>

            </footer>

        </div>
    );
}
