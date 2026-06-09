/**
 * components/productos/UbicacionPicker.tsx
 *
 * Selector de ubicación de almacén — componente compartido.
 * Usado por ProductFormPanel (edición inline) y ProductosNuevoPage (wizard).
 * Recibe los datos ya cargados como props; el consumidor gestiona el fetch.
 */

import { useState, useEffect, useRef, type CSSProperties } from 'react';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface UbicacionOption {
    id:           number;
    pasillo:      string;
    estanteria:   string;
    nivel:        number;
    numProductos: number;
}

export interface UbicacionPickerProps {
    ubicaciones: UbicacionOption[];
    loading:     boolean;
    error:       boolean;
    value:       string;
    onChange:    (id: string) => void;
    onRetry:     () => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function UbicacionPicker({
    ubicaciones, loading, error, value, onChange, onRetry,
}: UbicacionPickerProps): JSX.Element {

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

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

    if (error) {
        return (
            <div style={{
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                gap:          '10px',
                background:   'rgba(248,113,113,0.06)',
                border:       '1px solid rgba(248,113,113,0.30)',
                borderRadius: '8px',
                padding:      '12px 14px',
            }}>
                <div>
                    <div style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '11px',
                        fontWeight:    700,
                        letterSpacing: '0.10em',
                        color:         'var(--accent-danger)',
                        marginBottom:  '2px',
                    }}>
                        ⚠ Zonas no disponibles
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        No se pudo cargar el mapa de almacén. Inténtalo de nuevo.
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRetry}
                    style={{
                        flexShrink:    0,
                        fontFamily:    'var(--font-display)',
                        fontSize:      '10px',
                        fontWeight:    700,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        padding:       '6px 14px',
                        background:    'transparent',
                        color:         'var(--accent-cyan)',
                        border:        '1px solid var(--accent-cyan)',
                        borderRadius:  '5px',
                        cursor:        'pointer',
                        transition:    'all 160ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.08)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                    ↺ Reintentar
                </button>
            </div>
        );
    }

    const triggerStyle: CSSProperties = {
        width:          '100%',
        boxSizing:      'border-box' as const,
        fontFamily:     'var(--font-mono)',
        fontSize:       '13px',
        color:          'var(--text-primary)',
        background:     'var(--bg-elevated)',
        border:         `1px solid ${open ? 'var(--accent-cyan)' : 'var(--border-default)'}`,
        borderRadius:   '6px',
        padding:        '10px 12px',
        outline:        'none',
        transition:     'border-color 160ms ease, box-shadow 160ms ease',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        cursor:         loading ? 'wait' : 'pointer',
        opacity:        loading ? 0.6 : 1,
        textAlign:      'left' as const,
        gap:            '8px',
        boxShadow:      open ? '0 0 0 3px var(--accent-cyan-glow)' : 'none',
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(p => !p)}
                style={triggerStyle}
            >
                {loading ? (
                    <span style={{ color: 'var(--text-muted)' }}>Cargando zonas…</span>
                ) : selected ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '12px',
                            color:         'var(--text-primary)',
                        }}>
                            Pasillo <strong>{selected.pasillo}</strong> · Est. <strong>{selected.estanteria}</strong> · Nivel <strong>{selected.nivel}</strong>
                        </span>
                        <span style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '9px',
                            fontWeight:    700,
                            padding:       '2px 7px',
                            borderRadius:  '3px',
                            flexShrink:    0,
                            background:    selected.numProductos > 0 ? 'rgba(251,191,36,0.10)' : 'rgba(34,197,94,0.12)',
                            color:         selected.numProductos > 0 ? '#FBBF24' : '#22C55E',
                            border:        `1px solid ${selected.numProductos > 0 ? 'rgba(251,191,36,0.30)' : 'rgba(34,197,94,0.30)'}`,
                            letterSpacing: '0.06em',
                        }}>
                            {selected.numProductos > 0 ? `${selected.numProductos} PRODS` : 'LIBRE'}
                        </span>
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-muted)' }}>— Sin zona asignada —</span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>
                    {open ? '▲' : '▼'}
                </span>
            </button>

            {open && (
                <div style={{
                    position:   'absolute',
                    top:        'calc(100% + 4px)',
                    left:       0,
                    right:      0,
                    zIndex:     200,
                    background: 'var(--bg-elevated)',
                    border:     '1px solid var(--border-default)',
                    borderRadius: '8px',
                    boxShadow:  'var(--shadow-lg)',
                    maxHeight:  '240px',
                    overflowY:  'auto',
                    animation:  'fadeInUp 0.12s cubic-bezier(0.23,1,0.32,1) both',
                }}>
                    {/* Opción vacía */}
                    <div
                        onClick={() => { onChange(''); setOpen(false); }}
                        style={{
                            padding:       '10px 14px',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '12px',
                            color:         'var(--text-muted)',
                            cursor:        'pointer',
                            borderBottom:  '1px solid var(--border-subtle)',
                            transition:    'background 120ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-overlay)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                        — Sin zona asignada —
                    </div>

                    {pasillos.map(pasillo => (
                        <div key={pasillo}>
                            <div style={{
                                padding:       '7px 14px 3px',
                                fontFamily:    'var(--font-display)',
                                fontSize:      '9px',
                                fontWeight:    700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase' as const,
                                color:         'var(--text-muted)',
                                opacity:       0.7,
                            }}>
                                Pasillo {pasillo}
                            </div>
                            {ubicaciones
                                .filter(u => u.pasillo === pasillo)
                                .map(u => {
                                    const sel = String(u.id) === value;
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => { onChange(String(u.id)); setOpen(false); }}
                                            style={{
                                                display:        'flex',
                                                alignItems:     'center',
                                                justifyContent: 'space-between',
                                                gap:            '10px',
                                                padding:        '9px 14px',
                                                cursor:         'pointer',
                                                background:     sel ? 'rgba(56,189,248,0.08)' : 'transparent',
                                                borderLeft:     `2px solid ${sel ? 'var(--accent-cyan)' : 'transparent'}`,
                                                transition:     'background 120ms ease',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLDivElement).style.background =
                                                    sel ? 'rgba(56,189,248,0.10)' : 'var(--bg-overlay)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLDivElement).style.background =
                                                    sel ? 'rgba(56,189,248,0.08)' : 'transparent';
                                            }}
                                        >
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   '12px',
                                                color:      sel ? 'var(--accent-cyan)' : 'var(--text-primary)',
                                            }}>
                                                Est. {u.estanteria} · Nivel {u.nivel}
                                            </span>
                                            <span style={{
                                                fontFamily:    'var(--font-display)',
                                                fontSize:      '9px',
                                                fontWeight:    700,
                                                padding:       '2px 7px',
                                                borderRadius:  '3px',
                                                flexShrink:    0,
                                                letterSpacing: '0.06em',
                                                background:    u.numProductos > 0 ? 'rgba(251,191,36,0.10)' : 'rgba(34,197,94,0.12)',
                                                color:         u.numProductos > 0 ? '#FBBF24' : '#22C55E',
                                                border:        `1px solid ${u.numProductos > 0 ? 'rgba(251,191,36,0.30)' : 'rgba(34,197,94,0.30)'}`,
                                            }}>
                                                {u.numProductos > 0 ? `${u.numProductos} PRODS` : 'LIBRE'}
                                            </span>
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
