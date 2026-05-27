/**
 * components/table/TableControls.tsx — SUFP v1
 *
 * Barra de controles universal para todas las tablas del sistema NEXUS.
 * Se conecta directamente con useTableFilters y gestiona:
 *   · Buscador con debounce + indicador de umbral + spinner de espera
 *   · Selector de filas por página (10 · 20 · 50 · 100)
 *   · Contador de resultados con rango y término de búsqueda activo
 *   · Paginación con ventana dinámica (ellipsis automáticos)
 *   · Estado de carga: skeleton en el contador + paginación desactivada
 *
 * Uso básico:
 *   <TableControls
 *     filters={filters}
 *     isLoading={isLoading}
 *     entityLabel="producto"
 *   />
 *
 * Con filtros extra (ej. selector de tipo):
 *   <TableControls
 *     filters={filters}
 *     isLoading={isLoading}
 *     entityLabel="producto"
 *     extraFilters={<MyTypeSelect />}
 *   />
 */

import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { UseTableFiltersReturn } from '../../hooks/useTableFilters';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TableControlsProps {
    /** Estado devuelto por useTableFilters — se pasa directamente */
    filters:              UseTableFiltersReturn;
    /** true mientras la petición al backend está en vuelo */
    isLoading?:           boolean;
    /** Etiqueta singular: "producto", "cliente", "movimiento". Default: "registro" */
    entityLabel?:         string;
    /** Etiqueta plural. Si se omite se usa entityLabel + 's' */
    entityLabelPlural?:   string;
    /** Placeholder del buscador. Si se omite se genera automáticamente */
    searchPlaceholder?:   string;
    /** Ocultar el grupo de botones de filas/página (útil en tablas compactas) */
    hideLimitSelector?:   boolean;
    /** Nodo(s) extra renderizados entre el buscador y el selector de filas */
    extraFilters?:        ReactNode;
}

// ── Opciones de filas por página ──────────────────────────────────────────────

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

// ── Algoritmo de ventana de paginación ────────────────────────────────────────
/**
 * Devuelve la lista de "ítems" de la barra de paginación.
 * `null` representa un separador de ellipsis (…).
 *
 * Siempre muestra: primera página · página actual ±1 · última página.
 * Rellena con '…' los huecos intermedios.
 */
function getPageWindow(current: number, total: number): (number | null)[] {
    if (total <= 1) return total === 1 ? [0] : [];
    if (total <= 5) return Array.from({ length: total }, (_, i) => i);

    // Páginas que siempre aparecen: primera, última y vecinas de la actual
    const always = new Set([
        0,
        total - 1,
        current,
        Math.max(0, current - 1),
        Math.min(total - 1, current + 1),
    ]);

    const result: (number | null)[] = [];
    let prev = -1;

    for (let i = 0; i < total; i++) {
        if (always.has(i)) {
            if (i - prev > 1) result.push(null); // hueco → ellipsis
            result.push(i);
            prev = i;
        }
    }

    return result;
}

// ── Skeleton bar ──────────────────────────────────────────────────────────────

function SkeletonBar({ width = '100%', height = 12 }: { width?: string | number; height?: number }): JSX.Element {
    return (
        <div style={{
            width,
            height,
            borderRadius: '3px',
            background:   'var(--bg-overlay)',
            animation:    'skPulse 1.4s ease-in-out infinite',
            flexShrink:   0,
        }} />
    );
}

// ── Botón de página ───────────────────────────────────────────────────────────

interface PageBtnProps {
    label:      string;
    onClick:    () => void;
    active?:    boolean;
    disabled?:  boolean;
    title?:     string;
    ariaLabel?: string;
}

