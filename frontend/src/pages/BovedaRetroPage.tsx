/**
 * pages/BovedaRetroPage.tsx — UI-06
 *
 * Catálogo de productos RETRO — La Bóveda.
 * Grid responsive con tarjetas de colección, badges de conservación
 * y botón de tasación IA.
 * Usa exclusivamente variables CSS del sistema de diseño NEXUS.
 */

import { useState, useMemo } from 'react';
import type { Producto, EstadoConservacion } from '../types/models';

// ── Mock data tipado ──────────────────────────────────────────────────
const MOCK_RETRO: Producto[] = [
    { id: 1, sku: 'RET-SNES-001', nombre: 'Super Mario World', descripcion: 'Cartucho + Caja + Manual. Rozaduras leves en esquinas.', idCategoria: 3, idProveedor: 4, idUbicacion: 10, precioCoste: 45.00, precioVenta: 124.99, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'CIB', atributosEspecificos: { plataforma: 'SNES', anio: 1990, tasacion_ia_eur: 124.99 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 2, sku: 'RET-SNES-002', nombre: 'Donkey Kong Country', descripcion: 'Precintado original. Pieza de colección premium.', idCategoria: 3, idProveedor: 4, idUbicacion: 11, precioCoste: 110.00, precioVenta: 299.00, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'MINT', atributosEspecificos: { plataforma: 'SNES', anio: 1994, tasacion_ia_eur: 299.00 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 3, sku: 'RET-GB-001', nombre: 'Pokémon Red', descripcion: 'Solo cartucho. Batería recién reemplazada.', idCategoria: 3, idProveedor: 4, idUbicacion: 12, precioCoste: 15.00, precioVenta: 34.99, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'LOOSE', atributosEspecificos: { plataforma: 'Game Boy', anio: 1999, tasacion_ia_eur: 34.99 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 4, sku: 'RET-MD-001', nombre: 'Sonic the Hedgehog 2', descripcion: 'Completo en caja. Muy buen estado.', idCategoria: 3, idProveedor: 4, idUbicacion: 13, precioCoste: 28.00, precioVenta: 69.99, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: false, tipoProducto: 'RETRO', estadoConservacion: 'CIB', atributosEspecificos: { plataforma: 'Mega Drive', anio: 1992, tasacion_ia_eur: 69.99 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 5, sku: 'RET-NES-001', nombre: 'Super Mario Bros 3', descripcion: 'Caja original en muy buen estado. Manual con ilustraciones.', idCategoria: 3, idProveedor: 3, idUbicacion: 14, precioCoste: 60.00, precioVenta: 159.00, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'CIB', atributosEspecificos: { plataforma: 'NES', anio: 1990, tasacion_ia_eur: 159.00 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 6, sku: 'RET-GB-002', nombre: "Zelda: Link's Awakening", descripcion: 'Solo cartucho. Etiqueta parcialmente despegada.', idCategoria: 3, idProveedor: 3, idUbicacion: 15, precioCoste: 8.00, precioVenta: 18.99, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'LOOSE_D', atributosEspecificos: { plataforma: 'Game Boy', anio: 1993, tasacion_ia_eur: 18.99 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 7, sku: 'RET-PS1-001', nombre: 'Final Fantasy VII', descripcion: '3 discos originales. Icónico JRPG de los 90.', idCategoria: 3, idProveedor: 4, idUbicacion: 16, precioCoste: 35.00, precioVenta: 89.00, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'CIB', atributosEspecificos: { plataforma: 'PlayStation 1', anio: 1997, tasacion_ia_eur: 89.00 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 8, sku: 'RET-N64-001', nombre: 'Ocarina of Time', descripcion: 'Completo en caja. Manual en español. Cartucho dorado.', idCategoria: 3, idProveedor: 3, idUbicacion: 17, precioCoste: 70.00, precioVenta: 189.00, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'CIB', atributosEspecificos: { plataforma: 'Nintendo 64', anio: 1998, tasacion_ia_eur: 189.00 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 9, sku: 'RET-GBA-001', nombre: 'Castlevania: Aria of Sorrow', descripcion: 'Precintado. Altísima demanda en el mercado retro.', idCategoria: 3, idProveedor: 3, idUbicacion: 18, precioCoste: 120.00, precioVenta: 320.00, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'MINT', atributosEspecificos: { plataforma: 'Game Boy Advance', anio: 2003, tasacion_ia_eur: 320.00 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
    { id: 10, sku: 'RET-SNES-003', nombre: 'Street Fighter II Turbo', descripcion: 'Solo cartucho. Funciona perfectamente.', idCategoria: 3, idProveedor: 4, idUbicacion: 19, precioCoste: 12.00, precioVenta: 28.00, stockActual: 1, stockMinimo: 1, stockMaximo: 1, activo: true, tipoProducto: 'RETRO', estadoConservacion: 'LOOSE', atributosEspecificos: { plataforma: 'SNES', anio: 1993, tasacion_ia_eur: 28.00 }, creadoEn: '2026-01-01T00:00:00Z', actualizadoEn: '2026-01-01T00:00:00Z' },
];

// ── Badge de conservación ─────────────────────────────────────────────
const BADGE_MAP: Record<EstadoConservacion, { cls: string; label: string }> = {
    MINT: { cls: 'badge badge-green', label: '★ MINT' },
    CIB: { cls: 'badge badge-cyan', label: '◈ CIB' },
    LOOSE: { cls: 'badge badge-gold', label: '◎ LOOSE' },
    LOOSE_D: { cls: 'badge badge-danger', label: '▲ LOOSE-D' },
};

// ── Tarjeta individual ────────────────────────────────────────────────
interface RetroCardProps {
    producto: Producto;
    onTasar: (p: Producto) => void;
}

function RetroCard({ producto: p, onTasar }: RetroCardProps): JSX.Element {
    const badge = p.estadoConservacion ? BADGE_MAP[p.estadoConservacion] : null;
    const attrs = p.atributosEspecificos as Record<string, unknown> | null;
    const plataforma = attrs?.['plataforma'] as string | undefined;
    const anio = attrs?.['anio'] as number | undefined;

    return (
        <div
            className="card"
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                cursor: 'default',
                borderTop: '2px solid var(--accent-gold)',
                position: 'relative',
                overflow: 'hidden',
                opacity: p.activo ? 1 : 0.5,
            }}
        >
            {/* Vendido overlay */}
            {!p.activo && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(5,5,10,0.75)',
                    zIndex: 2,
                    backdropFilter: 'blur(2px)',
                }}>
                    <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-xl)',
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        color: 'var(--accent-danger)',
                        border: '2px solid var(--accent-danger)',
                        padding: '4px 16px',
                        transform: 'rotate(-12deg)',
                    }}>VENDIDO</span>
                </div>
            )}

            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--accent-cyan)',
                    letterSpacing: '0.08em',
                }}>
                    {p.sku}
                </span>
                {badge && <span className={badge.cls}>{badge.label}</span>}
            </div>

            {/* Título */}
            <div>
                <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.3,
                }}>
                    {p.nombre}
                </h3>
                {plataforma && (
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--accent-gold)',
                        letterSpacing: '0.06em',
                        marginTop: 'var(--space-1)',
                    }}>
                        {plataforma}{anio ? ` · ${anio}` : ''}
                    </div>
                )}
            </div>

            {/* Descripción */}
            {p.descripcion && (
                <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                    flex: 1,
                }}>
                    {p.descripcion}
                </p>
            )}

            {/* Precio */}
            <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 'var(--space-2)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 'var(--space-3)',
                marginTop: 'auto',
            }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: 'var(--accent-gold)',
                    letterSpacing: '-0.02em',
                    textShadow: '0 0 16px var(--accent-gold-glow)',
                }}>
                    €{p.precioVenta.toFixed(2)}
                </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                }}>
                    PVP
                </span>
            </div>

            {/* Botón TASAR */}
            <button
                className="btn btn-secondary"
                onClick={() => onTasar(p)}
                disabled={!p.activo}
                style={{ width: '100%', fontSize: 'var(--text-xs)', letterSpacing: '0.14em' }}
            >
                ◇ TASAR CON IA
            </button>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────
