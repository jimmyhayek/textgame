import { GenericContentLoader } from './GenericContentLoader';

/**
 * Registry pro správu multiple content loaderů
 * Poskytuje centrální bod pro registraci a přístup k loaderům pro různé typy obsahu
 */
export class LoaderRegistry {
    /** Mapa loaderů organizovaná podle typu */
    private loaders: Map<string, GenericContentLoader<any, any>> = new Map();

    /**
     * Registruje loader pro specifický typ obsahu
     * @param type Identifikátor typu obsahu
     * @param loader Instance loaderu pro daný typ obsahu
     * @returns Instance registru pro řetězení
     */
    public registerLoader<T extends object, K extends string = string>(
        type: string,
        loader: GenericContentLoader<T, K>
    ): LoaderRegistry {
        this.loaders.set(type, loader);
        return this;
    }

    /**
     * Získá loader pro specifický typ obsahu
     * @template T Typ obsahu
     * @template K Typ klíče obsahu
     * @param type Identifikátor typu obsahu
     * @returns Instance loaderu pro daný typ obsahu nebo undefined pokud nenalezen
     */
    public getLoader<T extends object, K extends string = string>(
        type: string
    ): GenericContentLoader<T, K> | undefined {
        return this.loaders.get(type) as GenericContentLoader<T, K> | undefined;
    }

    /**
     * Kontroluje, zda existuje loader pro specifický typ obsahu
     * @param type Identifikátor typu obsahu
     * @returns True pokud loader existuje, false jinak
     */
    public hasLoader(type: string): boolean {
        return this.loaders.has(type);
    }

    /**
     * Získá všechny registrované typy obsahu
     * @returns Pole identifikátorů typů obsahu
     */
    public getContentTypes(): string[] {
        return Array.from(this.loaders.keys());
    }

    /**
     * Odstraní loader pro specifický typ obsahu
     * @param type Identifikátor typu obsahu
     * @returns True pokud byl loader odstraněn, false pokud neexistoval
     */
    public removeLoader(type: string): boolean {
        return this.loaders.delete(type);
    }

    /**
     * Načte obsah specifického typu podle klíče
     * @template T Typ obsahu
     * @param type Identifikátor typu obsahu
     * @param key Klíč obsahu
     * @returns Promise s načteným obsahem
     * @throws Error pokud typ obsahu není registrován nebo obsah neexistuje
     */
    public async loadContent<T extends object>(type: string, key: string): Promise<T> {
        const loader = this.getLoader<T>(type);
        if (!loader) {
            throw new Error(`No loader registered for content type '${type}'`);
        }

        return await loader.loa