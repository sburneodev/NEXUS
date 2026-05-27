/**
 * components/stock/Code39Barcode.tsx
 *
 * Renderer de código de barras Code 39 en SVG puro — sin dependencias externas.
 * Funciona offline y escala perfectamente para impresión (SVG vectorial).
 *
 * ── Estándar ─────────────────────────────────────────────────────────────────
 * ISO/IEC 16388 — Code 39.
 * Soporta: A-Z · 0-9 · - · . · espacio · $ / + %
 * Los caracteres no soportados se eliminan automáticamente.
 * El código se envuelve en '*' (carácter start/stop) de forma transparente.
 *
 * ── Codificación ─────────────────────────────────────────────────────────────
 * Cada carácter → 9 elementos alternando barra/espacio (barra primero).
 * Patrón de 9 bits: '0' = estrecho (narrowWidth px), '1' = ancho (3× narrowWidth).
 * Cada carácter tiene exactamente 3 elementos anchos y 6 estrechos.
 * Entre caracteres se añade un espacio estrecho (inter-character gap).
 */

interface Code39Props {
    value:        string;
    /** Altura de las barras en px (default: 60) */
    height?:      number;
    /** Ancho de barra estrecha en px (default: 2) */
    narrowWidth?: number;
    /** Mostrar el texto del código bajo las barras (default: true) */
    showText?:    boolean;
}

// ── Tabla Code 39 ─────────────────────────────────────────────────────────────
// Cada entrada: string de 9 bits. Índice par = barra, impar = espacio.
// Exactamente 3 '1' (anchos) por carácter — propiedad del estándar.
const CODE39: Readonly<Record<string, string>> = {
    '0': '000110100', '1': '100100001', '2': '001100001',
    '3': '101100000', '4': '000110001', '5': '100110000',
    '6': '001110000', '7': '000100101', '8': '100100100',
    '9': '001100100',
    'A': '100001001', 'B': '001001001', 'C': '101001000',
    'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100',
    'J': '000011100', 'K': '100000011', 'L': '001000011',
    'M': '101000010', 'N': '000010011', 'O': '100010010',
    'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001',
    'V': '011000001', 'W': '111000000', 'X': '010010001',
    'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100',
    '$': '010101000', '/': '010100010', '+': '010001010',
    '%': '000101010', '*': '010010100',
};

const UNSUPPORTED_RE = /[^0-9A-Z\-\. \$\/\+%]/g;

export function Code39Barcode({
    value,
    height      = 60,
    narrowWidth = 2,
    showText    = true,
}: Code39Props): JSX.Element {

    const wideWidth = narrowWidth * 3;
    const interGap  = narrowWidth; // espacio estrecho entre caracteres

    // Normalizar: mayúsculas + eliminar caracteres no soportados
    const clean = value.toUpperCase().replace(UNSUPPORTED_RE, '');
    const text  = `*${clean}*`; // start/stop automático

    // Construir lista plana de segmentos: { w: ancho, dark: es barra }
    type Segment = { w: number; dark: boolean };
    const segments: Segment[] = [];

    for (let ci = 0; ci < text.length; ci++) {
        const pattern = CODE39[text[ci]];
        if (!pattern) continue;

        for (let i = 0; i < 9; i++) {
            segments.push({
                w:    pattern[i] === '1' ? wideWidth : narrowWidth,
                dark: i % 2 === 0, // índice par → barra (oscura); impar → espacio (blanco)
            });
        }

        // Inter-character gap (espacio estrecho blanco) entre todos los caracteres
        if (ci < text.length - 1) {
            segments.push({ w: interGap, dark: false });
        }
    }

    const totalW = segments.reduce((sum, s) => sum + s.w, 0);
    const textH  = showText ? 14 : 0;
    const svgH   = height + textH;

    // Construir rectángulos SVG sólo para las barras (el fondo blanco cubre los espacios)
    let x = 0;
    const rects: JSX.Element[] = [];
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        if (s.dark) {
            rects.push(
                <rect key={i} x={x} y={0} width={s.w} height={height} fill="#000000" />
            );
        }
        x += s.w;
    }

    return (
        <svg
            viewBox={`0 0 ${totalW} ${svgH}`}
            width={totalW}
            height={svgH}
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            role="img"
            aria-label={`Código de barras Code 39: ${clean}`}
        >
            {/* Fondo blanco garantizado para contraste en impresión */}
            <rect width={totalW} height={svgH} fill="#ffffff" />
            {rects}
            {showText && (
                <text
                    x={totalW / 2}
                    y={height + 11}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="'Courier New', Courier, monospace"
                    fill="#000000"
                    letterSpacing="0.08"
                >
                    {clean}
                </text>
            )}
        </svg>
    );
}
