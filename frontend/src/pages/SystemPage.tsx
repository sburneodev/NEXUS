/**
 * pages/SystemPage.tsx
 *
 * Panel de administración del sistema: Backup & Restauración.
 * Accesible únicamente para usuarios con rol ADMIN.
 *
 * Acciones:
 *   · Descargar copia de seguridad  → GET /api/system/backup
 *   · Restaurar sistema             → POST /api/system/restore (multipart)
 */

import { useState, useRef } from 'react';
import api from '../services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface RestoreResult {
    ok:             boolean;
    totalRows?:     number;
    tablesRestored?: number;
    backupDate?:    string;
    backupAuthor?:  string;
    error?:         string;
}

type Phase = 'idle' | 'loading' | 'success' | 'error';

// ── Paleta específica del módulo ───────────────────────────────────────────────
const PURPLE        = '#8B5CF6';
const PURPLE_DIM    = '#7C3AED';
const PURPLE_GLOW   = 'rgba(139, 92, 246, 0.15)';
const PURPLE_BORDER = 'rgba(139, 92, 246, 0.40)';

// ── Componente ────────────────────────────────────────────────────────────────

export function SystemPage(): JSX.Element {

    // ── Estado de backup ──────────────────────────────────────────────
    const [backupPhase,   setBackupPhase]   = useState<Phase>('idle');

    // ── Estado de restauración ────────────────────────────────────────
    const [restorePhase,  setRestorePhase]  = useState<Phase>('idle');
    const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
    const [selectedFile,  setSelectedFile]  = useState<File | null>(null);
    const [confirmOpen,   setConfirmOpen]   = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Hover state para efectos de card ──────────────────────────────
    const [backupHover,  setBackupHover]  = useState(false);
    const [restoreHover, setRestoreHover] = useState(false);
    const [btnHover,     setBtnHover]     = useState(false);

    // ── Backup ────────────────────────────────────────────────────────

    async function handleBackup(): Promise<void> {
        setBackupPhase('loading');
        try {
            const response = await api.get('/system/backup', { responseType: 'blob' });

            const disposition = response.headers['content-disposition'] as string | undefined;
            const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            const filename = match?.[1]?.replace(/['"]/g, '') ?? 'nexus_backup.json';

            const url  = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
            const link = document.createElement('a');
            link.href     = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setBackupPhase('success');
            setTimeout(() => setBackupPhase('idle'), 3000);
        } catch {
            setBackupPhase('error');
            setTimeout(() => setBackupPhase('idle'), 4000);
        }
    }

    // ── Restauración ──────────────────────────────────────────────────

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0] ?? null;
        setSelectedFile(file);
        setRestorePhase('idle');
        setRestoreResult(null);
    }

    async function handleRestore(): Promise<void> {
        if (!selectedFile) return;
        setConfirmOpen(false);
        setRestorePhase('loading');
        setRestoreResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const { data } = await api.post<RestoreResult>('/system/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setRestoreResult(data);
            setRestorePhase(data.ok ? 'success' : 'error');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Error de red o de servidor.';
            setRestoreResult({ ok: false, error: msg });
            setRestorePhase('error');
        }
    }

    // ── Helpers visuales ──────────────────────────────────────────────

    function formatDate(iso: string): string {
        try {
            return new Date(iso).toLocaleString('es-ES', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return iso; }
    }

    // ── Render ────────────────────────────────────────────────────────

    return (
        <div>
            {/* ── Cabecera ─────────────────────────────────────────── */}
            <div style={{ marginBottom: '28px', animation: 'fadeInDown 0.4s cubic-bezier(0.23,1,0.32,1) both' }}>
                <h1 style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(16px, 2vw, 22px)',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color:         'var(--text-primary)',
                    margin:        0,
                    lineHeight:    1.1,
                }}>
                    SISTEMA{' '}
                    <span style={{
                        background:           'linear-gradient(125deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor:  'transparent',
                        backgroundClip:       'text',
                        filter:               'drop-shadow(0 0 8px rgba(139,92,246,0.22))',
                        display:              'inline-block',
                    }}>&amp; BACKUP</span>
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '10px',
                        color:         'var(--accent-danger)',
                        border:        '1px solid var(--accent-danger)',
                        borderRadius:  '3px',
                        padding:       '1px 6px',
                        letterSpacing: '0.08em',
                    }}>
                        🔒 SOLO ADMIN
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        Gestión de copias de seguridad y restauración del sistema
                    </span>
                </div>
            </div>

            {/* ── Grid de paneles ──────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

                {/* ══ PANEL EXPORTACIÓN ══════════════════════════════ */}
                <div
                    onMouseEnter={() => setBackupHover(true)}
                    onMouseLeave={() => setBackupHover(false)}
                    style={{
                        background:    'var(--bg-surface)',
                        border:        `1px solid ${backupHover ? PURPLE : PURPLE_BORDER}`,
                        borderTop:     `2px solid ${PURPLE}`,
                        borderRadius:  'var(--radius-xl)',
                        padding:       '28px',
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           '20px',
                        /* Lift + glow */
                        transform:     backupHover ? 'translateY(-5px)' : 'translateY(0)',
                        boxShadow:     backupHover
                            ? `0 20px 56px rgba(139,92,246,0.22), 0 4px 16px rgba(0,0,0,0.30)`
                            : '0 2px 8px rgba(0,0,0,0.15)',
                        transition:    'transform 280ms cubic-bezier(0.23,1,0.32,1), box-shadow 280ms cubic-bezier(0.23,1,0.32,1), border-color 200ms ease',
                        /* Entrada */
                        animation:     'sys-slide-up 0.45s cubic-bezier(0.23,1,0.32,1) both',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                            width:          '44px',
                            height:         '44px',
                            borderRadius:   '10px',
                            background:     backupHover
                                ? `rgba(139,92,246,0.22)`
                                : PURPLE_GLOW,
                            border:         `1px solid ${backupHover ? PURPLE : PURPLE_BORDER}`,
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            fontSize:       '20px',
                            flexShrink:     0,
                            transition:     'background 200ms ease, border-color 200ms ease',
                        }}>
                            ⬇
                        </div>
                        <div>
                            <div style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '14px',
                                fontWeight:    700,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                color:         backupHover ? '#fff' : 'var(--text-primary)',
                                marginBottom:  '4px',
                                transition:    'color 200ms ease',
                            }}>
                                Copia de Seguridad
                            </div>
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '11px',
                                color:         'var(--text-muted)',
                                lineHeight:    1.6,
                                letterSpacing: '0.02em',
                            }}>
                                Exporta todas las entidades críticas a un archivo JSON firmado y descargable.
                            </div>
                        </div>
                    </div>

                    {/* Qué incluye */}
                    <div style={{
                        background:   backupHover ? 'rgba(139,92,246,0.07)' : 'var(--bg-elevated)',
                        border:       `1px solid ${backupHover ? PURPLE_BORDER : 'var(--border-subtle)'}`,
                        borderRadius: '8px',
                        padding:      '14px 16px',
                        transition:   'background 200ms ease, border-color 200ms ease',
                    }}>
                        <div style={{
                            fontFamily:    'var(--font-display)',
                            fontSize:      '9px',
                            fontWeight:    700,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color:         'var(--text-muted)',
                            marginBottom:  '10px',
                        }}>
                            Contenido del backup
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
                            {[
                                ['◈', 'Usuarios & Roles'],
                                ['▣', 'Productos'],
                                ['◉', 'Clientes'],
                                ['◎', 'Proveedores'],
                                ['▤', 'Almacén & Ubicaciones'],
                                ['▦', 'Categorías'],
                            ].map(([icon, label], i) => (
                                <div key={label} style={{
                                    display:    'flex',
                                    alignItems: 'center',
                                    gap:        '6px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize:   '10px',
                                    color:      'var(--text-secondary)',
                                    animation:  `stagger-in 0.3s cubic-bezier(0.23,1,0.32,1) ${120 + i * 40}ms both`,
                                }}>
                                    <span style={{
                                        color:      PURPLE,
                                        fontSize:   '10px',
                                        transition: 'transform 200ms ease',
                                        transform:  backupHover ? 'scale(1.25)' : 'scale(1)',
                                        display:    'inline-block',
                                    }}>{icon}</span>
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Feedback de estado */}
                    {backupPhase === 'success' && (
                        <div style={{
                            display:       'flex',
                            alignItems:    'center',
                            gap:           '8px',
                            background:    PURPLE_GLOW,
                            border:        `1px solid ${PURPLE_BORDER}`,
                            borderRadius:  '7px',
                            padding:       '10px 14px',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '11px',
                            color:         PURPLE,
                            letterSpacing: '0.04em',
                            animation:     'fadeInUp 0.2s ease both',
                        }}>
                            ✓ Archivo descargado correctamente
                        </div>
                    )}
                    {backupPhase === 'error' && (
                        <div style={{
                            display:       'flex',
                            alignItems:    'center',
                            gap:           '8px',
                            background:    'var(--accent-danger-glow)',
                            border:        '1px solid var(--accent-danger)',
                            borderRadius:  '7px',
                            padding:       '10px 14px',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '11px',
                            color:         'var(--accent-danger)',
                            letterSpacing: '0.04em',
                        }}>
                            ✕ Error al generar el backup. Inténtalo de nuevo.
                        </div>
                    )}

                    {/* Botón con shimmer */}
                    <div style={{ marginTop: 'auto', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-base)' }}>
                        {/* Shimmer sweep — visible solo en hover */}
                        {btnHover && backupPhase !== 'loading' && (
                            <div style={{
                                position:   'absolute',
                                top:        0, bottom: 0,
                                width:      '60%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
                                animation:  'shimmer-sweep 0.6s ease forwards',
                                pointerEvents: 'none',
                                zIndex:     1,
                            }} />
                        )}
                        <button
                            onClick={handleBackup}
                            disabled={backupPhase === 'loading'}
                            onMouseEnter={() => { setBtnHover(true); }}
                            onMouseLeave={() => { setBtnHover(false); }}
                            style={{
                                width:         '100%',
                                padding:       '12px 20px',
                                background:    backupPhase === 'loading' ? 'var(--bg-overlay)' : PURPLE,
                                color:         '#fff',
                                border:        'none',
                                borderRadius:  'var(--radius-base)',
                                fontFamily:    'var(--font-display)',
                                fontSize:      '12px',
                                fontWeight:    700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                cursor:        backupPhase === 'loading' ? 'wait' : 'pointer',
                                transition:    'background 160ms ease, transform 120ms ease, box-shadow 160ms ease',
                                display:       'flex',
                                alignItems:    'center',
                                justifyContent:'center',
                                gap:           '8px',
                                boxShadow:     backupPhase !== 'loading'
                                    ? btnHover
                                        ? `0 6px 24px rgba(139,92,246,0.45), 0 2px 6px rgba(0,0,0,0.20)`
                                        : `0 4px 16px ${PURPLE_GLOW}, 0 2px 6px rgba(0,0,0,0.20)`
                                    : 'none',
                                transform:     'scale(1)',
                            }}
                            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                        >
                            {backupPhase === 'loading' ? (
                                <>
                                    <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>◌</span>
                                    Generando…
                                </>
                            ) : (
                                <>⬇ Descargar Copia de Seguridad</>
                            )}
                        </button>
                    </div>
                </div>

                {/* ══ PANEL RESTAURACIÓN ══════════════════════════════ */}
                <div
                    onMouseEnter={() => setRestoreHover(true)}
                    onMouseLeave={() => setRestoreHover(false)}
                    style={{
                        background:    'var(--bg-surface)',
                        border:        `1px solid ${restoreHover ? 'rgba(248,113,113,0.55)' : 'var(--border-default)'}`,
                        borderTop:     '2px solid var(--accent-danger)',
                        borderRadius:  'var(--radius-xl)',
                        padding:       '28px',
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           '20px',
                        /* Lift + glow */
                        transform:     restoreHover ? 'translateY(-5px)' : 'translateY(0)',
                        boxShadow:     restoreHover
                            ? `0 20px 56px rgba(248,113,113,0.14), 0 4px 16px rgba(0,0,0,0.30)`
                            : '0 2px 8px rgba(0,0,0,0.15)',
                        transition:    'transform 280ms cubic-bezier(0.23,1,0.32,1), box-shadow 280ms cubic-bezier(0.23,1,0.32,1), border-color 200ms ease',
                        /* Entrada con stagger */
                        animation:     'sys-slide-up 0.45s cubic-bezier(0.23,1,0.32,1) 0.08s both',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                            width:          '44px',
                            height:         '44px',
                            borderRadius:   '10px',
                            background:     restoreHover ? 'rgba(248,113,113,0.16)' : 'var(--accent-danger-glow)',
                            border:         `1px solid ${restoreHover ? 'rgba(248,113,113,0.70)' : 'var(--accent-danger)'}`,
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            fontSize:       '20px',
                            flexShrink:     0,
                            transition:     'background 200ms ease, border-color 200ms ease',
                        }}>
                            ⬆
                        </div>
                        <div>
                            <div style={{
                                fontFamily:    'var(--font-display)',
                                fontSize:      '14px',
                                fontWeight:    700,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                color:         restoreHover ? '#fff' : 'var(--text-primary)',
                                marginBottom:  '4px',
                                transition:    'color 200ms ease',
                            }}>
                                Restaurar Sistema
                            </div>
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '11px',
                                color:         'var(--text-muted)',
                                lineHeight:    1.6,
                                letterSpacing: '0.02em',
                            }}>
                                Reemplaza todos los datos actuales con los del archivo de backup seleccionado.
                            </div>
                        </div>
                    </div>

                    {/* Aviso de peligro */}
                    <div style={{
                        display:       'flex',
                        alignItems:    'flex-start',
                        gap:           '10px',
                        background:    'rgba(248,113,113,0.06)',
                        border:        '1px solid rgba(248,113,113,0.25)',
                        borderRadius:  '8px',
                        padding:       '12px 14px',
                        animation:     'stagger-in 0.35s cubic-bezier(0.23,1,0.32,1) 0.2s both',
                    }}>
                        <span style={{ color: 'var(--accent-danger)', fontSize: '14px', flexShrink: 0, lineHeight: 1.4 }}>⚠</span>
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '10px',
                            color:         'var(--text-secondary)',
                            letterSpacing: '0.02em',
                            lineHeight:    1.65,
                        }}>
                            Esta operación es <strong style={{ color: 'var(--accent-danger)' }}>irreversible</strong>.
                            Todos los datos actuales serán eliminados y reemplazados por los del archivo.
                            El sistema verificará que el backup contenga un usuario ADMIN antes de proceder.
                        </span>
                    </div>

                    {/* Selector de archivo */}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            id="restore-file-input"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border:        `1.5px dashed ${selectedFile ? PURPLE_BORDER : 'var(--border-default)'}`,
                                borderRadius:  '8px',
                                padding:       '20px',
                                textAlign:     'center',
                                cursor:        'pointer',
                                background:    selectedFile ? PURPLE_GLOW : 'var(--bg-elevated)',
                                transition:    'all 200ms ease',
                            }}
                            onMouseEnter={e => {
                                const el = e.currentTarget as HTMLDivElement;
                                el.style.borderColor = PURPLE_BORDER;
                                el.style.background  = selectedFile ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.06)';
                                el.style.transform   = 'scale(1.01)';
                            }}
                            onMouseLeave={e => {
                                const el = e.currentTarget as HTMLDivElement;
                                el.style.borderColor = selectedFile ? PURPLE_BORDER : 'var(--border-default)';
                                el.style.background  = selectedFile ? PURPLE_GLOW : 'var(--bg-elevated)';
                                el.style.transform   = 'scale(1)';
                            }}
                        >
                            {selectedFile ? (
                                <div>
                                    <div style={{ fontSize: '20px', marginBottom: '6px', animation: 'scaleIn 0.25s ease both' }}>📄</div>
                                    <div style={{
                                        fontFamily:    'var(--font-display)',
                                        fontSize:      '12px',
                                        fontWeight:    700,
                                        color:         PURPLE,
                                        letterSpacing: '0.06em',
                                        marginBottom:  '2px',
                                        wordBreak:     'break-all',
                                    }}>
                                        {selectedFile.name}
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '10px',
                                        color:      'var(--text-muted)',
                                    }}>
                                        {(selectedFile.size / 1024).toFixed(1)} KB · Click para cambiar
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>📂</div>
                                    <div style={{
                                        fontFamily:    'var(--font-display)',
                                        fontSize:      '11px',
                                        fontWeight:    700,
                                        color:         'var(--text-secondary)',
                                        letterSpacing: '0.08em',
                                        marginBottom:  '3px',
                                    }}>
                                        SELECCIONAR ARCHIVO DE BACKUP
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '10px',
                                        color:      'var(--text-muted)',
                                    }}>
                                        Solo archivos .json generados por NEXUS
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resultado de restauración */}
                    {restoreResult && (
                        <div style={{
                            background:   restoreResult.ok ? PURPLE_GLOW : 'var(--accent-danger-glow)',
                            border:       `1px solid ${restoreResult.ok ? PURPLE_BORDER : 'var(--accent-danger)'}`,
                            borderRadius: '8px',
                            padding:      '14px 16px',
                            animation:    'fadeInUp 0.2s ease both',
                        }}>
                            {restoreResult.ok ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{
                                        fontFamily:    'var(--font-display)',
                                        fontSize:      '11px',
                                        fontWeight:    700,
                                        letterSpacing: '0.08em',
                                        color:         PURPLE,
                                        marginBottom:  '2px',
                                    }}>
                                        ✓ SISTEMA RESTAURADO CORRECTAMENTE
                                    </div>
                                    {[
                                        ['Filas restauradas', String(restoreResult.totalRows ?? '—')],
                                        ['Tablas procesadas', String(restoreResult.tablesRestored ?? '—')],
                                        ['Backup del', restoreResult.backupDate ? formatDate(restoreResult.backupDate) : '—'],
                                        ['Exportado por', restoreResult.backupAuthor ?? '—'],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{
                                            display:    'flex',
                                            gap:        '8px',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize:   '10px',
                                            color:      'var(--text-muted)',
                                        }}>
                                            <span style={{ minWidth: '130px', color: 'var(--text-secondary)' }}>{k}</span>
                                            <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-danger)', lineHeight: 1.6 }}>
                                    <strong>✕ Error:</strong> {restoreResult.error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botón restaurar */}
                    <button
                        onClick={() => selectedFile && setConfirmOpen(true)}
                        disabled={!selectedFile || restorePhase === 'loading'}
                        style={{
                            marginTop:     'auto',
                            width:         '100%',
                            padding:       '12px 20px',
                            background:    !selectedFile || restorePhase === 'loading'
                                ? 'var(--bg-overlay)'
                                : 'transparent',
                            color:         !selectedFile || restorePhase === 'loading'
                                ? 'var(--text-muted)'
                                : 'var(--accent-danger)',
                            border:        `1px solid ${!selectedFile || restorePhase === 'loading'
                                ? 'var(--border-subtle)'
                                : 'var(--accent-danger)'}`,
                            borderRadius:  'var(--radius-base)',
                            fontFamily:    'var(--font-display)',
                            fontSize:      '12px',
                            fontWeight:    700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            cursor:        !selectedFile || restorePhase === 'loading' ? 'not-allowed' : 'pointer',
                            transition:    'all 160ms ease, transform 120ms ease',
                        }}
                        onMouseEnter={e => {
                            if (selectedFile && restorePhase !== 'loading') {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(248,113,113,0.10)';
                                b.style.boxShadow  = '0 4px 16px rgba(248,113,113,0.18)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (selectedFile && restorePhase !== 'loading') {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'transparent';
                                b.style.boxShadow  = 'none';
                            }
                        }}
                        onMouseDown={e => { if (selectedFile) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    >
                        {restorePhase === 'loading' ? (
                            <>
                                <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>◌</span>
                                Restaurando…
                            </>
                        ) : (
                            <>⬆ Restaurar Sistema</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Keyframes ────────────────────────────────────────── */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }

                /* Entrada suave de las cards desde abajo */
                @keyframes sys-slide-up {
                    from {
                        opacity:   0;
                        transform: translateY(20px) scale(0.98);
                    }
                    to {
                        opacity:   1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Items de contenido: entran deslizando desde la izquierda */
                @keyframes stagger-in {
                    from { opacity: 0; transform: translateX(-10px); }
                    to   { opacity: 1; transform: translateX(0); }
                }

                /* Shimmer sweep del botón de descarga */
                @keyframes shimmer-sweep {
                    from { transform: translateX(-120%); }
                    to   { transform: translateX(300%); }
                }
            `}</style>

            {/* ── Modal de confirmación ─────────────────────────────── */}
            {confirmOpen && (
                <ConfirmRestoreModal
                    fileName={selectedFile?.name ?? ''}
                    onConfirm={handleRestore}
                    onCancel={() => setConfirmOpen(false)}
                />
            )}
        </div>
    );
}

// ── Modal de confirmación ─────────────────────────────────────────────────────

function ConfirmRestoreModal({
    fileName, onConfirm, onCancel,
}: {
    fileName: string;
    onConfirm: () => void;
    onCancel: () => void;
}): JSX.Element {
    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onCancel}
                style={{
                    position:             'fixed',
                    inset:                0,
                    zIndex:               9998,
                    background:           'rgba(0,0,0,0.60)',
                    backdropFilter:       'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    animation:            'fadeIn 0.18s ease both',
                }}
            />
            {/* Modal centrado */}
            <div style={{
                position:       'fixed',
                inset:          0,
                zIndex:         9999,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '16px',
                pointerEvents:  'none',
            }}>
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        pointerEvents: 'auto',
                        width:         'min(480px, 100%)',
                        background:    'var(--bg-surface)',
                        borderTop:     '2px solid var(--accent-danger)',
                        border:        '1px solid var(--border-default)',
                        borderRadius:  '14px',
                        boxShadow:     'var(--shadow-xl)',
                        padding:       '28px',
                        animation:     'fadeInUp 0.22s cubic-bezier(0.23, 1, 0.32, 1) both',
                    }}
                >
                    {/* Icono de peligro */}
                    <div style={{
                        width:          '48px',
                        height:         '48px',
                        borderRadius:   '12px',
                        background:     'var(--accent-danger-glow)',
                        border:         '1px solid var(--accent-danger)',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        fontSize:       '22px',
                        marginBottom:   '16px',
                    }}>
                        ⚠
                    </div>

                    <div style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '15px',
                        fontWeight:    700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:         'var(--text-primary)',
                        marginBottom:  '10px',
                    }}>
                        ¿Confirmar Restauración?
                    </div>

                    <p style={{
                        fontFamily:    'var(--font-body)',
                        fontSize:      '13px',
                        color:         'var(--text-secondary)',
                        lineHeight:    1.7,
                        margin:        '0 0 16px',
                    }}>
                        Estás a punto de restaurar el sistema con el archivo{' '}
                        <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {fileName}
                        </strong>.
                        {' '}Todos los datos actuales serán eliminados de forma permanente.
                    </p>

                    {/* Advertencia adicional */}
                    <div style={{
                        background:   'rgba(248,113,113,0.07)',
                        border:       '1px solid rgba(248,113,113,0.22)',
                        borderRadius: '7px',
                        padding:      '10px 14px',
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '10px',
                        color:        'var(--accent-danger)',
                        letterSpacing:'0.04em',
                        marginBottom: '22px',
                        lineHeight:   1.6,
                    }}>
                        Esta acción no se puede deshacer. El sistema verificará que el backup
                        contenga un administrador antes de proceder.
                    </div>

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                flex:          1,
                                padding:       '10px',
                                background:    'transparent',
                                color:         'var(--text-secondary)',
                                border:        '1px solid var(--border-default)',
                                borderRadius:  'var(--radius-base)',
                                fontFamily:    'var(--font-display)',
                                fontSize:      '11px',
                                fontWeight:    700,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                cursor:        'pointer',
                                transition:    'all 160ms ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; }}
                            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                flex:          1,
                                padding:       '10px',
                                background:    'var(--accent-danger)',
                                color:         '#fff',
                                border:        'none',
                                borderRadius:  'var(--radius-base)',
                                fontFamily:    'var(--font-display)',
                                fontSize:      '11px',
                                fontWeight:    700,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                cursor:        'pointer',
                                transition:    'all 160ms ease',
                                boxShadow:     '0 4px 14px rgba(248,113,113,0.30)',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                        >
                            Sí, Restaurar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