function PageBtn({ label, onClick, active = false, disabled = false, title, ariaLabel }: PageBtnProps): JSX.Element {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={ariaLabel ?? title}
            aria-current={active ? 'page' : undefined}
            className={`tc-page-btn${active ? ' tc-page-active' : ''}`}
            style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '11px',
                minWidth:    '28px',
                height:      '28px',
                padding:     '0 6px',
                display:     'flex',
                alignItems:  'center',
                justifyContent: 'center',
                background:  active ? 'var(--accent-primary)' : 'transparent',
                color:       active
                    ? 'var(--text-inverse)'
                    : disabled
                        ? 'var(--text-muted)'
                        : 'var(--text-secondary)',
                border:      `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                borderRadius: '4px',
                cursor:      disabled ? 'not-allowed' : 'pointer',
                opacity:     disabled ? 0.35 : 1,
                transition:  'all 120ms ease',
                letterSpacing: '0.02em',
            }}
        >
            {label}
        </button>
    );
}

// ── TableControls (componente principal) ─────────────────────────────────────

export function TableControls({
    filters,
    isLoading           = false,
    entityLabel         = 'registro',
    entityLabelPlural,
    searchPlaceholder,
    hideLimitSelector   = false,
    extraFilters,
}: TableControlsProps): JSX.Element {

    const plural      = entityLabelPlural ?? `${entityLabel}s`;
    const placeholder = searchPlaceholder ?? `Buscar ${plural}...`;

    const {
        searchInput, search, limit, page,
        isDebouncing, totalItems, totalPages,
    } = filters;

    const searchRef   = useRef<HTMLInputElement>(null);
    const showSpinner = isDebouncing || isLoading;

    // Rango de filas mostradas
    const from = totalItems === 0 ? 0 : page * limit + 1;
    const to   = Math.min((page + 1) * limit, totalItems);

    // Estado del borde del buscador
    const searchBorderColor = showSpinner
        ? 'var(--accent-cyan)'
        : searchInput.length > 0
            ? 'rgba(0,212,255,0.55)'
            : 'var(--border-default)';

    const pageWindow = getPageWindow(page, totalPages);

    return (
        <>
            {/* ── CSS global inyectado una sola vez ─────────────────────── */}
            <style>{`
                @keyframes skPulse {
                    0%,100% { opacity: 0.28; }
                    50%     { opacity: 0.65; }
                }
                @keyframes tcSpin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .tc-search:focus { outline: none; border-color: var(--accent-cyan) !important; box-shadow: 0 0 0 3px rgba(0,212,255,0.10); }
                .tc-search:focus-visible { outline: 2px solid var(--accent-cyan) !important; outline-offset: 2px; }
                .tc-page-btn:focus-visible, .tc-limit-btn:focus-visible { outline: 2px solid var(--accent-primary) !important; outline-offset: 2px; box-shadow: 0 0 0 4px var(--accent-primary-glow) !important; }
                .tc-clear-btn:focus-visible { outline: 2px solid var(--accent-danger) !important; outline-offset: 2px; }
                .tc-page-btn:hover:not(:disabled):not(.tc-page-active) {
                    border-color: var(--accent-cyan) !important;
                    color:        var(--accent-cyan) !important;
                }
                .tc-limit-btn:hover:not(.tc-limit-active) {
                    border-color: var(--accent-cyan) !important;
                    color:        var(--text-primary) !important;
                }
                .tc-clear-btn:hover { color: var(--accent-danger) !important; }
            `}</style>

            {/* ── Fila 1: Buscador · Filtros extra · Selector de filas ─────── */}
            <div style={{
                display:    'flex',
                gap:        '10px',
                alignItems: 'center',
                flexWrap:   'wrap',
            }}>

                {/* ── Buscador ──────────────────────────────────────────── */}
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>

                    {/* Icono: lupa normal | spinner girando cuando hay actividad */}
                    <span style={{
                        position:  'absolute',
                        left:      '11px',
                        top:       '50%',
                        transform: 'translateY(-50%)',
                        display:   'flex',
                        alignItems: 'center',
                        color:     showSpinner ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        pointerEvents: 'none',
                        transition: 'color 200ms ease',
                        fontSize:  '14px',
                        lineHeight: 1,
                    }}>
                        <span style={{
                            display: 'block',
                            animation: showSpinner ? 'tcSpin 0.7s linear infinite' : 'none',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            {showSpinner ? '⟳' : '⌕'}
                        </span>
                    </span>

                    <input
                        ref={searchRef}
                        type="search"
                        role="searchbox"
                        aria-label={placeholder}
                        className="tc-search"
                        placeholder={placeholder}
                        value={searchInput}
                        onChange={e => filters.setSearchInput(e.target.value)}
                        style={{
                            width:       '100%',
                            boxSizing:   'border-box',
                            fontFamily:  'var(--font-mono)',
                            fontSize:    '13px',
                            color:       'var(--text-primary)',
                            background:  'var(--bg-surface)',
                            border:      `1px solid ${searchBorderColor}`,
                            borderRadius: '6px',
                            padding:     '9px 36px 9px 34px',
                            outline:     'none',
                            caretColor:  'var(--accent-cyan)',
                            transition:  'border-color 160ms ease, box-shadow 160ms ease',
                        }}
                    />

                    {/* Botón × para limpiar */}
                    {searchInput && (
                        <button
                            className="tc-clear-btn"
                            onClick={() => { filters.setSearchInput(''); searchRef.current?.focus(); }}
                            title="Limpiar búsqueda"
                            aria-label="Limpiar búsqueda"
                            style={{
                                position:   'absolute',
                                right:      '9px',
                                top:        '50%',
                                transform:  'translateY(-50%)',
                                background: 'none',
                                border:     'none',
                                padding:    '2px 5px',
                                cursor:     'pointer',
                                color:      'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                                fontSize:   '13px',
                                lineHeight: 1,
                                transition: 'color 120ms ease',
                            }}
                        >✕</button>
                    )}
                </div>

                {/* ── Filtros adicionales (ej. selector de tipo) ────────── */}
                {extraFilters}

                {/* ── Selector de filas ─────────────────────────────────── */}
                {!hideLimitSelector && (
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
                        {LIMIT_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                className={`tc-limit-btn${limit === opt ? ' tc-limit-active' : ''}`}
                                onClick={() => filters.setLimit(opt)}
                                aria-label={`Mostrar ${opt} ${plural} por página`}
                                aria-pressed={limit === opt}
                                style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '11px',
                                    padding:       '6px 9px',
                                    background:    limit === opt ? 'var(--accent-primary-glow)' : 'transparent',
                                    color:         limit === opt ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    border:        `1px solid ${limit === opt ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                                    borderRadius:  '4px',
                                    cursor:        'pointer',
                                    transition:    'all 120ms ease',
                                    letterSpacing: '0.02em',
                                    fontWeight:    limit === opt ? 600 : 400,
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '10px',
                            color:         'var(--text-muted)',
                            letterSpacing: '0.04em',
                            paddingLeft:   '3px',
                            userSelect:    'none',
                        }}>
                            filas
                        </span>
                    </div>
                )}
            </div>

            {/* ── Fila 2: Contador + Paginación ────────────────────────────── */}
            <div style={{
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'space-between',
                flexWrap:        'wrap',
                gap:             '8px',
                marginTop:       '10px',
            }}>

                {/* ── Contador de resultados ────────────────────────────── */}
                <div style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '11px',
                    color:         'var(--text-muted)',
                    letterSpacing: '0.04em',
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '8px',
                    minHeight:     '16px',
                }}>
                    {showSpinner ? (
                        // Skeleton pulsante mientras carga
                        <SkeletonBar width={150} height={11} />
                    ) : totalItems === 0 ? (
                        <span>
                            {search
                                ? <>Sin resultados para <em style={{ color: 'var(--accent-cyan)', fontStyle: 'normal' }}>"{search}"</em></>
                                : `Sin ${plural}`}
                        </span>
                    ) : (
                        <span>
                            Mostrando{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>{from}–{to}</strong>
                            {' '}de{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>
                                {totalItems.toLocaleString('es-ES')}
                            </strong>
                            {' '}{totalItems === 1 ? entityLabel : plural}
                            {search && (
                                <span style={{ color: 'var(--accent-cyan)' }}>
                                    {' '}· filtrando por{' '}
                                    <em style={{ fontStyle: 'normal', fontWeight: 600 }}>"{search}"</em>
                                </span>
                            )}
                        </span>
                    )}
                </div>

                {/* ── Paginación ────────────────────────────────────────── */}
                {totalPages > 1 && (
                    <div style={{
                        display:       'flex',
                        gap:           '3px',
                        alignItems:    'center',
                        // Deshabilitar interacción y atenuar durante carga
                        opacity:       showSpinner ? 0.35 : 1,
                        pointerEvents: showSpinner ? 'none' : 'auto',
                        transition:    'opacity 200ms ease',
                    }}>
                        {/* ◀ Anterior */}
                        <PageBtn
                            label="◀"
                            disabled={page === 0}
                            onClick={() => filters.setPage(page - 1)}
                            title="Página anterior"
                            ariaLabel="Ir a la página anterior"
                        />

                        {/* Ventana de páginas con ellipsis */}
                        {pageWindow.map((p, idx) =>
                            p === null
                                ? (
                                    <span
                                        key={`ell-${idx}`}
                                        style={{
                                            fontFamily:    'var(--font-mono)',
                                            fontSize:      '11px',
                                            color:         'var(--text-muted)',
                                            padding:       '0 3px',
                                            userSelect:    'none',
                                            letterSpacing: '0.1em',
                                        }}
                                    >…</span>
                                )
                                : (
                                    <PageBtn
                                        key={p}
                                        label={String(p + 1)}
                                        active={p === page}
                                        onClick={() => filters.setPage(p)}
                                        title={`Página ${p + 1}`}
                                        ariaLabel={`Ir a la página ${p + 1}`}
                                    />
                                )
                        )}

                        {/* ▶ Siguiente */}
                        <PageBtn
                            label="▶"
                            disabled={page >= totalPages - 1}
                            onClick={() => filters.setPage(page + 1)}
                            title="Página siguiente"
                            ariaLabel="Ir a la página siguiente"
                        />
                    </div>
                )}
            </div>
        </>
    );
}

