import { produce } from '../utils/immer';
import { ContentRegistry, ContentLoaderOptions } from './types';

/**
 * A generic loader for game content (like scenes, items, etc.)
 * with support for caching and lazy-loading via dynamic imports or async functions.
 *
 * Automatically injects a `_key` property containing the original registry key
 * into loaded content objects (if the content is an object).
 *
 * @template T The type of the content being loaded (should extend object for _key injection).
 * @template K The type of the content identifier key (defaults to string).
 */
export class GenericContentLoader<T extends object, K extends string = string> {
  /** Cache for already loaded content items, mapped by their key. */
  private loadedContent: Map<string, T> = new Map();

  /** Stores promises for content items that are currently being loaded to prevent duplicate loading attempts. */
  private loadingPromises: Map<string, Promise<T>> = new Map();

  /** The registry containing content definitions or lazy-loading functions. */
  private registry: ContentRegistry<T, K> = {} as ContentRegistry<T, K>;

  /**
   * Creates a new GenericContentLoader instance.
   * @param options Configuration options for the loader.
   */
  constructor(options: ContentLoaderOptions<T, K> = {}) {
    const { initialRegistry = {} as ContentRegistry<T, K> } = options;
    this.registry = { ...initialRegistry }; // Shallow copy initial registry
  }

  /**
   * Registers multiple content definitions with the loader, merging them
   * with the existing registry.
   * @param registry A ContentRegistry containing definitions or lazy-loading functions.
   */
  public registerContent(registry: ContentRegistry<T, K>): void {
    // Using produce for potential future complex merging logic, although Object.assign is sufficient here.
    this.registry = produce(this.registry, (draft) => {
      Object.assign(draft, registry);
    });
    // Alternative simple merge:
    // this.registry = { ...this.registry, ...registry };
  }

  /**
   * Alias for `registerContent`. Registers all content definitions from the provided registry.
   * @param registry A ContentRegistry containing definitions or lazy-loading functions.
   */
  public registerAll(registry: ContentRegistry<T, K>): void {
    this.registerContent(registry);
  }

  /**
   * Loads a content item by its key.
   * Handles both directly defined content and lazy-loaded content (functions returning Promises).
   * Caches loaded content and manages concurrent loading attempts.
   * Injects a `_key` property into the loaded content if it's an object.
   *
   * @param key The unique key identifying the content item to load.
   * @returns A Promise that resolves with the loaded content item.
   * @throws {Error} If content with the specified key is not found in the registry.
   * @throws {Error} If lazy-loading fails.
   */
  public async loadContent(key: string): Promise<T> {
    // Return from cache if already loaded
    if (this.loadedContent.has(key)) {
      return this.loadedContent.get(key)!;
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const contentDefOrImport = this.registry[key];

    if (!contentDefOrImport) {
      throw new Error(`Content with key "${key}" not found in registry`);
    }

    let loadPromise: Promise<T>;

    if (typeof contentDefOrImport === 'function') {
      // Handle lazy-loaded content
      const loadFunction = contentDefOrImport as () => Promise<T | { default: T }>;
      loadPromise = loadFunction().then((moduleOrContent): T => {
        // Check for ES module default export or direct content
        const content = this.isModuleWithDefault(moduleOrContent) ? moduleOrContent.default : moduleOrContent;

        // Add _key to the loaded content if it's an object
        // Note: This modifies the loaded content instance.
        const enhancedContent = typeof content === 'object' && content !== null
            ? { ...content, _key: key }
            : content;

        this.loadedContent.set(key, enhancedContent);
        // Remove promise from loadingPromises map upon successful load
        this.loadingPromises.delete(key);
        return enhancedContent;
      }).catch(error => {
        // Remove promise from loadingPromises map even on error
        this.loadingPromises.delete(key);
        console.error(`Failed to load content for key "${key}":`, error);
        // Re-throw the error to allow callers (like preloadContent) to handle it
        throw error;
      });

      // Store the promise ONLY if it represents actual async loading
      this.loadingPromises.set(key, loadPromise);

    } else {
      // Handle directly defined content
      // Add _key if it's an object
      const content = typeof contentDefOrImport === 'object'
          ? { ...contentDefOrImport, _key: key }
          : contentDefOrImport;

      loadPromise = Promise.resolve(content);
      this.loadedContent.set(key, content);
    }

    return loadPromise;
  }

  /**
   * Checks if content with the given key exists in the registry.
   * Does not check if the content is already loaded or currently loading.
   * @param key The key of the content item.
   * @returns `true` if the content key is registered, `false` otherwise.
   */
  public hasContent(key: string): boolean {
    return key in this.registry;
  }

  /**
   * Gets an array of all content keys currently registered with this loader.
   * @returns An array of content keys.
   */
  public getContentKeys(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * Preloads content items by their keys. Useful for loading assets upfront.
   * If a key refers to already loaded content, it's skipped.
   * If a key refers to lazy-loaded content, its loading process is initiated.
   *
   * @param keys An optional array of content keys to preload. If omitted,
   *             attempts to preload all *lazy-loaded* content items
   *             that are not already loaded or loading.
   * @returns A Promise that resolves when all requested items are loaded,
   *          or rejects if *any* of the loading attempts fail.
   * @throws {Error} If loading of any specified item fails.
   */
  public async preloadContent(keys?: string[]): Promise<void> {
    let keysToLoad: string[];

    if (keys) {
      // If keys are specified, filter only those present in the registry
      keysToLoad = keys.filter(key => this.hasContent(key));
    } else {
      // If no keys specified, find all registered lazy-loading functions
      // that haven't been loaded or aren't currently loading.
      keysToLoad = this.getContentKeys().filter(key =>
          typeof this.registry[key] === 'function' &&
          !this.loadedContent.has(key) &&
          !this.loadingPromises.has(key) // Don't re-trigger loading
      );
    }

    if (keysToLoad.length === 0) {
      // Nothing to preload
      return Promise.resolve();
    }

    console.log(`[ContentLoader] Preloading content for keys: ${keysToLoad.join(', ')}`);

    // Create an array of promises by calling loadContent for each key.
    // loadContent intelligently uses cache or existing loading promises.
    const preloadPromises = keysToLoad.map(key => this.loadContent(key));

    // Use Promise.all to run all loading operations concurrently.
    // It rejects if any of the inner promises reject.
    try {
      await Promise.all(preloadPromises);
      console.log(`[ContentLoader] Successfully preloaded content for keys: ${keysToLoad.join(', ')}`);
    } catch (error) {
      // The error was already logged in loadContent's catch block.
      console.error(`[ContentLoader] Error occurred during preloading content.`);
      throw error; // Re-throw to signal failure to the caller
    }
  }

  /**
   * Retrieves the underlying content registry.
   * @returns The current content registry.
   */
  public getRegistry(): ContentRegistry<T, K> {
    return this.registry;
  }

  /**
   * Clears the cache of loaded content items and cancels tracking of
   * currently loading items. Content will be re-loaded on the next request
   * (via `loadContent` or `preloadContent`).
   */
  public clearCache(): void {
    this.loadedContent.clear();
    this.loadingPromises.clear();
    console.log('[ContentLoader] Content loader cache cleared.');
  }

  /**
   * Type guard to check if an object is likely an ES module with a default export.
   * @param obj The object to check.
   * @returns `true` if the object has a 'default' property, `false` otherwise.
   * @private
   */
  private isModuleWithDefault(obj: any): obj is { default: T } {
    // Check if obj is a non-null object and has the 'default' key
    return obj && typeof obj === 'object' && 'default' in obj;
  }
}