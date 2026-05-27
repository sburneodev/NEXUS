/**
 * hooks/useTableFilters.ts — SUFP v4
 * Sistema Universal de Filtrado y Paginación
 *
 * ── Por qué useReducer ────────────────────────────────────────────────────────
 *
 * Versiones anteriores usaban múltiples useState independientes.
 * El problema: cuando el debounce se resolvía, se disparaban varios setState
 * en efectos separados (setDebouncedSearch + setPageState(0)), lo que producía
 * DOS renders con DOS querySignals diferentes → DOS peticiones API → flicker.
 *
 * Con useReducer, un único dispatch (COMMIT_SEARCH) actualiza debouncedSearch
 * Y page=0 de forma ATÓMICA en un solo render → querySignal cambia UNA vez
 * → UNA petición API → UI fluida.  Funciona en React 17 y 18.
 *
 * ── Flujo garantizado ─────────────────────────────────────────────────────────
 *
 *   Escribir "hola":
 *     tecla 'h'  → dispatch SET_INPUT   → 1 render (querySignal sin cambiar)
 *     tecla 'o'  → dispatch SET_INPUT   → 1 render (querySignal sin cambiar)
 *     tecla 'l'  → …
 *     tecla 'a'  → dispatch SET_INPUT   → 1 render
 *     [300ms]    → dispatch COMMIT_SEARCH → 1 render atómico:
 *                    debouncedSearch='hola' + page=0 → querySignal cambia ONCE
 *                    → useEffect en la página → 1 petición API → UI fluida ✓
 *
 *   Limpiar búsqueda:
 *     → dispatch SET_INPUT('') → 1 render atómico:
 *          searchInput='' + debouncedSearch='' + page=0 → querySignal cambia ONCE
 *          → 1 petición API ✓
 *
 * ── Persistencia ──────────────────────────────────────────────────────────────
 *
 *   limit, sort, page y debouncedSearch se guardan en sessionStorage por `key`.
 *
 * ── Uso ───────────────────────────────────────────────────────────────────────
 *
 *   const filters = useTableFilters({ key: 'productos', initialLimit: calculateAutoLimit() });
 *   useEffect(() => { fetchData(); }, [filters.querySignal, filterTipo, refreshTick]);
 */

import { useReducer, useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ── useDebounce (utilidad exportada) ──────────────────────────────────────────
/**
 * Retrasa la propagación de `value` durante `delayMs` ms.
 * El timer se reinicia con cada cambio de `value`.
 * Nota: useTableFilters usa su propia lógica de debounce (basada en useReducer)
 * para garantizar actualizaciones atómicas. Este hook se exporta como utilidad
 * para uso en otros componentes.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState<T>(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs]);
    return debounced;
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface SortConfig {
    field:     string;
    direction: 'asc' | 'desc';
}

export interface TableFiltersConfig {
    /** Clave única para sessionStorage — ej. 'productos', 'clientes' */
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
     */
    searchParamName?: string;
}

export interface UseTableFiltersReturn {
    /** Valor bruto del <input> de búsqueda — sin debounce */
    searchInput:    string;
    /**
     * Búsqueda comprometida (post-debounce) que se envía al backend.
     * '' si el input está vacío; searchInput.trim() tras el debounce.
     */
    search:         string;
    limit:          number;
    page:           number;           // 0-indexed (compatible Spring Pageable)
    sort:           SortConfig | null;
    /** true mientras el debounce está corriendo */
    isDebouncing:   boolean;
    totalItems:     number;
    totalPages:     number;
    /**
     * Señal estable para useEffect. Cambia SOLO cuando un valor comprometido
     * cambia (debouncedSearch, limit, page, sort). NUNCA con el input crudo.
     * @example
     *   useEffect(() => { fetchData(); }, [filters.querySignal, filterTipo]);
     */
    querySignal:    string;
    setSearchInput: (value: string)    => void;
    setLimit:       (limit: number)    => void;
    setPage:        (page: number)     => void;
    setSort:        (sort: SortConfig) => void;
    setPagination:  (total: number, pages: number) => void;
    reset:          () => void;
    buildParams:    () => URLSearchParams;
}

// ── SessionStorage ────────────────────────────────────────────────────────────

interface PersistedState {
    limit:  number;
    sort:   SortConfig | null;
    page:   number;
    search: string;
}

