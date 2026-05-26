/**
 * hooks/useTheme.ts v2
 *
 * Gestiona 3 temas: 'dark' | 'light' | 'retro'
 * - dark  → sin clase en <html>
 * - light → clase .theme-light
 * - retro → clase .theme-retro  (activo automáticamente en /boveda)
 *
 * Persiste en localStorage. El tema 'retro' se activa/desactiva
 * automáticamente según la ruta, sin interferir con la preferencia
 * dark/light del usuario.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'dark' | 'light' | 'retro';

const STORAGE_KEY = 'nexus_theme';

function applyTheme(theme: Theme): void {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-retro');
    if (theme === 'light')  html.classList.add('theme-light');
    if (theme === 'retro')  html.classList.add('theme-retro');
}

function getStoredTheme(): 'dark' | 'light' {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light') return 'light';
    return 'dark';
}

interface UseThemeReturn {
    /** Tema activo actualmente ('dark' | 'light' | 'retro') */
    theme:    Theme;
    /** Preferencia del usuario sin contar retro ('dark' | 'light') */
    userTheme:'dark' | 'light';
    /** Alterna entre dark y light (no toca retro) */
    toggle:   () => void;
    isDark:   boolean;
    isRetro:  boolean;
}

export function useTheme(): UseThemeReturn {
    const location                     = useLocation();
    const [userTheme, setUserTheme]    = useState<'dark' | 'light'>(getStoredTheme);
    const isBovedaRoute                = location.pathname.startsWith('/boveda');

    // Tema efectivo: retro en /boveda, si no la preferencia del usuario
    const theme: Theme = isBovedaRoute ? 'retro' : userTheme;

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggle = useCallback((): void => {
        setUserTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return {
        theme,
        userTheme,
        toggle,
        isDark:  theme === 'dark',
        isRetro: theme === 'retro',
    };
}