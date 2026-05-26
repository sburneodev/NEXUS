/**
 * components/common/FormModal.tsx — UI-09
 *
 * Modal genérico reutilizable para formularios CRUD.
 * Configurable via props: título, campos y callbacks.
 * Sin librerías externas de formularios — validación básica propia.
 */

import { useState, useEffect, FormEvent, ReactNode } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'checkbox' | 'textarea';

export interface FieldConfig {
    key: string;
    label: string;
    type: FieldType;
    required?: boolean;
    placeholder?: string;
    min?: number;
    max?: number;
    colSpan?: 1 | 2;
}

interface FormModalProps<T extends Record<string, unknown>> {
    isOpen: boolean;
    title: string;
    /** null = alta, T = edición */
    entity: T | null;
    fields: FieldConfig[];
    onClose: () => void;
    onSave: (data: Partial<T>) => void;
    isSaving: boolean;
    /** Slot para mostrar feedback de error */
    errorMsg?: string | null;
    children?: ReactNode;
}

// ── Componente ────────────────────────────────────────────────────────

export function FormModal<T extends Record<string, unknown>>({
    isOpen, title, entity, fields,
    onClose, onSave, isSaving, errorMsg,
}: FormModalProps<T>): JSX.Element | null {

    const [form, setForm] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Inicializa el formulario cuando cambia la entidad o se abre el modal
    useEffect(() => {
        if (!isOpen) return;
        const initial: Record<string, unknown> = {};
        fields.forEach(f => {
            initial[f.key] = entity?.[f.key] ?? (f.type === 'checkbox' ? true : f.type === 'number' ? '' : '');
        });
        setForm(initial);
        setErrors({});
    }, [entity, isOpen, fields]);

    if (!isOpen) return null;

    function validate(): boolean {
        const newErrors: Record<string, string> = {};
        fields.forEach(f => {
            const val = form[f.key];
            if (f.required && (val === '' || val === null || val === undefined)) {
                newErrors[f.key] = `${f.label} es obligatorio`;
            }
            if (f.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
                newErrors[f.key] = 'Formato de email no válido';
            }
            if (f.type === 'number' && val !== '' && isNaN(Number(val))) {
                newErrors[f.key] = 'Debe ser un número';
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function handleSubmit(e: FormEvent): void {
        e.preventDefault();
        if (!validate()) return;
        const processed: Record<string, unknown> = {};
        fields.forEach(f => {
            processed[f.key] = f.type === 'number' && form[f.key] !== '' ? Number(form[f.key]) : form[f.key];
        });
        onSave(processed as Partial<T>);
    }

    const labelStyle: React.CSSProperties = {
        display: 'block', fontFamily: 'var(--font-display)',
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px',
    };

    const inputStyle = (hasError: boolean): React.CSSProperties => ({
        width: '100%', boxSizing: 'border-box',
        fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)',
        background: 'var(--bg-elevated)',
        border: `1px solid ${hasError ? 'var(--accent-danger)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-base)', padding: '9px 12px', outline: 'none',
        caretColor: 'var(--accent-cyan)', transition: 'border-color 160ms ease',
    });

    return (
        <>
            {/* Overlay */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 100, backdropFilter: 'blur(4px)' }} />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', zIndex: 101,
                width: '100%', maxWidth: '540px', maxHeight: '90dvh',
                overflowY: 'auto', background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                animation: 'fadeInUp 0.2s ease both',
            }}>

                {/* Cabecera */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)',
                    position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1,
                }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                        {entity ? `✎ EDITAR ${title.toUpperCase()}` : `+ NUEVO ${title.toUpperCase()}`}
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>✕</button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                        {fields.map(field => (
                            <div key={field.key} style={{ gridColumn: field.colSpan === 2 || field.type === 'textarea' || field.type === 'checkbox' ? '1 / -1' : undefined }}>

                                {field.type === 'checkbox' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="checkbox"
                                            id={field.key}
                                            checked={Boolean(form[field.key])}
                                            onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.checked }))}
                                            style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor={field.key} style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                                            {field.label}
                                        </label>
                                    </div>
                                ) : field.type === 'textarea' ? (
                                    <>
                                        <label style={labelStyle}>{field.label}{field.required && ' *'}</label>
                                        <textarea
                                            rows={2}
                                            placeholder={field.placeholder}
                                            value={String(form[field.key] ?? '')}
                                            onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            style={{ ...inputStyle(Boolean(errors[field.key])), resize: 'vertical' }}
                                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                                            onBlur={e => { e.currentTarget.style.borderColor = errors[field.key] ? 'var(--accent-danger)' : 'var(--border-default)'; }}
                                        />
                                        {errors[field.key] && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', margin: '4px 0 0' }}>{errors[field.key]}</p>}
                                    </>
                                ) : (
                                    <>
                                        <label style={labelStyle}>{field.label}{field.required && ' *'}</label>
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={String(form[field.key] ?? '')}
                                            min={field.min}
                                            max={field.max}
                                            onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            style={inputStyle(Boolean(errors[field.key]))}
                                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                                            onBlur={e => { e.currentTarget.style.borderColor = errors[field.key] ? 'var(--accent-danger)' : 'var(--border-default)'; }}
                                        />
                                        {errors[field.key] && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', margin: '4px 0 0' }}>{errors[field.key]}</p>}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Error global */}
                    {errorMsg && (
                        <div style={{ margin: '0 24px 16px', padding: '10px 14px', background: 'var(--accent-danger-glow)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-base)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-danger)' }}>
                            ⚠ {errorMsg}
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{
                        display: 'flex', justifyContent: 'flex-end', gap: '10px',
                        padding: '16px 24px', borderTop: '1px solid var(--border-subtle)',
                        position: 'sticky', bottom: 0, background: 'var(--bg-surface)',
                    }}>
                        <button type="button" onClick={onClose} className="btn btn-ghost" style={{ letterSpacing: '0.10em', fontSize: '12px' }}>
                            CANCELAR
                        </button>
                        <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ letterSpacing: '0.10em', fontSize: '12px', opacity: isSaving ? 0.5 : 1 }}>
                            {isSaving ? 'GUARDANDO...' : entity ? 'GUARDAR CAMBIOS' : 'CREAR'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
