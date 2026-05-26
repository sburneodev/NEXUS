/**
 * pages/ProductosPage.tsx — UI-05
 *
 * Página de gestión de productos.
 * Mock data funcional hasta conectar con el backend.
 * Búsqueda por nombre/SKU + filtro por tipo.
 * Paginación preparada para integrarse con la API.
 */

import { useState, useMemo } from 'react';
import type { Producto, TipoProducto } from '../types/models';
import { ProductModal } from '../components/productos/ProductModal';
import { MOCK_PRODUCTOS } from '../mocks/mockProductos';

const PAGE_SIZE = 8;

export function ProductosPage(): JSX.Element {
    const [search, setSearch] = useState('');
    const [filterTipo, setFilterTipo] = useState<TipoProducto | 'TODOS'>('TODOS');
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<Producto | null>(null);
    const [products, setProducts] = useState<Producto[]>(MOCK_PRODUCTOS);

    // Filtrado y búsqueda
    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchSearch = search === '' ||
                p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                p.sku.toLowerCase().includes(search.toLowerCase());
            const matchTipo = filterTipo === 'TODOS' || p.tipoProducto === filterTipo;
            return matchSearch && matchTipo;
        });
    }, [products, search, filterTipo]);

    // Paginación
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function handleSave(data: Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn'>): void {
        if (selected) {
            setProducts(prev => prev.map(p =>
                p.id === selected.id ? { ...p, ...data } : p
            ));
        } else {
            const newProduct: Producto = {
                ...data,
                id: Date.now(),
                creadoEn: new Date().toISOString(),
                actualizadoEn: new Date().toISOString(),
            };
            setProducts(prev => [newProduct, ...prev]);
        }
        setModalOpen(false);
        setSelected(null);
    }

    function handleDelete(id: number): void {
        if (window.confirm('¿Eliminar este producto?')) {
            setProducts(prev => prev.filter(p => p.id !== id));
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
                        {filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={openNew}
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '10px 20px',
                        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))',
                        color: 'var(--text-inverse)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 0 16px var(--accent-primary-glow)',
                        transition: 'opacity 160ms ease',
                        flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
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
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                                        SIN RESULTADOS
                                    </td>
                                </tr>
                            ) : paginated.map(p => (
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
                                        <button
                                            onClick={() => openEdit(p)}
                                            style={actionBtnStyle('#0088cc')}
                                            title="Editar"
                                        >EDITAR</button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            style={actionBtnStyle('#cc2244')}
                                            title="Eliminar"
                                        >ELIMINAR</button>
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
                            Página {page} de {totalPages} · {filtered.length} resultados
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
