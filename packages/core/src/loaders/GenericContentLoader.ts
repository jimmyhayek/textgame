import { produce } from '../utils/immer';


/**
 * Interface for defining content registry with lazy-loading support
 * @template T The type of content being loaded
 * @template K The type of content identifier (usually string)
 */
export interface ContentRegistry<T, K extends string = string> {
  [key: string]: T | (() => Promise<T | { default: T }>);
}

/**
 * Configuration options for content loader
 * @template T The type of content being loaded
 * @template K The type of content identifier (usually string)
 */
export interface ContentLoaderOptions<T extends object, K extends string = string> {
  /** Initial registry of content */
  initialRegistry?: ContentRegistry<T, K>;
}

/**
 * Generic loader for game content with lazy-loading support
 * @template T The type of content being loaded
 * @template K The type of content identifier (usually string)
 */
export class GenericContentLoader<T extends object, K extends string = string> {
  /** Loaded content cache */
  private loadedContent: Map<string, T> = new Map();

  /** Loading promises for content currently being loaded */
  private loadingPromises: Map<string, Promise<T>> = new Map();

  /** Registry of content definitions with lazy-loading support */
  private registry: ContentRegistry<T, K> = {} as ContentRegistry<T, K>;

  /**
   * Creates a new content loader
   * @param options Loader configuration options
   */
  constructor(options: ContentLoaderOptions<T, K> = {}) {
    const { initialRegistry = {} as ContentRegistry<T, K> } = options;
    this.registry = { ...initialRegistry };
  }

  /**
   * Registers content definitions to the loader
   * @param registry Content registry with definitions or lazy-loading functions
   */
  public registerContent(registry: ContentRegistry<T, K>): void {
    this.registry = produce(this.registry, (draft) => {
      Object.assign(draft, registry);
    });
  }

  /**
   * Loads content by ID, supporting both immediate and lazy-loaded content
   * @param id Content identifier
   * @returns Promise that resolves to the loaded content
   * @throws Error if content with the given ID is not found in registry
   */
  public async loadContent(id: string): Promise<T> {
    // Return from cache if already loaded
    if (this.loadedContent.has(id)) {
      return this.loadedContent.get(id)!;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const contentDefOrImport = this.registry[id];

    if (!contentDefOrImport) {
      throw new Error(`Content with ID "${id}" not found in registry`);
    }

    let loadPromise: Promise<T>;

    if (typeof contentDefOrImport === 'function') {
      // Handle lazy-loaded content
      const loadFunction = contentDefOrImport as () => Promise<T | { default: T }>;
      loadPromise = loadFunction().then((module): T => {
        // Check if we have a default export (ES module) or direct content
        const content = this.isModuleWithDefault(module) ? module.default : module;
        this.loadedContent.set(id, content);
        return content;
      });
    } else {
      // Handle immediate content
      loadPromise = Promise.resolve(contentDefOrImport);
      this.loadedContent.set(id, contentDefOrImport);
    }

    this.loadingPromises.set(id, loadPromise);
    return loadPromise;
  }

  /**
   * Checks if content with the given ID exists in the registry
   * @param id Content identifier
   * @returns True if content exists, false otherwise
   */
  public hasContent(id: string): boolean {
    return id in this.registry;
  }

  /**
   * Gets all content IDs registered in the loader
   * @returns Array of content IDs
   */
  public getContentIds(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * Preloads content by IDs
   * @param ids Optional array of content IDs to preload, preloads all content if omitted
   * @returns Promise that resolves when all content is loaded
   */
  public async preloadContent(ids?: string[]): Promise<void> {
    const idsToLoad: string[] = ids || this.getContentIds();
    await Promise.all(idsToLoad.map(id => this.loadContent(id)));
  }

  /**
   * Gets the underlying content registry
   * @returns Current content registry
   */
  public getRegistry(): ContentRegistry<T, K> {
    return this.registry;
  }

  /**
   * Type guard to check if an object has a default export
   * @param obj Object to check
   * @returns True if object has a default property of type T
   * @private
   */
  private isModuleWithDefault(obj: any): obj is { default: T } {
    return obj && typeof obj === 'object' && 'default' in obj;
  }
}