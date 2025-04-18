import { produce } from '../utils/immer';
import { ContentRegistry, ContentLoaderOptions } from './types';

/**
 * Generický loader pro herní obsah s podporou lazy-loadingu
 * @template T Typ načítaného obsahu
 * @template K Typ identifikátoru obsahu (obvykle string)
 */
export class GenericContentLoader<T extends object, K extends string = string> {
    /** Cache načteného obsahu */
    private loadedContent: Map<string, T> = new Map();

    /** Promise pro obsah, který se právě načítá */
    private loadingPromises: Map<string, Promise<T>> = new Map();

    /** Registry definic obsahu s podporou lazy-loadingu */
    private registry: ContentRegistry<T, K> = {} as ContentRegistry<T, K>;

    /**
     * Vytvoří nový content loader
     * @param options Konfigurační možnosti loaderu
     */
    constructor(options: ContentLoaderOptions<T, K> = {}) {
        const { initialRegistry = {} as ContentRegistry<T, K> } = options;
        this.registry = { ...initialRegistry };
    }

    /**
     * Registruje definice obsahu do loaderu
     * @param registry Registry s definicemi nebo funkcemi pro lazy-loading
     */
    public registerContent(registry: ContentRegistry<T, K>): void {
        this.registry = produce(this.registry, (draft) => {
            Object.assign(draft, registry);
        });
    }

    /**
     * Registruje všechen obsah z registry
     * @param registry Registry s definicemi nebo funkcemi pro lazy-loading
     */
    public registerAll(registry: ContentRegistry<T, K>): void {
        this.registerContent(registry);
    }

    /**
     * Načte obsah podle klíče, podporuje jak okamžitý, tak lazy-loaded obsah
     * @param key Klíč obsahu
     * @returns Promise, který se vyřeší načteným obsahem
     * @throws Error pokud obsah s daným klíčem není v registry
     */
    public async loadContent(key: string): Promise<T> {
        // Vrátit z cache, pokud již je načten
        if (this.loadedContent.has(key)) {
            return this.loadedContent.get(key)!;
        }

        // Vrátit existující promise, pokud se již načítá
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key)!;
        }

        const contentDefOrImport = this.registry[key];

        if (!contentDefOrImport) {
            throw new Error(`Content with key "${key}" not found in registry`);
        }

        let loadPromise: Promise<T>;

        if (typeof contentDefOrImport === 'function') {
            // Zpracování lazy-loaded obsahu
            const loadFunction = contentDefOrImport as () => Promise<T | { default: T }>;
            loadPromise = loadFunction().then((module): T => {
                // Kontrola, zda máme default export (ES module) nebo přímý obsah
                const content = this.isMo