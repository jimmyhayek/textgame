/**
 * Registry obsahu s podporou lazy-loadingu
 * @template T Typ obsahu (hodnoty v registru)
 * @template K Typ klíče obsahu
 */
export type ContentRegistry<T extends object, K extends string = string> = {
    [key: string]: T | (() => Promise<T | { default: T }>);
};

/**
 * Obecné rozhraní pro definici obsahu k registraci
 * @template T Typ HODNOTY v registru (např. Scene, Item)
 */
export interface ContentDefinition<T extends object> { // Přidáno omezení T extends object
    /** Identifikátor typu obsahu (např. 'scenes', 'items') */
    type: string;
    /** Registry obsahu pro daný typ */
    content: ContentRegistry<T>; // <--- Změna zde: content je nyní typu ContentRegistry<T>
}


/**
 * Funkce pro načtení obsahu podle ID
 * @template T Typ obsahu
 * @template ID Typ identifikátoru obsahu
 */
export type ContentLoader<T, ID = string> = (id: ID) => Promise<T>;

/**
 * Funkce pro kontrolu existence obsahu
 * @template ID Typ identifikátoru obsahu
 */
export type ContentChecker<ID = string> = (id: ID) => boolean;

/**
 * Možnosti pro vytvoření content loaderu
 * @template T Typ obsahu
 * @template K Typ klíče obsahu
 */
export interface ContentLoaderOptions<T extends object, K extends string = string> {
    /** Počáteční registry obsahu */
    initialRegistry?: ContentRegistry<T, K>;
}

/**
 * Událost načtení obsahu
 */
export interface ContentLoadedEvent<T> {
    /** Typ obsahu */
    type: string;
    /** Klíč obsahu */
    key: string;
    /** Načtený obsah */
    content: T;
}

/**
 * Událost registrace obsahu
 */
export interface ContentRegisteredEvent {
    /** Typ obsahu */
    type: string;
    /** Počet registrovaných položek */
    count: number;
    /** Klíče registrovaných položek */
    keys: string[];
}