const ssKey = (k: string): string => `nexus_table_${k}`;

function loadPersisted(key: string, defaultLimit: number): PersistedState {
    try {
        const raw = sessionStorage.getItem(ssKey(key));
        if (!raw) return { limit: defaultLimit, sort: null, page: 0, search: '' };
        const p = JSON.parse(raw) as Partial<PersistedState>;
        return {
            limit:  typeof p.limit  === 'number' ? p.limit  : defaultLimit,
            sort:   p.sort  ?? null,
            page:   typeof p.page   === 'number' ? p.page   : 0,
            search: typeof p.search === 'string' ? p.search : '',
        };
    } catch {
        return { limit: defaultLimit, sort: null, page: 0, search: '' };
    }
}

function savePersisted(key: string, state: PersistedState): void {
    try {
        sessionStorage.setItem(ssKey(key), JSON.stringify(state));
    } catch { /* modo privado / storage lleno — ignoramos */ }
}

// ── calculateAutoLimit ────────────────────────────────────────────────────────
/**
 * Calcula el número óptimo de filas por página para llenar la pantalla
 * sin hacer scroll hasta el botón flotante de la IA.
 *
 * @param rowPx      Altura de cada fila en px (default 41)
 * @param reservedPx Espacio reservado para cabecera + controles + paginación (default 320)
 */
export function calculateAutoLimit(rowPx = 41, reservedPx = 320): number {
    if (typeof window === 'undefined') return 20;
    const rows = Math.floor((window.innerHeight - reservedPx) / rowPx);
    if (rows >= 45) return 50;
    if (rows >= 17) return 20;
    return 10;
}

// ── Reducer ───────────────────────────────────────────────────────────────────
/**
 * Estado mutable de filtros.
 * Toda operación que requiera cambiar más de un campo usa una acción atómica
 * para garantizar que React produzca UN SOLO render por operación.
 */
interface FilterState {
    searchInput:     string;
    debouncedSearch: string;
    limit:           number;
    page:            number;
    sort:            SortConfig | null;
}

