/**
 * pages/ProductosPage.tsx — UI-05
 * Conectado al backend real via productoService
 */

import { useState, useEffect } from 'react';
import type { Producto, TipoProducto } from '../types/models';
import { ProductModal } from '../components/productos/ProductModal';
import { productoService } from '../services/productoService';

const PAGE_SIZE = 8;

export function ProductosPage(): JSX.Element {
    const [search, setSearch] = useState('');
    const [filterTipo, setFilterTipo] = useState<TipoProducto | 'TODOS'>('TODOS');
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<Producto | null>(null);
    const [products, setProducts] = useState<Producto[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);

    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    // ── Cargar datos del backend ──────────────────────────────────────
    useEffect(() => {
        setLoading(true);
        productoService.listar(
            page - 1,
            PAGE_SIZE,
            filterTipo !== 'TODOS' ? filterTipo : undefined,
            search || undefined
        )
            .then(data => {
                setProducts(data.content);
                setTotalElements(data.totalElements);
            })
            .catch(err => console.error('Error cargando productos:', err))
            .finally(() => setLoading(false));
    }, [page, filterTipo, search]);

    // ── Guardar (crear o editar) ──────────────────────────────────────
    async function handleSave(data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn'>): Promise<void> {
        try {
            if (selected) {
                await productoService.editar(selected.id, data as any);
            } else {
                await productoService.crear(data as any);
            }
            const result = await productoService.listar(
                page - 1, PAGE_SIZE,
                filterTipo !== 'TODOS' ? filterTipo : undefined,
                search || undefined
            );
            setProducts(result.content);
            setTotalElements(result.totalElements);
            setModalOpen(false);
            setSelected(null);
        } catch (err) {
            console.error('Error guardando producto:', err);
        }
    }

    // ── Eliminar ──────────────────────────────────────────────────────
    async function handleDelete(id: number): Promise<void> {
        if (window.confirm('¿Eliminar este producto?')) {
            try {
                await productoService.eliminar(id);
                setProducts(prev => prev.filter(p => p.id !== id));
                setTotalElements(prev => prev - 1);
            } catch (err) {
                console.error('Error eliminando producto:', err);
            }
        }
    }

    function openNew(): void { setSelected(null); setModalOpen(true); }
    function openEdit(p: Producto): void { setSelected(p); setModalOpen(true); }

    const stockBadge = (p: Producto): JSX.Element => {
        const critico = p.stockActual <= p.stockMinimo;
        return (
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: critico ? 'var(--accent-danger)' : 'var(--accent-primary)',
                background: critico ? 'var(--accent-danger-glow)' : 'var(--accent-primary-glow)',
                border: `1px solid ${critico ? 'var(--accent-danger)' : 'var(--accent-primary)'}`,
                borderRadius: '4px',
                padding: '1px 6px',
                letterSpacing: '0.04em',
            }}>
                {p.stockActual}
            </span>
        );
    };

    return (
        <div>
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Productos
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        {loading ? 'Cargando...' : `${totalElements} producto${totalElements !== 1 ? 's' : ''} encontrado${totalElements !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="btn btn-primary"
                    style={{ letterSpacing: '0.12em', fontSize: '12px', flexShrink: 0 }}
                >
                    + AÑADIR PRODUCTO
                </button>
            </div>

            {/* Barra de herramientas */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input
                    type="search"
                    placeholder="Buscar por nombre o SKU..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    style={{
                        flex: 1,
                        minWidth: '220px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '6px',
                        padding: '9px 14px',
                        outline: 'none',
                        caretColor: 'var(--accent-cyan)',
                        transition: 'border-color 160ms ease',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                />
                <select
                    value={filterTipo}
                    onChange={e => { setFilterTipo(e.target.value as TipoProducto | 'TODOS'); setPage(1); }}
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '6px',
                        padding: '9px 14px',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <option value="TODOS">Todos los tipos</option>
                    <option value="ESTANDAR">ESTÁNDAR</option>
                    <option value="RETRO">RETRO — La Bóveda</option>
                </select>
            </div>

            {/* Tabla */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                {['SKU', 'Nombre', 'Tipo', 'Precio Venta', 'Stock', 'Estado', 'Acciones'].map(h => (
                                    <th key={h} style={{
                                        padding: '10px 14px',
                                        textAlign: 'left',
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                        background: 'var(--bg-elevated)',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                                        CARGANDO...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                                        SIN RESULTADOS
                                    </td>
                                </tr>
                            ) : products.map(p => (
                                <tr
                                    key={p.id}
                                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
                                            {p.sku}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.nombre}</div>
                                        {p.descripcion && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.descripcion.slice(0, 50)}{p.descripcion.length > 50 ? '…' : ''}</div>}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.06em',
                                            color: p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                            border: `1px solid ${p.tipoProducto === 'RETRO' ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                                            borderRadius: '3px',
                                            padding: '2px 6px',
                                        }}>
                                            {p.tipoProducto}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                            €{p.precioVenta.toFixed(2)}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{stockBadge(p)}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            color: p.activo ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            letterSpacing: '0.06em',
                                        }}>
                                            {p.activo ? '● ACTIVO' : '○ INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                        <button onClick={() => openEdit(p)} style={actionBtnStyle('#0088cc')} title="Editar">EDITAR</button>
                                        <button onClick={() => handleDelete(p.id)} style={actionBtnStyle('#cc2244')} title="Eliminar">ELIMINAR</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border-subtle)',
                        flexWrap: 'wrap',
                        gap: '8px',
                    }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                            Página {page} de {totalPages} · {totalElements} resultados
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle(page === 1)}>◀</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n} onClick={() => setPage(n)} style={pageBtnStyle(false, n === page)}>{n}</button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnStyle(page === totalPages)}>▶</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <ProductModal
                producto={selected}
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelected(null); }}
                onSave={handleSave}
            />
        </div>
    );
}

// ── Estilos locales ───────────────────────────────────────────────────
const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    verticalAlign: 'middle',
};

function actionBtnStyle(color: string): React.CSSProperties {
    return {
        fontFamily: 'var(--font-display)',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        background: 'transparent',
        color,
        border: `1px solid ${color}`,
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '6px',
        transition: 'all 120ms ease',
    };
}

function pageBtnStyle(disabled: boolean, active = false): React.CSSProperties {
    return {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--accent-primary)' : 'transparent',
        color: active ? 'var(--text-inverse)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 120ms ease',
    };
}