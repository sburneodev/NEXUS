/**
 * components/common/DataTable.tsx — UI-09
 *
 * Tabla genérica configurable via props.
 * Paginación, búsqueda en tiempo real y skeleton loaders incluidos.
 * Sin dependencias externas — solo React.
 */

import { useState, useMemo, ReactNode } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────

export interface Column<T> {
    /** Clave única de la columna */
    key:      string;
    /** Cabecera visible */
    header:   string;
    /** Render personalizado — si no se provee usa row[key] */
    render?:  (row: T) => ReactNode;
    /** Ancho mínimo en px */
    minWidth?: number;
}

interface DataTableProps<T extends { id: number }> {
    columns:     Column<T>[];
    data:        T[];
    isLoading:   boolean;
    onEdit:      (row: T) => void;
    onDelete:    (row: T) => void;
    /** Texto del botón de alta */
    addLabel:    string;
    onAdd:       () => void;
    /** Placeholder del buscador */
    searchPlaceholder?: string;
    pageSize?:   number;
}

// ── Skeleton fila ─────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }): JSX.Element {
    return (
        <tr>
            {Array.from({ length: cols + 1 }).map((_, i) => (
                <td key={i} style={{ padding: '12px 14px' }}>
                    <div style={{
                        height:           '13px',
                        width:            i === cols ? '80px' : `${60 + Math.random() * 30}%`,
                        borderRadius:     '3px',
                        background:       'var(--bg-overlay)',
                        animation:        'skPulse 1.4s ease-in-out infinite',
                        animationDelay:   `${i * 80}ms`,
                    }} />
                </td>
            ))}
        </tr>
    );
}

// ── Componente principal ──────────────────────────────────────────────

export function DataTable<T extends { id: number }>({
    columns,
    data,
    isLoading,
    onEdit,
    onDelete,
    addLabel,
    onAdd,
    searchPlaceholder = 'Buscar...',
    pageSize = 8,
}: DataTableProps<T>): JSX.Element {

    const [search, setSearch] = useState('');
    const [page, setPage]     = useState(1);

    // Búsqueda en tiempo real sobre todos los campos string
    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(row =>
            Object.values(row as Record<string, unknown>).some(v =>
                typeof v === 'string' && v.toLowerCase().includes(q)
            )
        );
    }, [data, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

    function handleSearch(val: string): void {
        setSearch(val);
        setPage(1);
    }

    return (
        <>
            <style>{`
                @keyframes skPulse {
                    0%,100% { opacity: 0.35; }
                    50%     { opacity: 0.75; }
                }
                .dt-row:hover td { background: var(--bg-overlay); }
                .dt-action:hover { opacity: 1 !important; }
            `}</style>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    type="search"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    style={{
                        flex:          1, minWidth: '200px',
                        fontFamily:    'var(--font-mono)', fontSize: '13px',
                        color:         'var(--text-primary)',
                        background:    'var(--bg-surface)',
                        border:        '1px solid var(--border-default)',
                        borderRadius:  'var(--radius-base)',
                        padding:       '9px 14px', outline: 'none',
                        caretColor:    'var(--accent-cyan)',
                        transition:    'border-color 160ms ease',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </span>
                <button
                    onClick={onAdd}
                    className="btn btn-primary"
                    style={{ letterSpacing: '0.12em', fontSize: '12px', flexShrink: 0 }}
                >
                    + {addLabel}
                </button>
            </div>

            {/* Tabla */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                                {columns.map(col => (
                                    <th key={col.key} style={{
                                        padding:       '10px 14px', textAlign: 'left',
                                        fontFamily:    'var(--font-display)', fontSize: '10px',
                                        fontWeight:    700, letterSpacing: '0.12em',
                                        textTransform: 'uppercase', color: 'var(--text-muted)',
                                        whiteSpace:    'nowrap',
                                        minWidth:      col.minWidth,
                                    }}>
                                        {col.header}
                                    </th>
                                ))}
                                <th style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>
                                    ACCIONES
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && Array.from({ length: pageSize }).map((_, i) => (
                                <SkeletonRow key={i} cols={columns.length} />
                            ))}

                            {!isLoading && paginated.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length + 1} style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                        {search ? `SIN RESULTADOS PARA "${search.toUpperCase()}"` : 'SIN REGISTROS'}
                                    </td>
                                </tr>
                            )}

                            {!isLoading && paginated.map(row => (
                                <tr key={row.id} className="dt-row" style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}>
                                    {columns.map(col => (
                                        <td key={col.key} style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                                            {col.render
                                                ? col.render(row)
                                                : (
                                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)' }}>
                                                        {String((row as Record<string, unknown>)[col.key] ?? '—')}
                                                    </span>
                                                )
                                            }
                                        </td>
                                    ))}
                                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <button
                                            onClick={() => onEdit(row)}
                                            className="dt-action"
                                            style={{ background: 'transparent', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '6px', opacity: 0.75, transition: 'opacity 120ms ease' }}
                                        >EDITAR</button>
                                        <button
                                            onClick={() => onDelete(row)}
                                            className="dt-action"
                                            style={{ background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75, transition: 'opacity 120ms ease' }}
                                        >ELIMINAR</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {!isLoading && totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                            Página {page} de {totalPages}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[
                                { label: '◀', action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                                ...Array.from({ length: Math.min(totalPages, 5) }, (_, i) => ({
                                    label: String(i + 1), action: () => setPage(i + 1), disabled: false, active: page === i + 1,
                                })),
                                { label: '▶', action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
                            ].map((btn, i) => (
                                <button key={i} onClick={btn.action} disabled={btn.disabled} style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '11px', width: '28px', height: '28px',
                                    background: (btn as { active?: boolean }).active ? 'var(--accent-primary)' : 'transparent',
                                    color: (btn as { active?: boolean }).active ? 'var(--text-inverse)' : btn.disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
                                    border: '1px solid var(--border-default)', borderRadius: '4px',
                                    cursor: btn.disabled ? 'not-allowed' : 'pointer', opacity: btn.disabled ? 0.4 : 1,
                                }}>
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
