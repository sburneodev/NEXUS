/**
 * hooks/useTheme.ts v3
 *
 * Gestiona 2 temas: 'dark' | 'light'
 * Persiste en localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'nexus_theme';

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

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggle = useCallback((): void => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return { theme, toggle, isDark: theme === 'dark' };
}