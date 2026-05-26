/**
 * pages/ClientesPage.tsx — UI-09
 *
 * CRUD completo de Clientes.
 * Usa DataTable y FormModal genéricos.
 * Llama a clienteService — GET/POST/PUT/DELETE /api/clientes.
 */

import { useState, useEffect, useCallback } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { FormModal, FieldConfig } from '../components/common/FormModal';
import { clienteService, Cliente, ClienteForm } from '../services/entidadService';

// ── Columnas de la tabla ──────────────────────────────────────────────

const COLUMNS: Column<Cliente>[] = [
    {
        key: 'nombre', header: 'Nombre', minWidth: 160,
        render: row => (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {row.nombre}
            </span>
        ),
    },
    {
        key: 'email', header: 'Email',
        render: row => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '0.02em' }}>
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
        key: 'puntosFidelidad', header: 'Puntos',
        render: row => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                {row.puntosFidelidad ?? 0}
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
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Nombre completo', colSpan: 2 },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'cliente@email.com' },
    { key: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+34 600 000 000' },
    { key: 'puntosFidelidad', label: 'Puntos Fidelidad', type: 'number', min: 0 },
    { key: 'activo', label: 'Cliente activo', type: 'checkbox' },
];

// ── Página ────────────────────────────────────────────────────────────

export function ClientesPage(): JSX.Element {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<Cliente | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    function showToast(msg: string): void {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    const cargar = useCallback((): void => {
        setIsLoading(true);
        clienteService.listar('', 0, 200)
            .then(data => setClientes(data.content))
            .catch(() => setClientes([]))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    function handleEdit(cliente: Cliente): void {
        setSelected(cliente); setErrorMsg(null); setModalOpen(true);
    }
    function handleAdd(): void {
        setSelected(null); setErrorMsg(null); setModalOpen(true);
    }
    function handleClose(): void {
        setModalOpen(false); setSelected(null);
    }

    async function handleDelete(cliente: Cliente): Promise<void> {
        if (!window.confirm(`¿Eliminar a ${cliente.nombre}?`)) return;
        try {
            await clienteService.eliminar(cliente.id);
            showToast(`${cliente.nombre} eliminado correctamente`);
            cargar();
        } catch {
            showToast('Error al eliminar el cliente');
        }
    }

    async function handleSave(data: Partial<Cliente>): Promise<void> {
        setIsSaving(true); setErrorMsg(null);
        try {
            if (selected) {
                await clienteService.editar(selected.id, data as ClienteForm);
                showToast('Cliente actualizado correctamente');
            } else {
                await clienteService.crear(data as ClienteForm);
                showToast('Cliente creado correctamente');
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
                    Clientes
                </h1>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.04em' }}>
                    Gestión de la cartera de clientes · {clientes.filter(c => c.activo).length} activos
                </p>
            </div>

            <DataTable<Cliente>
                columns={COLUMNS}
                data={clientes}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAdd={handleAdd}
                addLabel="NUEVO CLIENTE"
                searchPlaceholder="Buscar por nombre, email o teléfono..."
            />

            <FormModal<Cliente>
                isOpen={modalOpen}
                title="Cliente"
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