type FilterAction =
    | { type: 'SET_INPUT';     value: string                                         }
    | { type: 'COMMIT_SEARCH'; value: string                                         }
    | { type: 'SET_LIMIT';     limit: number                                         }
    | { type: 'SET_PAGE';      page:  number                                         }
    | { type: 'SET_SORT';      sort:  SortConfig                                     }
    | { type: 'RESET';         initialLimit: number; initialSort: SortConfig | null  };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
    switch (action.type) {

        // ── SET_INPUT ──────────────────────────────────────────────────────────
        // Input vacío: LIMPIEZA ATÓMICA — searchInput + debouncedSearch + page=0
        //   en un solo dispatch → querySignal cambia una vez → 1 petición API.
        // Input no vacío: solo actualiza searchInput (el debounce hará el resto).
        case 'SET_INPUT': {
            if (action.value === '') {
                // No-op si ya está limpio
                if (state.searchInput === '' && state.debouncedSearch === '') return state;
                return { ...state, searchInput: '', debouncedSearch: '', page: 0 };
            }
            if (state.searchInput === action.value) return state;
            return { ...state, searchInput: action.value };
        }

        // ── COMMIT_SEARCH ──────────────────────────────────────────────────────
        // Llamado por el timeout del debounce. Actualiza debouncedSearch + page=0
        // ATÓMICAMENTE en un solo render → querySignal cambia una sola vez.
        // No-op si el valor no cambió (evita reset de página innecesario en
        // el primer render y en React StrictMode double-invocation).
        case 'COMMIT_SEARCH': {
            if (state.debouncedSearch === action.value) return state;
            return { ...state, debouncedSearch: action.value, page: 0 };
        }

        // ── SET_LIMIT ──────────────────────────────────────────────────────────
        // Atómico: limit + page=0 en un solo render.
        case 'SET_LIMIT': {
            if (state.limit === action.limit) return state;
            return { ...state, limit: action.limit, page: 0 };
        }

        // ── SET_PAGE ───────────────────────────────────────────────────────────
        case 'SET_PAGE': {
            if (state.page === action.page) return state;
            return { ...state, page: action.page };
        }

        // ── SET_SORT ───────────────────────────────────────────────────────────
        // Atómico: sort + page=0 en un solo render.
        case 'SET_SORT': {
            return { ...state, sort: action.sort, page: 0 };
        }

        // ── RESET ──────────────────────────────────────────────────────────────
        case 'RESET': {
            return {
                searchInput:     '',
                debouncedSearch: '',
                limit:           action.initialLimit,
                page:            0,
                sort:            action.initialSort,
            };
        }

        default:
            return state;
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

    // Estado persistido (leído una sola vez en el ref para evitar re-renders)
    const persisted = useRef(loadPersisted(key, initialLimit));

    // ── Reducer: estado principal de filtros ───────────────────────────────────
    const [state, dispatch] = useReducer(filterReducer, {
        searchInput:     persisted.current.search,
        debouncedSearch: persisted.current.search,
        limit:           persisted.current.limit,
        page:            persisted.current.page,
        sort:            persisted.current.sort ?? initialSort ?? null,
    });

    const { searchInput, debouncedSearch, limit, page, sort } = state;

    // ── Totales de paginación (no forman parte del querySignal) ───────────────
    const [totalItems,  setTotalItemsState] = useState(0);
    const [totalPages,  setTotalPagesState] = useState(0);

    // ── isDebouncing: derivado puro, no es estado ─────────────────────────────
    // true entre la primera tecla y la resolución del debounce.
    const isDebouncing = searchInput.trim() !== debouncedSearch;

    // ── Timer de debounce ─────────────────────────────────────────────────────
    // El input vacío ya fue manejado atómicamente en SET_INPUT → no necesita timer.
    // La limpieza del efecto cancela el timer anterior al cambiar searchInput,
    // garantizando un solo COMMIT_SEARCH por ráfaga de teclas.
    useEffect(() => {
        if (searchInput === '') return;
        const id = setTimeout(() => {
            dispatch({ type: 'COMMIT_SEARCH', value: searchInput.trim() });
        }, debounceMs);
        return () => clearTimeout(id);
    }, [searchInput, debounceMs]);

    // ── Persistencia ──────────────────────────────────────────────────────────
    useEffect(() => {
        savePersisted(key, { limit, sort, page, search: debouncedSearch });
    }, [key, limit, sort, page, debouncedSearch]);

    // ── Setters (todos delegan al reducer) ────────────────────────────────────

    const setSearchInput = useCallback((value: string): void => {
        dispatch({ type: 'SET_INPUT', value });
    }, []);

    const setLimit = useCallback((newLimit: number): void => {
        dispatch({ type: 'SET_LIMIT', limit: newLimit });
    }, []);

    const setPage = useCallback((newPage: number): void => {
        dispatch({ type: 'SET_PAGE', page: newPage });
    }, []);

    const setSort = useCallback((newSort: SortConfig): void => {
        dispatch({ type: 'SET_SORT', sort: newSort });
    }, []);

    // setPagination está fuera del reducer: actualiza totales que no afectan
    // querySignal y no deben provocar refetch.
    const setPagination = useCallback((total: number, pages: number): void => {
        setTotalItemsState(total);
        setTotalPagesState(pages);
    }, []);

    const reset = useCallback((): void => {
        dispatch({ type: 'RESET', initialLimit, initialSort: initialSort ?? null });
    }, [initialLimit, initialSort]);

    // ── buildParams ───────────────────────────────────────────────────────────
    // Usa debouncedSearch: nunca envía términos de búsqueda intermedios.
    const buildParams = useCallback((): URLSearchParams => {
        const p = new URLSearchParams();
        p.set('page', String(page));
        p.set('size', String(limit));
        if (debouncedSearch) p.set(searchParamName, debouncedSearch);
        if (sort)            p.set('sort', `${sort.field},${sort.direction}`);
        return p;
    }, [page, limit, debouncedSearch, sort, searchParamName]);

    // ── querySignal ───────────────────────────────────────────────────────────
    // Cambia ÚNICAMENTE cuando un valor comprometido cambia.
    // Gracias al reducer atómico, debouncedSearch y page cambian en el MISMO
    // render → querySignal cambia una sola vez → el useEffect de las páginas
    // dispara UNA sola petición API.
    const querySignal = useMemo(
        () => [debouncedSearch, limit, page, sort?.field ?? '', sort?.direction ?? ''].join('§'),
        [debouncedSearch, limit, page, sort]
    );

    return {
        searchInput,
        search:      debouncedSearch,
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