// ── SkeletonRows ──────────────────────────────────────────────────────────────
/**
 * Filas de carga animadas para usar dentro de <tbody> mientras isLoading es true.
 *
 * @example
 *   <tbody>
 *     {isLoading
 *       ? <SkeletonRows rows={filters.limit} cols={6} />
 *       : rows.map(r => <tr key={r.id}>...</tr>)
 *     }
 *   </tbody>
 */

// Anchos predeterminados por columna (sin Math.random para evitar flickering)
const SK_WIDTHS: readonly number[][] = [
    [45, 62, 55, 70, 48, 40],
    [38, 75, 42, 65, 52, 35],
    [51, 58, 68, 43, 61, 45],
    [42, 71, 38, 59, 55, 38],
    [47, 66, 52, 72, 44, 42],
    [39, 61, 65, 41, 58, 36],
    [53, 55, 47, 68, 50, 43],
    [44, 73, 35, 62, 57, 39],
] as const;

interface SkeletonRowsProps {
    /** Número de filas a mostrar (suele coincidir con filters.limit) */
    rows?: number;
    /** Número de columnas de datos + la columna de acciones */
    cols?: number;
}

export function SkeletonRows({ rows = 8, cols = 5 }: SkeletonRowsProps): JSX.Element {
    return (
        <>
            {Array.from({ length: rows }).map((_, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {Array.from({ length: cols }).map((_, ci) => {
                        const widthPct = SK_WIDTHS[ri % SK_WIDTHS.length][ci % 6];
                        return (
                            <td key={ci} style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                <div style={{
                                    height:         '12px',
                                    width:          `${widthPct}%`,
                                    borderRadius:   '3px',
                                    background:     'var(--bg-overlay)',
                                    animation:      'skPulse 1.4s ease-in-out infinite',
                                    animationDelay: `${(ri * cols + ci) * 35}ms`,
                                }} />
                            </td>
                        );
                    })}
                </tr>
            ))}
        </>
    );
}
