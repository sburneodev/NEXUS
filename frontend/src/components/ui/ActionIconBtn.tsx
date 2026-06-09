/**
 * ActionIconBtn — Botón de acción minimalista, solo icono.
 *
 * Uso: <ActionIconBtn icon={Pencil} color="cyan" title="Editar" onClick={...} />
 */

import { type LucideIcon } from 'lucide-react';

const COLORS = {
    primary: {
        text:        'var(--accent-primary)',
        border:      'rgba(59,130,246,0.28)',
        bg:          'transparent',
        bgHover:     'rgba(59,130,246,0.12)',
        borderHover: 'rgba(59,130,246,0.55)',
    },
    cyan: {
        text:        'var(--accent-cyan)',
        border:      'rgba(56,189,248,0.28)',
        bg:          'transparent',
        bgHover:     'rgba(56,189,248,0.12)',
        borderHover: 'rgba(56,189,248,0.55)',
    },
    gold: {
        text:        'var(--accent-gold)',
        border:      'rgba(251,191,36,0.28)',
        bg:          'transparent',
        bgHover:     'rgba(251,191,36,0.12)',
        borderHover: 'rgba(251,191,36,0.55)',
    },
    danger: {
        text:        '#f87171',
        border:      'rgba(248,113,113,0.22)',
        bg:          'transparent',
        bgHover:     'rgba(248,113,113,0.11)',
        borderHover: 'rgba(248,113,113,0.50)',
    },
} as const;

interface ActionIconBtnProps {
    icon:      LucideIcon;
    color:     keyof typeof COLORS;
    title:     string;
    onClick:   (e: React.MouseEvent) => void;
    disabled?: boolean;
}

export function ActionIconBtn({ icon: Icon, color, title, onClick, disabled = false }: ActionIconBtnProps) {
    const c = COLORS[color];

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            style={{
                display:        'inline-flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          '30px',
                height:         '30px',
                padding:        '0',
                background:     c.bg,
                color:          c.text,
                border:         `1px solid ${c.border}`,
                borderRadius:   '7px',
                cursor:         disabled ? 'not-allowed' : 'pointer',
                opacity:        disabled ? 0.35 : 1,
                transition:     'background 130ms ease, border-color 130ms ease, transform 90ms ease, color 130ms ease',
                flexShrink:     0,
            }}
            onMouseEnter={e => {
                if (disabled) return;
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background   = c.bgHover;
                b.style.borderColor  = c.borderHover;
            }}
            onMouseLeave={e => {
                if (disabled) return;
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background  = c.bg;
                b.style.borderColor = c.border;
            }}
            onMouseDown={e => {
                if (disabled) return;
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)';
            }}
            onMouseUp={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
        >
            <Icon size={14} strokeWidth={1.8} />
        </button>
    );
}
