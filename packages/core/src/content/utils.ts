// src/content/utils.ts

import { ContentRegistry, ContentDefinition } from './types';
import { Scene } from '../scene/types'; // Assuming Scene is defined here
import { GenericContentLoader, ContentLoaderOptions } from './GenericContentLoader'; // Import class and options interface

/**
 * Factory function to create a new instance of `GenericContentLoader`.
 *
 * @template T The type of content the loader will manage (must extend object).
 * @template K The type of the content identifier key.
 * @param options Optional configuration for the content loader, including an initial registry.
 * @returns A new instance of `GenericContentLoader<T, K>`.
 */
export function createContentLoader<T extends object, K extends string = string>(
    options?: ContentLoaderOptions<T, K> // Use options interface
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
 *
 * @template T The type of content in the registries.
 * @template K The type of the content identifier key.
 * @param registries An array of `ContentRegistry` objects to merge.
 * @returns A new `ContentRegistry` containing all entries from the input registries.
 */
export function mergeContentRegistries<T, K extends string = string>( // T doesn't strictly need `extends object` here
    ...registries: ContentRegistry<T, K>[]
): ContentRegistry<T, K> {
  return Object.assign({}, ...registries); // Creates a new object with merged properties
}

/**
 * Generates a normalized content key, typically used for hierarchical or path-based keys.
 * Joins parts with '/', removes duplicate slashes, and trims leading/trailing slashes.
 *
 * @param parts String parts to join into a key. Empty parts are filtered out.
 * @returns A normalized content key string.
 * @example
 * generateContentKey('items', ' potions ', '/healing') // Returns 'items/potions/healing'
 */
export function generateContentKey(...parts: string[]): string {
  // Filter out empty or whitespace-only parts
  const filteredParts = parts.filter(part => part && part.trim() !== '');

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
export function extractContentKeys<T, K extends string = string>( // T doesn't strictly need `extends object` here
    registry: ContentRegistry<T, K>
): string[] {
  return Object.keys(registry);
}

/**
 * Transforms the values within a content registry using a mapping function,
 * preserving the structure (including lazy-loading functions).
 *
 * @template T The original type of content items in the registry (must extend object).
 * @template U The new type of content items after transformation (must extend object).
 * @template K The type of the content identifier key.
 * @param registry The source `ContentRegistry` to transform.
 * @param mapFn A function that takes the original content item and its key, and returns the transformed item.
 *              This function is applied *after* lazy-loading, if applicable.
 * @returns A new `ContentRegistry` with the transformed content items.
 */
export function mapContentRegistry<T extends object, U extends object, K extends string = string>(
    registry: ContentRegistry<T, K>,
    mapFn: (content: T, key: string) => U
): ContentRegistry<U, K> {
  const result: ContentRegistry<U, K> = {} as ContentRegistry<U, K>;

  for (const [key, value] of Object.entries(registry)) {
    if (typeof value === 'function') {
      // Preserve lazy-loading capability for functions
      result[key] = async () => {
        // Await the original lazy loader
        const loadedModuleOrContent = await (value as () => Promise<T | { default: T }})();
      // Handle potential default export from ES modules
      const actualContent = ('default' in loadedModuleOrContent && typeof loadedModuleOrContent.default !== 'undefined')
          ? loadedModuleOrContent.default
          : loadedModuleOrContent;
      // Apply the mapping function to the resolved content
      return mapFn(actualContent as T, key);
    };
  } else {
    // Apply the mapping function directly to non-lazy content
    result[key] = mapFn(value as T, key);
  }
}

return result;
}