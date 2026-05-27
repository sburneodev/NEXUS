/**
 * hooks/useTableFilters.ts — SUFP v2
 * Sistema Universal de Filtrado y Paginación
 *
 * Centraliza: search (debounce 300 ms) · limit · page · sort
 *
 * Reglas de búsqueda:
 *   · '' → limpieza inmediata, muestra lista completa
 *   · cualquier carácter → debounce de `debounceMs` ms antes de comprometer el valor
 *   · campo limpiado → cancelación inmediata del timer, limpieza instantánea
 *
 * Persistencia: limit y sort se guardan en sessionStorage por `key` de página,
 * de modo que al volver a la sección la tabla mantiene el formato elegido.
 *
 * Uso:
 *   const filters = useTableFilters({ key: 'productos', initialLimit: 20 });
 *   // En useEffect: depende de filters.querySignal
 *   // En el render: pasa `filters` a <TableControls />
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface SortConfig {
    field:     string;
    direction: 'asc' | 'desc';
}

export interface TableFiltersConfig {
    /** Clave única para sessionStorage — ej. 'productos', 'clientes', 'stock' */
    key:              string;
    /** Filas por página por defecto (default: 20) */
    initialLimit?:    number;
    /** Ordenación inicial */
    initialSort?:     SortConfig;
    /** Debounce en ms (default: 300) */
    debounceMs?:      number;
    /**
     * Nombre del parámetro de búsqueda en la URL.
     * Default: 'buscar' (estándar NEXUS).
     * Usa 'search' solo si el endpoint legacy lo requiere explícitamente.
     */
    searchParamName?: string;
}

export interface UseTableFiltersReturn {
    // ── Estado del input ──────────────────────────────────────────────────────
    /** Valor bruto del <input> de búsqueda — sin debounce — controla el input */
    searchInput:  string;
    /** Búsqueda validada que se envía al backend:
     *  · '' si searchInput está vacío
     *  · searchInput.trim() una vez transcurrido el debounce             */
    search:       string;
    limit:        number;
    page:         number;           // 0-indexed (compatible Spring Pageable)
    sort:         SortConfig | null;
    /** true mientras el debounce está corriendo */
    isDebouncing: boolean;

    // ── Paginación (se actualiza con setPagination tras cada respuesta API) ───
    totalItems:   number;
    totalPages:   number;

    // ── Señal para el useEffect de fetching ───────────────────────────────────
    /**
     * String serializado que cambia únicamente cuando un valor "comprometido"
     * cambia: search (post-debounce), limit, page o sort.
     * Úsalo como única dependencia de tu useEffect de carga de datos.
     *
     * @example
     *   useEffect(() => { fetchData(); }, [filters.querySignal]);
     */
    querySignal:  string;

    // ── Setters ───────────────────────────────────────────────────────────────
    /** Actualiza el input y gestiona debounce automáticamente */
    setSearchInput: (value: string)    => void;
    /** Cambia el límite de filas y resetea la página a 0 */
    setLimit:       (limit: number)    => void;
    /** Navega a una página concreta */
    setPage:        (page: number)     => void;
    /** Cambia la ordenación y resetea la página a 0 */
    setSort:        (sort: SortConfig) => void;
    /** Llamar con los datos de PaginatedResponse<T> tras recibir la respuesta */
    setPagination:  (totalElements: number, totalPages: number) => void;
    /** Resetea todos los filtros a su estado inicial */
    reset:          () => void;
    /** Construye URLSearchParams listo para concatenar al endpoint GET */
    buildParams:    () => URLSearchParams;
}

// ── SessionStorage helpers ────────────────────────────────────────────────────

interface PersistedState {
    limit: number;
    sort:  SortConfig | null;
}

const ssKey = (k: string): string => `nexus_table_${k}`;

function loadPersisted(key: string, defaultLimit: number): PersistedState {
    try {
        const raw = sessionStorage.getItem(ssKey(key));
        if (!raw) return { limit: defaultLimit, sort: null };
        const p = JSON.parse(raw) as Partial<PersistedState>;
        return {
            limit: typeof p.limit === 'number' ? p.limit : defaultLimit,
            sort:  p.sort ?? null,
        };
    } catch {
        return { limit: defaultLimit, sort: null };
    }
}

