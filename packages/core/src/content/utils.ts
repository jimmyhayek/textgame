// Import types using 'import type' from the central types file
import type { ContentRegistry, ContentDefinition, ContentLoaderOptions } from './types';
// Import Scene type (assuming it's exported from scene module index)
import type { Scene } from '../scene';
// Import the GenericContentLoader class (runtime value)
import { GenericContentLoader } from './GenericContentLoader';

/**
 * Factory function to create a new instance of `GenericContentLoader`.
 *
 * @template T The type of content the loader will manage (must extend object).
 * @template K The type of the content identifier key.
 * @param options Optional configuration for the content loader, including an initial registry.
 * @returns A new instance of `GenericContentLoader<T, K>`.
 */
export function createContentLoader<T extends object, K extends string = string>(
    options?: ContentLoaderOptions<T, K> // Use options interface from types.ts
): GenericContentLoader<T, K> {
  return new GenericContentLoader<T, K>(options);
}

/**
 * Helper function to create a `ContentDefinition` object, typically used
 * for registering content collections with the engine's `LoaderRegistry`.
 *
 * @template T The type of the content items in the registry (must extend object).
 * @param type A string identifying the type of content (e.g., 'scenes', 'items').
 * @param contentRegistry The `ContentRegistry` containing the actual content definitions or loaders.
 * @returns A `ContentDefinition` object ready for registration.
 */
export function defineContent<T extends object>(
    type: string,
    contentRegistry: ContentRegistry<T>
): ContentDefinition<T> {
  return { type, content: contentRegistry };
}

/**
 * A specialized utility for defining a registry of scenes.
 * Automatically sets the content type identifier to 'scenes'.
 *
 * @param registry An object mapping scene keys (string) to `Scene` objects or lazy-loading functions.
 * @returns A `ContentDefinition<Scene>` object ready for registration.
 */
export function defineScenes(registry: ContentRegistry<Scene>): ContentDefinition<Scene> {
  // Internally calls the generic defineContent function with the type pre-filled.
  return defineContent<Scene>('scenes', registry);
}

/**
 * Merges multiple content registries into a single new registry.
 * Later registries overwrite entries with the same key from earlier ones.
 * Creates a new shallow copy; does not modify the original registries.
 *
 * @template T The type of content in the registries.
 * @template K The type of the content identifier key.
 * @param registries An array of `ContentRegistry` objects to merge.
 * @returns A new `ContentRegistry` containing all entries from the input registries.
 */
export function mergeContentRegistries<T, K extends string = string>(
    ...registries: ContentRegistry<T, K>[]
): ContentRegistry<T, K> {
  // Object.assign creates a new object and merges properties shallowly.
  return Object.assign({}, ...registries);
}

/**
 * Generates a normalized content key, typically used for hierarchical or path-based keys.
 * Joins parts with '/', removes duplicate slashes, filters empty parts, and trims leading/trailing slashes.
 *
 * @param parts String parts to join into a key. Empty or whitespace-only parts are filtered out.
 * @returns A normalized content key string.
 * @example
 * generateContentKey('items', ' potions ', '/healing', '', ' ') // Returns 'items/potions/healing'
 * generateContentKey(' single ') // Returns 'single'
 */
export function generateContentKey(...parts: string[]): string {
  // Filter out empty or whitespace-only parts
  const filteredParts = parts.filter(part => part && part.trim() !== '');

  // Handle the case where no valid parts are provided
  if (filteredParts.length === 0) {
    return '';
  }

  // Join with slash, replace multiple slashes with one, trim ends
  return filteredParts
      .join('/')
      .replace(/\/+/g, '/')      // Replace //, ///, etc. with /
      .replace(/^\/|\/$/g, ''); // Remove leading/trailing /
}

/**
 * Extracts all keys (content identifiers) from a given content registry.
 *
 * @template T The type of content in the registry.
 * @template K The type of the content identifier key.
 * @param registry The `ContentRegistry` object.
 * @returns An array of strings representing the keys in the registry.
 */
export function extractContentKeys<T, K extends string = string>(
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