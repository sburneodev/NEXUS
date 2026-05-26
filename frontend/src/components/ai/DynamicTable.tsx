/**
 * components/ai/DynamicTable.tsx — UI-04
 *
 * Tabla polimórfica que renderiza cualquier estructura de datos.
 * Detecta las columnas automáticamente con Object.keys(data[0]).
 * No sabe nada del dominio — solo recibe filas y las pinta.
 */

/** Una fila de la tabla: clave → valor de cualquier tipo primitivo */
export type TableRow = Record<string, string | number | boolean | null>;

interface DynamicTableProps {
    /** Filas de datos — el tipado garantiza que no hay any */
    rows: TableRow[];
}

export function DynamicTable({ rows }: DynamicTableProps): JSX.Element {

    if (rows.length === 0) {
        return (
            <div style={{
                padding: '24px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
            }}>
                SIN RESULTADOS
            </div>
        );
    }

    // Columnas detectadas automáticamente desde la primera fila
    const columns = Object.keys(rows[0]);

    /** Formatea un valor para mostrarlo en la celda */
    function formatCell(val: string | number | boolean | null): string {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'boolean') return val ? '✓' : '✗';
        if (typeof val === 'number') {
            // Si parece un importe monetario (tiene decimales o es grande)
            return Number.isInteger(val)
                ? val.toLocaleString('es-ES')
                : val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(val);
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
            }}>
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th key={col} style={{
                                padding: '8px 12px',
                                textAlign: 'left',
                                fontFamily: 'var(--font-display)',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                borderBottom: '1px solid var(--border-default)',
                                whiteSpace: 'nowrap',
                            }}>
                                {col.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            style={{ transition: 'background 120ms ease' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            {columns.map(col => (
                                <td key={col} style={{
                                    padding: '8px 12px',
                                    color: 'var(--text-primary)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {formatCell(row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