export function BovedaRetroPage(): JSX.Element {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<EstadoConservacion | 'TODOS'>('TODOS');
    const [tasando, setTasando] = useState<Producto | null>(null);

    const filtered = useMemo(() => {
        return MOCK_RETRO.filter(p => {
            const matchSearch = search === '' ||
                p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                p.sku.toLowerCase().includes(search.toLowerCase());
            const matchFilter = filter === 'TODOS' || p.estadoConservacion === filter;
            return matchSearch && matchFilter;
        });
    }, [search, filter]);

    const disponibles = filtered.filter(p => p.activo).length;

    return (
        <div style={{ background: 'var(--bg-base)', minHeight: '100%' }}>

            {/* Cabecera */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', color: 'var(--accent-gold)', textShadow: '0 0 20px var(--accent-gold-glow)' }}>◆</span>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        La Bóveda <span style={{ color: 'var(--accent-gold)' }}>Retro</span>
                    </h1>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    {disponibles} pieza{disponibles !== 1 ? 's' : ''} disponible{disponibles !== 1 ? 's' : ''} · Coleccionismo desde 1978
                </p>
            </div>

            {/* Barra de herramientas */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                <input
                    type="search"
                    placeholder="Buscar por nombre o SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: '200px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-base)',
                        padding: 'var(--space-3) var(--space-4)',
                        outline: 'none',
                        caretColor: 'var(--accent-gold)',
                        transition: 'border-color 160ms ease',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                />
                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value as EstadoConservacion | 'TODOS')}
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-base)',
                        padding: 'var(--space-3) var(--space-4)',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <option value="TODOS">Todos los estados</option>
                    <option value="MINT">MINT</option>
                    <option value="CIB">CIB</option>
                    <option value="LOOSE">LOOSE</option>
                    <option value="LOOSE_D">LOOSE-D</option>
                </select>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    SIN PIEZAS ENCONTRADAS
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 'var(--space-5)',
                }}>
                    {filtered.map(p => (
                        <RetroCard key={p.id} producto={p} onTasar={setTasando} />
                    ))}
                </div>
            )}

            {/* Modal simple de tasación iniciada */}
            {tasando && (
                <>
                    <div onClick={() => setTasando(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
                    <div style={{
                        position: 'fixed',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 101,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--accent-gold)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-8)',
                        maxWidth: '420px',
                        width: '90%',
                        boxShadow: 'var(--shadow-gold)',
                        textAlign: 'center',
                        animation: 'fadeInUp 0.2s ease both',
                    }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', color: 'var(--accent-gold)', marginBottom: 'var(--space-4)' }}>◆</div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                            Iniciando Tasación IA
                        </h3>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--accent-cyan)', marginBottom: 'var(--space-2)' }}>
                            {tasando.sku}
                        </p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                            Redirigiendo al panel de recompra con los datos precargados de <strong>{tasando.nombre}</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={() => setTasando(null)}>CANCELAR</button>
                            <button className="btn btn-primary" style={{ background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', color: 'var(--text-inverse)' }}>
                                ◇ EJECUTAR TASACIÓN
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
