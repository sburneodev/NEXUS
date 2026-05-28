/**
 * components/usuarios/UserRoleManager.tsx
 *
 * Gestor de roles inline para la tabla de usuarios.
 * — Vista compacta (badges) con botón ✎ para abrir edición
 * — Vista expandida (checkboxes) con self-guard y manejo de errores 403/400
 */

import { useState } from 'react';
import api from '../../services/api';

const ROLES_DISPONIBLES = [
    'ADMIN',
    'GESTOR_INVENTARIO',
    'CAJERO',
    'MARKETING_ANALYST',
    'CONTABLE',
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserRoleManagerProps {
    userId:       number;
    currentRoles: string[];
    /** true si la fila corresponde al usuario actualmente autenticado */
    isSelf:       boolean;
    /** Modo solo lectura — oculta el botón de editar */
    readOnly?:    boolean;
    /** Callback con el array de roles actualizado tras guardar con éxito */
    onSuccess:    (newRoles: string[]) => void;
    /** Callback con mensaje de error tipado (403, 400, genérico) */
    onError:      (msg: string) => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function UserRoleManager({
    userId,
    currentRoles,
    isSelf,
    readOnly = false,
    onSuccess,
    onError,
}: UserRoleManagerProps): JSX.Element {

    const [editing, setEditing] = useState(false);
    const [pending, setPending] = useState<string[]>([]);
    const [saving,  setSaving]  = useState(false);

    function startEdit(): void {
        setPending([...currentRoles]);
        setEditing(true);
    }

    function cancelEdit(): void {
        setEditing(false);
        setPending([]);
    }

    function toggleRole(role: string): void {
        setPending(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    }

    // Self-guard: si soy yo mismo no puedo quedarme sin ningún rol
    const selfGuardViolated = isSelf && pending.length === 0;
    // Sin cambios respecto al estado actual
    const noChanges =
        [...pending].sort().join(',') === [...currentRoles].sort().join(',');

    async function saveRoles(): Promise<void> {
        if (selfGuardViolated || noChanges) return;
        setSaving(true);
        try {
            const toAdd    = pending.filter(r => !currentRoles.includes(r));
            const toRemove = currentRoles.filter(r => !pending.includes(r));

            for (const rol of toAdd) {
                await api.post(`/usuarios/${userId}/roles`, { rol });
            }
            for (const rol of toRemove) {
                await api.delete(`/usuarios/${userId}/roles`, { data: { rol } });
            }

            onSuccess([...pending]);
            setEditing(false);
            setPending([]);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 403)      onError('Sin permisos para modificar roles (403)');
            else if (status === 400) onError('Selección de roles inválida (400)');
            else                     onError('Error al guardar los roles. Inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    }

    // ── Vista compacta (collapsed) ────────────────────────────────────────────

    if (!editing) {
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                {ROLES_DISPONIBLES.map(role => {
                    const tiene = currentRoles?.includes(role);
                    return (
                        <span key={role} style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '9px',
                            letterSpacing: '0.06em',
                            color:         tiene ? 'var(--accent-primary)' : 'var(--text-muted)',
                            border:        `1px solid ${tiene ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                            borderRadius:  '3px',
                            padding:       '1px 5px',
                            opacity:       tiene ? 1 : 0.3,
                            transition:    'opacity 200ms',
                        }}>
                            {role.replace(/_/g, ' ')}
                        </span>
                    );
                })}

                {!readOnly && (
                    <button
                        onClick={startEdit}
                        title="Editar roles"
                        style={{
                            marginLeft:    '2px',
                            background:    'transparent',
                            border:        '1px solid var(--border-default)',
                            borderRadius:  '3px',
                            padding:       '2px 7px',
                            cursor:        'pointer',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '9px',
                            color:         'var(--text-muted)',
                            letterSpacing: '0.06em',
                            transition:    'border-color 120ms, color 120ms',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                            e.currentTarget.style.color = 'var(--accent-cyan)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                    >
                        ✎
                    </button>
                )}
            </div>
        );
    }

    // ── Vista expandida (checkboxes) ──────────────────────────────────────────

    return (
        <div style={{
            background:   'var(--bg-elevated)',
            border:       '1px solid var(--border-default)',
            borderRadius: 'var(--radius-base)',
            padding:      '10px 12px',
            minWidth:     '220px',
            boxShadow:    '0 4px 20px rgba(0,0,0,0.40)',
        }}>
            <div style={{
                fontFamily:    'var(--font-display)',
                fontSize:      '9px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:         'var(--text-muted)',
                marginBottom:  '9px',
            }}>
                Roles asignados
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '10px' }}>
                {ROLES_DISPONIBLES.map(role => {
                    const checked = pending.includes(role);
                    // Self-guard: si soy yo y este es el único rol marcado, bloquear desmarcar
                    const blocked = isSelf && checked && pending.length === 1;

                    return (
                        <label key={role} style={{
                            display:    'flex',
                            alignItems: 'center',
                            gap:        '8px',
                            cursor:     blocked || saving ? 'not-allowed' : 'pointer',
                            opacity:    blocked ? 0.4 : 1,
                            userSelect: 'none',
                        }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={blocked || saving}
                                onChange={() => { if (!blocked) toggleRole(role); }}
                                style={{
                                    accentColor: 'var(--accent-primary)',
                                    width:       '13px',
                                    height:      '13px',
                                    flexShrink:  0,
                                    cursor:      blocked || saving ? 'not-allowed' : 'pointer',
                                }}
                            />
                            <span style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '11px',
                                letterSpacing: '0.04em',
                                color:         checked ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                transition:    'color 120ms',
                            }}>
                                {role.replace(/_/g, ' ')}
                            </span>
                            {blocked && (
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '9px',
                                    color:         'var(--accent-gold)',
                                    marginLeft:    'auto',
                                    letterSpacing: '0.04em',
                                }}>
                                    mínimo
                                </span>
                            )}
                        </label>
                    );
                })}
            </div>

            {/* Self-guard warning */}
            {selfGuardViolated && (
                <div style={{
                    display:       'flex',
                    gap:           '5px',
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '10px',
                    color:         'var(--accent-danger)',
                    marginBottom:  '8px',
                    letterSpacing: '0.04em',
                }}>
                    <span>▲</span>
                    <span>No puedes quitarte todos los roles</span>
                </div>
            )}

            <div style={{ display: 'flex', gap: '6px' }}>
                <button
                    onClick={() => { saveRoles(); }}
                    disabled={saving || selfGuardViolated || noChanges}
                    className="btn btn-primary"
                    style={{
                        fontSize: '10px',
                        padding:  '5px 14px',
                        opacity:  saving || selfGuardViolated || noChanges ? 0.45 : 1,
                        cursor:   saving || selfGuardViolated || noChanges ? 'not-allowed' : 'pointer',
                        minWidth: '72px',
                    }}
                >
                    {saving ? '···' : 'GUARDAR'}
                </button>
                <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="btn btn-ghost"
                    style={{ fontSize: '10px', padding: '5px 12px' }}
                >
                    CANCELAR
                </button>
            </div>
        </div>
    );
}
