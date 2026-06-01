import { useState, useEffect } from 'react';

export function useBreakpoint(breakpoint = 768, tabletBreakpoint = 1024) {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );
    const [isTablet, setIsTablet] = useState(
        typeof window !== 'undefined'
            ? window.innerWidth >= breakpoint && window.innerWidth < tabletBreakpoint
            : false
    );

    useEffect(() => {
        const handler = () => {
            setIsMobile(window.innerWidth < breakpoint);
            setIsTablet(window.innerWidth >= breakpoint && window.innerWidth < tabletBreakpoint);
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [breakpoint, tabletBreakpoint]);

    return { isMobile, isTablet };
}