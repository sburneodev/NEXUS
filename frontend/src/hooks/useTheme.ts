/**
 * hooks/useTheme.ts v4
 *
 * Gestiona 2 temas: 'dark' | 'light'
 * Persiste en localStorage.
 *
 * Fix v4: cada instancia del hook escucha un CustomEvent global,
 * de modo que cuando cualquier componente hace toggle() todos los
 * demás se re-renderizan inmediatamente (incluyendo los inline styles
 * basados en isDark, que useState local no propagaba antes).
 */

import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY    = 'nexus_theme';
const THEME_EVENT    = 'nexus:theme-change';

function applyTheme(theme: Theme): void {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-retro');
    if (theme === 'light') html.classList.add('theme-light');
}

function getStoredTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light') return 'light';
    return 'dark';
}

interface UseThemeReturn {
    theme:  Theme;
    toggle: () => void;
    isDark: boolean;
}

export function useTheme(): UseThemeReturn {
    const [theme, setTheme] = useState<Theme>(getStoredTheme);

    // Aplica la clase al <html> cada vez que cambia el tema
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Escucha cambios emitidos por otras instancias del hook
    useEffect(() => {
        const handler = (e: Event): void => {
            const next = (e as CustomEvent<Theme>).detail;
            setTheme(next);
        };
        window.addEventListener(THEME_EVENT, handler);
        return () => window.removeEventListener(THEME_EVENT, handler);
    }, []);

    const toggle = useCallback((): void => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, next);
            // Notifica a todos los demás useTheme del árbol de componentes
            window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: next }));
            return next;
        });
    }, []);

    return { theme, toggle, isDark: theme === 'dark' };
}