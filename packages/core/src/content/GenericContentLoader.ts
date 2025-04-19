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
                // Odstraníme promise z loadingPromises po úspěšném načtení
                this.loadingPromises.delete(key);
                return enhancedContent;
            }).catch(error => {
                // Odstraníme promise z loadingPromises i v případě chyby
                this.loadingPromises.delete(key);
                console.error(`Failed to load content for key "${key}":`, error);
                // Znovu vyhodíme chybu, aby ji mohl zachytit volající (např. preloadContent)
                throw error;
            });
        } else {
            // Zpracování přímého obsahu
            const content = typeof contentDefOrImport === 'object' && contentDefOrImport !== null
                ? { ...contentDefOrImport, _key: key }
                : contentDefOrImport;

            loadPromise = Promise.resolve(content);
            this.loadedContent.set(key, content);
        }

        // Uložíme promise POUZE pokud se jedná o skutečné načítání (lazy-load)
        if (typeof contentDefOrImport === 'function') {
            this.loadingPromises.set(key, loadPromise);
        }

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
     * Předem načte obsah podle klíčů.
     * Pokud klíč odkazuje na již načtený obsah, nic se neděje.
     * Pokud klíč odkazuje na lazy-loaded obsah, spustí jeho načítání.
     *
     * @param keys Volitelné pole klíčů obsahu k načtení. Pokud není uvedeno,
     *             pokusí se načíst veškerý *lazy-loaded* obsah registrovaný v loaderu.
     * @returns Promise, který se vyřeší, když jsou všechny požadované položky načteny (nebo jejich načítání selhalo).
     *          Promise bude *rejected*, pokud načtení *alespoň jedné* položky selže.
     * @throws Error pokud načtení některé z položek selže.
     */
    public async preloadContent(keys?: string[]): Promise<void> {
        let keysToLoad: string[];

        if (keys) {
            // Pokud jsou klíče specifikovány, filtrujeme jen ty, které jsou v registry
            keysToLoad = keys.filter(key => this.hasContent(key));
        } else {
            // Pokud nejsou klíče specifikovány, vezmeme všechny klíče z registry,
            // které odpovídají lazy-loading funkcím a ještě nebyly načteny.
            keysToLoad = this.getContentKeys().filter(key =>
                typeof this.registry[key] === 'function' &&
                !this.loadedContent.has(key) &&
                !this.loadingPromises.has(key) // Nepokoušíme se znovu načítat, co se už načítá
            );
        }

        if (keysToLoad.length === 0) {
            // Není co načítat
            return Promise.resolve();
        }

        console.log(`Preloading content for keys: ${keysToLoad.join(', ')}`);

        // Vytvoříme pole promises voláním loadContent pro každý klíč.
        // loadContent() inteligentně použije cache nebo existující loading promises.
        const preloadPromises = keysToLoad.map(key => this.loadContent(key));

        // Použijeme Promise.all ke spuštění všech načítání paralelně.
        // Promise.all se rejectne, pokud jakýkoli z vnitřních promises selže.
        try {
            await Promise.all(preloadPromises);
            console.log(`Successfully preloaded content for keys: ${keysToLoad.join(', ')}`);
        } catch (error) {
            // Chyba byla již zalogována v loadContent, zde ji jen přepošleme dál
            console.error(`Error occurred during preloading content.`);
            throw error; // Umožní volajícímu zjistit, že preload selhal
        }
    }

    /**
     * Získá podkladový registry obsahu
     * @returns Aktuální registry obsahu
     */
    public getRegistry(): ContentRegistry<T, K> {
        return this.registry;
    }

    /**
     * Vyčistí cache načteného obsahu a běžících načítání.
     * Obsah bude znovu načten při příštím požadavku (loadContent nebo preloadContent).
     */
    public clearCache(): void {
        this.loadedContent.clear();
        this.loadingPromises.clear();
        console.log('Content loader cache cleared.');
    }

    /**
     * Type guard pro kontrolu, zda objekt má default export
     * @param obj Objekt ke kontrole
     * @returns True pokud objekt má default vlastnost typu T
     * @private
     */
    private isModuleWithDefault(obj: any): obj is { default: T } {
        // Přidána kontrola, zda obj není null, a zda 'default' existuje
        return obj && typeof obj === 'object' && true && 'default' in obj;
    }
}