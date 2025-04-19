import { produce } from '../utils/immer';

/**
 * Interface pro definování content registry s lazy-loading podporou
 * @template T Typ načítaného obsahu
 * @template K Typ identifikátoru obsahu (obvykle string)
 */
export interface ContentRegistry<T, K extends string = string> {
    [key: string]: T | (() => Promise<T | { default: T }>);
}

/**
 * Konfigurační možnosti pro content loader
 * @template T Typ načítaného obsahu
 * @template K Typ identifikátoru obsahu (obvykle string)
 */
export interface ContentLoaderOptions<T extends object, K extends string = string> {
    /** Počáteční registry obsahu */
    initialRegistry?: ContentRegistry<T, K>;
}

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
                const content = this.isModuleWithDefault(module) ? module.default : module;

                // Přidáme _key do načteného obsahu
                const enhancedContent = typeof content === 'object' && content !== null
                    ? { ...content, _key: key }
                    : content;

                this.loadedContent.set(key, enhancedContent);
                return enhancedContent;
            });
        } else {
            // Zpracování přímého obsahu
            const content = typeof contentDefOrImport === 'object' && contentDefOrImport !== null
                ? { ...contentDefOrImport, _key: key }
                : contentDefOrImport;

            loadPromise = Promise.resolve(content);
            this.loadedContent.set(key, content);
        }

        this.loadingPromises.set(key, loadPromise);
        return loadPromise;
    }

    /**
     * Kontroluje, zda obsah s daným klíčem existuje v registry
     * @param key Klíč obsahu
     * @returns True pokud obsah existuje, false jinak
     */
    public hasContent(key: string): boolean {
        return key in this.registry;
    }

    /**
     * Získá všechny klíče obsahu registrované v loaderu
     * @returns Pole klíčů obsahu
     */
    public getContentKeys(): string[] {
        return Object.keys(this.registry);
    }

    /**
     * Předem načte obsah podle klíčů
     * @param keys Volitelné pole klíčů obsahu k načtení, načte veškerý obsah pokud není uvedeno
     * @returns Promise, který se vyřeší, když je veškerý obsah načten
     */
    public async preloadContent(keys?: string[]): Promise<void> {
        const keysToLoad: string[] = keys || this.getContentKeys();
        await Promise.all(keysToLoad.map(key => this.loadContent(key)));
    }

    /**
     * Získá podkladový registry obsahu
     * @returns Aktuální registry obsahu
     */
    public getRegistry(): ContentRegistry<T, K> {
        return this.registry;
    }

    /**
     * Vyčistí cache a načte veškerý obsah znovu při příštím požadavku
     */
    public clearCache(): void {
        this.loadedContent.clear();
        this.loadingPromises.clear();
    }

    /**
     * Type guard pro kontrolu, zda objekt má default export
     * @param obj Objekt ke kontrole
     * @returns True pokud objekt má default vlastnost typu T
     * @private
     */
    private isModuleWithDefault(obj: any): obj is { default: T } {
        return obj && typeof obj === 'object' && 'default' in obj;
    }
}