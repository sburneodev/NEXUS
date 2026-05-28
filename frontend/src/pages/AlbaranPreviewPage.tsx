/**
 * AlbaranPreviewPage — página temporal de previsualización.
 * Ruta pública: /albaran-preview (sin auth requerida).
 * Eliminar cuando ya no se necesite.
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
        tagline:   'ERP · LEVELUP',
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
        <div style={{
            minHeight:  '100vh',
            background: '#d0d5dd',
            padding:    '32px 16px',
            display:    'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap:        '16px',
        }}>
            {/* Barra de acciones */}
            <div style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '12px',
                background:   '#1a2b4c',
                color:        '#fff',
                padding:      '10px 20px',
                borderRadius: '8px',
                width:        '210mm',
                maxWidth:     '100%',
                boxSizing:    'border-box',
                fontFamily:   'Inter, Helvetica, Arial, sans-serif',
                fontSize:     '12px',
            }}>
                <span style={{ fontWeight: 700, letterSpacing: '0.1em', flex: 1 }}>
                    NEXUS ERP — Previsualización de Albarán
                </span>
                <button
                    onClick={() => window.print()}
                    style={{
                        background:    '#ffffff22',
                        border:        '1px solid #ffffff44',
                        color:         '#fff',
                        padding:       '6px 16px',
                        borderRadius:  '4px',
                        cursor:        'pointer',
                        fontSize:      '11px',
                        fontWeight:    700,
                        letterSpacing: '0.08em',
                    }}
                >
                    🖨 IMPRIMIR
                </button>
            </div>

            {/* Documento A4 */}
            <AlbaranTemplate data={DEMO_DATA} />
        </div>
    );
}
