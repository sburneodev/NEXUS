import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface AiPanelContextValue {
    isOpen: boolean;
    toggle: () => void;
    open:   () => void;
    close:  () => void;
}

const AiPanelContext = createContext<AiPanelContextValue | null>(null);

export function AiPanelProvider({ children }: { children: ReactNode }): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const open   = useCallback(() => setIsOpen(true),  []);
    const close  = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(v => !v), []);

    return (
        <AiPanelContext.Provider value={{ isOpen, toggle, open, close }}>
            {children}
        </AiPanelContext.Provider>
    );
}

export function useAiPanel(): AiPanelContextValue {
    const ctx = useContext(AiPanelContext);
    if (!ctx) throw new Error('useAiPanel must be inside <AiPanelProvider>');
    return ctx;
}
