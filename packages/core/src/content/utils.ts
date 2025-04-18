import { ContentRegistry, ContentDefinition } from './types';
import { Scene } from '../scene';
import { GenericContentLoader } from './GenericContentLoader';

/**
 * Vytvoří novou instanci content loaderu pro daný typ obsahu
 * @template T Typ obsahu
 * @template K Typ klíče obsahu
 * @param registry Volitelný počáteční registry obsahu
 * @returns Nová instance content loaderu
 */
export function createContentLoader<T extends object, K extends string = string>(
    registry?: ContentRegistry<T, K>
): GenericContentLoader<T, K> {
    return new GenericContentLoader<T, K>({
        initialRegistry: registry
    });
}

/**
 * Vytvoří definici obsahu pro registraci s engine
 * @template T Typ obsahu (hodnoty v registru)
 * @param type Identifikátor typu obsahu
 * @param contentRegistry Registry obsahu
 * @returns Definice obsahu připravená k registraci
 */
export function defineContent<T extends object>( // Omezení T extends object
    type: string,
    contentRegistry: ContentRegistry<T> // Přijímá přímo ContentRegistry<T>
): ContentDefinition<T> { // Vrací správný typ
    return { type, content: contentRegistry };
}

/**
 * Zjednodušená utilita pro definování registru scén.
 * Automaticky nastavuje typ obsahu na 'scenes'.
 * @param registry Objekt mapující klíče scén (string) na objekty Scene nebo funkce pro lazy-loading.
 * @returns Objekt ContentDefinition<Scene> připravený pro registraci v enginu.
 */
export function defineScenes(registry: ContentRegistry<Scene>): ContentDefinition<Scene> {
    // Interně volá generickou funkci defineContent s předvyplněným typem
    return defineContent<Scene>('scenes', registry);
}

/**
 * Spojí více registrů obsahu do jednoho
 * @template T Typ obsahu
 * @template K Typ klíče obsahu
 * @param registries Pole registrů obsahu
 * @returns Spojený registry obsahu
 */
export function mergeContentRegistries<T extends object, K extends string = string>(
    ...registries: ContentRegistry<T, K>[]
): ContentRegistry<T, K> {
    return Object.assign({}, ...registries);
}

/**
 * Generuje normalizovaný klíč obsahu
 * @param parts Části klíče, které budou spojeny lomítkem
 * @returns Normalizovaný klíč obsahu
 */
export function generateContentKey(...parts: string[]): string {
    // Odstranění prázdných částí
    const filteredParts = parts.filter(part => part.trim() !== '');

    // Spojení částí lomítkem a normalizace lomítek
    return filteredParts
        .join('/')
        .replace(/\/+/g, '/') // Nahrazení více lomítek za jedno
        .replace(/^\/|\/$/g, ''); // Odstranění lomítek na začátku a konci
}

/**
 * Extrahuje klíče obsahu z registry
 * @param registry Registry obsahu
 * @returns Pole klíčů obsahu
 */
export function extractContentKeys<T extends object, K extends string = string>(
    registry: ContentRegistry<T, K>
): string[] {
    return Object.keys(registry);
}

/**
 * Transformuje registry obsahu pomocí mapovací funkce
 * @template T Původní typ obsahu
 * @template U Nový typ obsahu
 * @template K Typ klíče obsahu
 * @param registry Původní registry obsahu
 * @param mapFn Funkce pro transformaci každé položky
 * @returns Transformovaný registry obsahu
 */
export function mapContentRegistry<T extends object, U extends object, K extends string = string>(
    registry: ContentRegistry<T, K>,
    mapFn: (content: T, key: string) => U
): ContentRegistry<U, K> {
    const result: ContentRegistry<U, K> = {} as ContentRegistry<U, K>;

    for (const [key, value] of Object.entries(registry)) {
        if (typeof value === 'function') {
            // Pro lazy-loaded obsah
            result[key] = async () => {
                const loadedContent = await (value as Function)();
                // Handle default export from ES modules
                const actualContent = ('default' in loadedContent) ? loadedContent.default : loadedContent;
                return mapFn(actualContent as T, key);
            };
        } else {
            // Pro okamžitý obsah
            result[key] = mapFn(value as T, key);
        }
    }

    return result;
}