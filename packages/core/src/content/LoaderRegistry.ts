import { GenericContentLoader } from './GenericContentLoader';

/**
 * Manages multiple `GenericContentLoader` instances, organized by content type.
 * Provides a central point for registering and accessing loaders for different
 * kinds of game content (e.g., 'scenes', 'items', 'audio').
 */
export class LoaderRegistry {
  /** Map storing GenericContentLoader instances, keyed by content type identifier (string). */
  private loaders: Map<string, GenericContentLoader<any, any>> = new Map();
  // Note: `any` is used here because the registry holds loaders for various unknown `T` types.
  // Type safety is enforced when retrieving a specific loader using `getLoader<T, K>`.

  /**
   * Registers a specific `GenericContentLoader` instance for a given content type.
   * If a loader for this type already exists, it will be overwritten.
   *
   * @template T The type of content handled by the loader.
   * @template K The type of the content identifier key.
   * @param type A string identifying the type of content (e.g., 'scenes', 'items').
   * @param loader The `GenericContentLoader` instance to register.
   * @returns The `LoaderRegistry` instance for method chaining.
   */
  public registerLoader<T extends object, K extends string = string>(
      type: string,
      loader: GenericContentLoader<T, K>
  ): this { // Return `this` for chaining
    this.loaders.set(type, loader);
    return this;
  }

  /**
   * Retrieves the `GenericContentLoader` instance for a specific content type.
   * Returns `undefined` if no loader is registered for the given type.
   *
   * @template T The expected type of content handled by the loader.
   * @template K The expected type of the content identifier key.
   * @param type The string identifying the type of content.
   * @returns The `GenericContentLoader` instance for the specified type, or `undefined`.
   */
  public getLoader<T extends object, K extends string = string>(
      type: string
  ): GenericContentLoader<T, K> | undefined {
    // Cast is necessary due to the `any` type in the internal `loaders` map.
    // The caller is responsible for providing the correct T and K.
    return this.loaders.get(type) as GenericContentLoader<T, K> | undefined;
  }

  /**
   * Checks if a loader is registered for a specific content type.
   *
   * @param type The string identifying the type of content.
   * @returns `true` if a loader for the type exists, `false` otherwise.
   */
  public hasLoader(type: string): boolean {
    return this.loaders.has(type);
  }

  /**
   * Gets an array of all registered content type identifiers.
   *
   * @returns An array of strings representing the registered content types.
   */
  public getContentTypes(): string[] {
    return Array.from(this.loaders.keys());
  }

  /**
   * Removes the loader associated with a specific content type.
   *
   * @param type The string identifying the type of content whose loader should be removed.
   * @returns `true` if a loader was successfully removed, `false` if no loader was found for the type.
   */
  public removeLoader(type: string): boolean {
    return this.loaders.delete(type);
  }
}