function savePersisted(key: string, state: PersistedState): void {
    try {
        sessionStorage.setItem(ssKey(key), JSON.stringify(state));
    } catch {
        // sessionStorage puede fallar en modo privado o con storage lleno — ignoramos
    }
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useTableFilters({
    key,
    initialLimit    = 20,
    initialSort,
    debounceMs      = 300,
    searchParamName = 'buscar',
}: TableFiltersConfig): UseTableFiltersReturn {

    // Carga el estado persistido una única vez (ref evita re-renders)
    const persisted = useRef(loadPersisted(key, initialLimit));

    // ── Estado ─────────────────────────────────────────────────────────────────
    const [searchInput,  setSearchInputRaw] = useState('');
    const [search,       setSearch]         = useState('');
    const [limit,        setLimitState]     = useState(persisted.current.limit);
    const [page,         setPageState]      = useState(0);
    const [sort,         setSortState]      = useState<SortConfig | null>(
        persisted.current.sort ?? initialSort ?? null
    );
    const [isDebouncing, setIsDebouncing]   = useState(false);
    const [totalItems,   setTotalItemsState] = useState(0);
    const [totalPages,   setTotalPagesState] = useState(0);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Persistir limit y sort cuando cambien ────────────────────────────────
    useEffect(() => {
        savePersisted(key, { limit, sort });
    }, [key, limit, sort]);

    // ── setSearchInput: debounce desde el primer carácter ────────────────────
    const setSearchInput = useCallback((value: string): void => {
        setSearchInputRaw(value);

        // Cancelar el timer anterior antes de cualquier decisión
        if (debounceRef.current) clearTimeout(debounceRef.current);

        // Campo vacío → limpieza inmediata, muestra lista completa
        if (value === '') {
            setIsDebouncing(false);
            setSearch('');
            setPageState(0);
            return;
        }

        // Cualquier carácter → debounce
        setIsDebouncing(true);
        debounceRef.current = setTimeout((): void => {
            setSearch(value.trim());
            setPageState(0);
            setIsDebouncing(false);
        }, debounceMs);
    }, [debounceMs]);

    // ── setLimit: resetea página y persiste ───────────────────────────────────
    const setLimit = useCallback((newLimit: number): void => {
        setLimitState(newLimit);
        setPageState(0);
    }, []);

    // ── setPage ───────────────────────────────────────────────────────────────
    const setPage = useCallback((newPage: number): void => {
        setPageState(newPage);
    }, []);

    // ── setSort: resetea página ───────────────────────────────────────────────
    const setSort = useCallback((newSort: SortConfig): void => {
        setSortState(newSort);
        setPageState(0);
    }, []);

    // ── setPagination: llamar tras recibir PaginatedResponse del backend ──────
    const setPagination = useCallback((total: number, pages: number): void => {
        setTotalItemsState(total);
        setTotalPagesState(pages);
    }, []);

    // ── reset: vuelve al estado inicial ───────────────────────────────────────
    const reset = useCallback((): void => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setSearchInputRaw('');
        setSearch('');
        setLimitState(initialLimit);
        setPageState(0);
        setSortState(initialSort ?? null);
        setIsDebouncing(false);
    }, [initialLimit, initialSort]);

    // ── buildParams: construye URLSearchParams para el endpoint ───────────────
    const buildParams = useCallback((): URLSearchParams => {
        const p = new URLSearchParams();
        p.set('page', String(page));
        p.set('size', String(limit));
        if (search) p.set(searchParamName, search);
        if (sort)   p.set('sort', `${sort.field},${sort.direction}`);
        return p;
    }, [page, limit, search, sort, searchParamName]);

    // ── querySignal: string serializado estable para useEffect ────────────────
    // Cambia única y exclusivamente cuando un valor "comprometido" cambia.
    const querySignal = useMemo(
        () => [search, limit, page, sort?.field ?? '', sort?.direction ?? ''].join('§'),
        [search, limit, page, sort]
    );

    // ── Cleanup del timer al desmontar ────────────────────────────────────────
    useEffect(() => (): void => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    return {
        searchInput,
        search,
        limit,
        page,
        sort,
        isDebouncing,
        totalItems,
        totalPages,
        querySignal,
        setSearchInput,
        setLimit,
        setPage,
        setSort,
        setPagination,
        reset,
        buildParams,
    };
}
