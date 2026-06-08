/**
 * components/usuarios/UserRoleManager.tsx
 *
 * Gestor de roles inline para la tabla de usuarios.
 * — Vista compacta (badges) con botón ✎ para abrir edición
 * — Vista expandida con checkboxes para roles granulares
 *
 * Reglas:
 *   ADMIN = solo lectura desde aquí (se gestiona a nivel de DB).
 *   Si el usuario tiene ADMIN, el panel es informativo y no permite edición.
 *   Self-guard: el usuario autenticado no puede quitarse su último rol.
 *   Validación: mínimo 1 rol seleccionado para poder guardar.
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

type Rol = typeof ROLES_DISPONIBLES[number];

// ── Metadatos de cada rol ──────────────────────────────────────────────────────

const ROL_META: Record<Rol, { label: string; desc: string }> = {
    ADMIN:              { label: 'ADMIN',              desc: 'Superusuario — acceso total' },
    GESTOR_INVENTARIO:  { label: 'GESTOR INVENTARIO',  desc: 'Gestión de stock y productos' },
    CAJERO:             { label: 'CAJERO',             desc: 'Ventas y movimientos de caja' },
    MARKETING_ANALYST:  { label: 'MARKETING',          desc: 'Análisis y campañas' },
    CONTABLE:           { label: 'CONTABLE',           desc: 'Acceso a informes financieros' },
};

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

// Roles que se pueden asignar/quitar desde la UI (ADMIN queda fuera — se gestiona a nivel de DB)
const ROLES_EDITABLES = ROLES_DISPONIBLES.filter(r => r !== 'ADMIN');

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

    // ── Helpers de estado ─────────────────────────────────────────────────────

    const esAdmin = currentRoles.includes('ADMIN');

    // Sin cambios respecto al estado guardado
    const noChanges = [...pending].sort().join(',') === [...currentRoles].sort().join(',');

    // Un usuario sin ningún rol no tiene sentido: bloquear guardar
    const noRolesSelected = pending.length === 0;

    const canSave = !saving && !noChanges && !noRolesSelected;

    // ── Edición ───────────────────────────────────────────────────────────────

    function startEdit(): void {
        setPending([...currentRoles]);
        setEditing(true);
    }

    function cancelEdit(): void {
        setEditing(false);
        setPending([]);
    }

    /** Toggle simple de rol granular (ADMIN nunca llega aquí). */
    function handleRoleChange(role: string): void {
        setPending(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    }

    // ── Guardar ───────────────────────────────────────────────────────────────

    async function saveRoles(): Promise<void> {
        if (!canSave) return;
        setSaving(true);
        try {
            const toAdd    = pending.filter(r => !currentRoles.includes(r));
            const toRemove = currentRoles.filter(r => !pending.includes(r));

            for (const rol of toAdd)    await api.post(`/usuarios/${userId}/roles`, { rol });
            for (const rol of toRemove) await api.delete(`/usuarios/${userId}/roles`, { data: { rol } });

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

    // ── Vista compacta (badges) ───────────────────────────────────────────────

    if (!editing) {
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                {esAdmin ? (
                    /* Si el usuario es ADMIN, mostrar solo el badge ADMIN con indicador especial */
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '9px',
                        letterSpacing: '0.08em',
                        color:         'var(--accent-gold)',
                        border:        '1px solid var(--accent-gold)',
                        borderRadius:  '3px',
                        padding:       '1px 6px',
                        background:    'rgba(255,204,0,0.06)',
                    }}>
                        ★ SUPERUSUARIO
                    </span>
                ) : (
                    /* Roles granulares */
                    ROLES_DISPONIBLES.filter(r => r !== 'ADMIN').map(role => {
                        const tiene = currentRoles.includes(role);
                        return (
                            <span key={role} style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '9px',
                                letterSpacing: '0.06em',
                                color:         tiene ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                border:        `1px solid ${tiene ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                                borderRadius:  '3px',
                                padding:       '1px 5px',
                                background:    tiene ? 'var(--accent-primary-glow)' : 'transparent',
                                transition:    'color 200ms, border-color 200ms',
                            }}>
                                {ROL_META[role].label}
                            </span>
                        );
                    })
                )}

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
                    >✎</button>
                )}
            </div>
        );
    }

    // ── Vista expandida ───────────────────────────────────────────────────────

    // Si el usuario es ADMIN: panel solo lectura (no se edita desde aquí)
    if (esAdmin) {
        return (
            <div style={{
                background:   'var(--bg-elevated)',
                border:       '1px solid rgba(255,204,0,0.25)',
                borderRadius: 'var(--radius-base)',
                padding:      '10px 12px',
                minWidth:     '240px',
                boxShadow:    '0 4px 20px rgba(0,0,0,0.40)',
            }}>
                <div style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '9px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         'var(--text-muted)',
                    marginBottom:  '10px',
                }}>
                    Roles asignados
                </div>
                <div style={{
                    display:      'flex',
                    gap:          '6px',
                    alignItems:   'center',
                    background:   'rgba(255,204,0,0.06)',
                    border:       '1px solid rgba(255,204,0,0.2)',
                    borderRadius: 'var(--radius-base)',
                    padding:      '8px 10px',
                    marginBottom: '10px',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '10px',
                    color:        'var(--accent-gold)',
                    letterSpacing:'0.06em',
                }}>
                    <span>★</span>
                    <span>SUPERUSUARIO — acceso total al sistema</span>
                </div>
                <div style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '9px',
                    color:         'var(--text-muted)',
                    letterSpacing: '0.04em',
                    marginBottom:  '10px',
                    lineHeight:    1.5,
                }}>
                    El rol ADMIN no se puede modificar desde aquí.
                </div>
                <button
                    onClick={cancelEdit}
                    className="btn btn-ghost"
                    style={{ fontSize: '10px', padding: '5px 12px' }}
                >
                    CERRAR
                </button>
            </div>
        );
    }

    // ── Vista expandida (checkboxes) — solo roles granulares ─────────────────

    return (
        <div style={{
            background:   'var(--bg-elevated)',
            border:       '1px solid var(--border-default)',
            borderRadius: 'var(--radius-base)',
            padding:      '10px 12px',
            minWidth:     '240px',
            boxShadow:    '0 4px 20px rgba(0,0,0,0.40)',
        }}>
            <div style={{
                fontFamily:    'var(--font-display)',
                fontSize:      '9px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:         'var(--text-muted)',
                marginBottom:  '10px',
            }}>
                Roles asignados
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {ROLES_EDITABLES.map(role => {
                    const checked = pending.includes(role);

                    /**
                     * Self-guard: si soy yo y solo queda 1 rol activo, no puedo desmarcarlo.
                     */
                    const selfGuardLock = isSelf && checked && pending.length === 1;
                    const isDisabled    = saving || selfGuardLock;

                    const labelColor = checked ? 'var(--accent-primary)' : 'var(--text-secondary)';

                    return (
                        <label key={role} style={{
                            display:    'flex',
                            alignItems: 'center',
                            gap:        '8px',
                            height:     '22px',
                            cursor:     isDisabled ? 'not-allowed' : 'pointer',
                            opacity:    selfGuardLock ? 0.4 : 1,
                            userSelect: 'none',
                            transition: 'opacity 160ms',
                        }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={isDisabled}
                                onChange={() => { if (!isDisabled) handleRoleChange(role); }}
                                style={{
                                    accentColor: 'var(--accent-primary)',
                                    width:       '13px',
                                    height:      '13px',
                                    flexShrink:  0,
                                    cursor:      isDisabled ? 'not-allowed' : 'pointer',
                                }}
                            />
                            <span style={{
                                flex:          1,
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '11px',
                                letterSpacing: '0.04em',
                                color:         labelColor,
                                transition:    'color 160ms',
                            }}>
                                {ROL_META[role].label}
                            </span>

                            {selfGuardLock && (
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '8px',
                                    color:         'var(--accent-gold)',
                                    letterSpacing: '0.06em',
                                    whiteSpace:    'nowrap',
                                }}>mínimo</span>
                            )}
                        </label>
                    );
                })}
            </div>

            {/* Warning: sin roles seleccionados */}
            {noRolesSelected && (
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
                    <span>Selecciona al menos un rol</span>
                </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '6px' }}>
                <button
                    onClick={() => { void saveRoles(); }}
                    disabled={!canSave}
                    className="btn btn-primary"
                    style={{
                        fontSize: '10px',
                        padding:  '5px 14px',
                        opacity:  canSave ? 1 : 0.45,
                        cursor:   canSave ? 'pointer' : 'not-allowed',
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
