/**
 * AlbaranPreviewPage — página de previsualización de albarán.
 * Ruta pública: /albaran-preview (sin auth requerida).
 * Fondo dark NEXUS, barra de herramientas con el design system.
 */

import { AlbaranTemplate } from '../components/albaran/AlbaranTemplate';

const DEMO_DATA = {
    numero:           'ALB-2025-0042',
    tipo:             'ENTRADA' as const,
    fecha:            '2025-05-28',
    referenciaPedido: 'PED-2025-0017',
    almacen:          'Almacén Central — Zona A',
    transportista:    'MRW Logística',
    matricula:        '1234 ABC',
    notas:            'Pedido urgente. Revisar estado del embalaje antes de firmar el albarán. Conservar en lugar seco.',
    empresa: {
        markUrl:   '/nexus-mark.svg',
        brandName: 'NEXUS',
        tagline:   'ERP · LEVELUP ARCADE',
        nombre:    'NEXUS Distribución S.L.',
        nif:       'B-12345678',
        direccion: 'C/ Tecnología 14, Nave 3 — 28001 Madrid',
        telefono:  '+34 91 000 00 00',
        email:     'operaciones@nexus-erp.com',
    },
    entidad: {
        nombre:    'RetroGames Import S.A.',
        nif:       'A-87654321',
        direccion: 'Polígono Industrial Norte, Calle 5 — 08040 Barcelona',
        contacto:  'Marta Soler',
        telefono:  '+34 93 000 00 00',
        email:     'pedidos@retrogames-import.es',
    },
    lineas: [
        { codigo: 'NES-SMB3-CIB',    descripcion: 'Super Mario Bros 3 — NES (CIB)',              cantidad: 2,  unidad: 'uds.', observaciones: 'Caja con desgaste leve'    },
        { codigo: 'SNES-ZELDA-MINT',  descripcion: 'The Legend of Zelda: ALTTP — SNES (MINT)',   cantidad: 1,  unidad: 'uds.'                                              },
        { codigo: 'MD-SF2-LOOSE',     descripcion: 'Street Fighter II — Mega Drive (LOOSE)',      cantidad: 4,  unidad: 'uds.', observaciones: 'Sin caja ni manual'        },
        { codigo: 'GB-TETRIS-CIB',    descripcion: 'Tetris — Game Boy (CIB)',                    cantidad: 3,  unidad: 'uds.'                                              },
        { codigo: 'PSX-FFVII-CIB',    descripcion: 'Final Fantasy VII — PlayStation (CIB)',      cantidad: 1,  unidad: 'uds.', observaciones: 'Comprobar disco 3'         },
        { codigo: 'N64-MARIO64-CIB',  descripcion: 'Super Mario 64 — Nintendo 64 (CIB)',         cantidad: 2,  unidad: 'uds.'                                              },
        { codigo: 'GBA-POKEMON-MINT', descripcion: 'Pokémon FireRed — GBA (MINT precintado)',    cantidad: 1,  unidad: 'uds.'                                              },
    ],
};

export function AlbaranPreviewPage(): JSX.Element {
    return (
        <>
            <style>{`
                @media print {
                    .ap-toolbar { display: none !important; }
                    body { background: white !important; }
                }
                /* Ocultar la app en impresión — mostrar solo el documento */
                @media print { #root { display: none !important; } }
            `}</style>

            <div style={{
                minHeight:        '100dvh',
                /* Fondo NEXUS dark: halo azul + retícula de puntos */
                backgroundColor:  '#0D1117',
                backgroundImage: [
                    'radial-gradient(ellipse 140% 70% at 50% -10%, rgba(59,130,246,0.20) 0%, transparent 55%)',
                    'radial-gradient(ellipse 60% 40% at 95% 92%,   rgba(56,189,248,0.10) 0%, transparent 50%)',
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 0)',
                ].join(', '),
                backgroundSize:   '100% 100%, 100% 100%, 26px 26px',
                backgroundAttachment: 'fixed',
                padding:          '32px 16px 48px',
                display:          'flex',
                flexDirection:    'column',
                alignItems:       'center',
                gap:              '20px',
            }}>

                {/* ── Barra de herramientas NEXUS ─────────────────────── */}
                <div
                    className="ap-toolbar"
                    style={{
                        display:     'flex',
                        alignItems:  'center',
                        gap:         '12px',
                        /* Card NEXUS */
                        background:  '#1C2128',
                        borderTop:   '2px solid #3B82F6',
                        borderLeft:  '1px solid rgba(255,255,255,0.13)',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        borderBottom:'1px solid rgba(255,255,255,0.05)',
                        borderRadius:'10px',
                        boxShadow:   '0 4px 28px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.07) inset',
                        padding:     '12px 20px',
                        width:       '210mm',
                        maxWidth:    '100%',
                        boxSizing:   'border-box',
                    }}
                >
                    {/* Logo + título */}
                    <img
                        src="/nexus-mark.svg"
                        alt="NEXUS"
                        style={{ height: '28px', width: 'auto', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontFamily:    'var(--font-display, Inter, sans-serif)',
                            fontSize:      '12px',
                            fontWeight:    700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color:         '#F0F6FC',
                            lineHeight:    1.2,
                        }}>
                            NEXUS ERP
                        </div>
                        <div style={{
                            fontFamily:    'var(--font-mono, monospace)',
                            fontSize:      '9px',
                            color:         '#8B949E',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            marginTop:     '1px',
                        }}>
                            Previsualización de Albarán
                        </div>
                    </div>

                    {/* Botón imprimir */}
                    <button
                        onClick={() => window.print()}
                        style={{
                            background:    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                            border:        'none',
                            color:         '#fff',
                            padding:       '8px 18px',
                            borderRadius:  '6px',
                            cursor:        'pointer',
                            fontFamily:    'var(--font-display, Inter, sans-serif)',
                            fontSize:      '11px',
                            fontWeight:    700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            boxShadow:     '0 2px 10px rgba(37,99,235,0.35)',
                            flexShrink:    0,
                            transition:    'opacity 160ms ease, transform 120ms ease',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                        }}
                    >
                        🖨 IMPRIMIR
                    </button>
                </div>

                {/* ── Documento A4 ───────────────────────────────────── */}
                <AlbaranTemplate data={DEMO_DATA} />
            </div>
        </>
    );
}
