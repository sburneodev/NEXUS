/**
 * pages/ProveedoresPage.tsx — UI-09
 *
 * CRUD completo de Proveedores.
 * Usa los mismos DataTable y FormModal genéricos que ClientesPage.
 * Llama a proveedorService — GET/POST/PUT/DELETE /api/proveedores.
 */

import { useState, useEffect, useCallback } from 'react';
import { DataTable, Column }      from '../components/common/DataTable';
import { FormModal, FieldConfig } from '../components/common/FormModal';
import { proveedorService, Proveedor, ProveedorForm } from '../services/entidadService';

// ── Columnas de la tabla ──────────────────────────────────────────────

const COLUMNS: Column<Proveedor>[] = [
    {
        key: 'razonSocial', header: 'Razón Social', minWidth: 160,
        render: row => (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {row.razonSocial}
            </span>
        ),
    },
    {
        key: 'cif', header: 'CIF',
        render: row => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', letterSpacing: '0.06em' }}>
                {row.cif ?? '—'}
            </span>
        ),
    },
    {
        key: 'email', header: 'Email',
        render: row => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                {row.email ?? '—'}
            </span>
        ),
    },
    {
        key: 'telefono', header: 'Teléfono',
        render: row => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {row.telefono ?? '—'}
            </span>
        ),
    },
    {
        key: 'tiempoEntregaD', header: 'Entrega',
        render: row => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: row.tiempoEntregaD !== null ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                {row.tiempoEntregaD !== null ? `${row.tiempoEntregaD}d` : '—'}
            </span>
        ),
    },
    {
        key: 'activo', header: 'Estado',
        render: row => (
            <span className={row.activo ? 'badge badge-green' : 'badge'} style={{ fontSize: '9px' }}>
                {row.activo ? '● ACTIVO' : '○ INACTIVO'}
            </span>
        ),
    },
];

// ── Campos del formulario ─────────────────────────────────────────────

const FIELDS: FieldConfig[] = [
    { key: 'razonSocial',    label: 'Razón Social',        type: 'text',   required: true,  placeholder: 'Empresa S.L.', colSpan: 2 },
    { key: 'cif',            label: 'CIF / NIF',           type: 'text',   placeholder: 'B12345678' },
    { key: 'email',          label: 'Email',               type: 'email',  placeholder: 'contacto@empresa.com' },
    { key: 'telefono',       label: 'Teléfono',            type: 'tel',    placeholder: '+34 900 000 000' },
    { key: 'tiempoEntregaD', label: 'Tiempo entrega (días)', type: 'number', min: 0, max: 365 },
    { key: 'direccion',      label: 'Dirección',           type: 'textarea', colSpan: 2 },
    { key: 'activo',         label: 'Proveedor activo',    type: 'checkbox' },
];

// ── Página ────────────────────────────────────────────────────────────

export function ProveedoresPage(): JSX.Element {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [isLoading, setIsLoading]     = useState(true);
    const [modalOpen, setModalOpen]     = useState(false);
    const [selected, setSelected]       = useState<Proveedor | null>(null);
    const [isSaving, setIsSaving]       = useState(false);
    const [errorMsg, setErrorMsg]       = useState<string | null>(null);
    const [toast, setToast]             = useState('');

    function showToast(msg: string): void {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    const cargar = useCallback((): void => {
        setIsLoading(true);
        proveedorService.listar()
            .then(data => setProveedores(data))
            .catch(() => setProveedores([]))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    function handleEdit(proveedor: Proveedor): void {
        setSelected(proveedor); setErrorMsg(null); setModalOpen(true);
    }
    function handleAdd(): void {
        setSelected(null); setErrorMsg(null); setModalOpen(true);
    }
    function handleClose(): void {
        setModalOpen(false); setSelected(null);
    }

    async function handleDelete(proveedor: Proveedor): Promise<void> {
        if (!window.confirm(`¿Eliminar a ${proveedor.razonSocial}?`)) return;
        try {
            await proveedorService.eliminar(proveedor.id);
            showToast(`${proveedor.razonSocial} eliminado correctamente`);
            cargar();
        } catch {
            showToast('Error al eliminar el proveedor');
        }
    }

    async function handleSave(data: Partial<Proveedor>): Promise<void> {
        setIsSaving(true); setErrorMsg(null);
        try {
            if (selected) {
                await proveedorService.editar(selected.id, data as ProveedorForm);
                showToast('Proveedor actualizado correctamente');
            } else {
                await proveedorService.crear(data as ProveedorForm);
                showToast('Proveedor creado correctamente');
            }
            handleClose(); cargar();
        } catch {
            setErrorMsg('Error al guardar. Comprueba los datos e inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200, background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-base)', padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'fadeInUp 0.2s ease both' }}>
                    ✓ {toast}
                </div>
            )}

            {/* Cabecera */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                    Proveedores
                </h1>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.04em' }}>
                    Gestión de proveedores · {proveedores.filter(p => p.activo).length} activos
                </p>
            </div>

            <DataTable<Proveedor>
                columns={COLUMNS}
                data={proveedores}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAdd={handleAdd}
                addLabel="NUEVO PROVEEDOR"
                searchPlaceholder="Buscar por nombre, CIF o email..."
            />

            <FormModal<Proveedor>
                isOpen={modalOpen}
                title="Proveedor"
                entity={selected}
                fields={FIELDS}
                onClose={handleClose}
                onSave={handleSave}
                isSaving={isSaving}
                errorMsg={errorMsg}
            />
        </div>
    );
}
