import { GenericContentLoader } from './GenericContentLoader';

/**
 * Registry for managing multiple content loaders
 * Provides a central point for registering and accessing loaders for different content types
 */
export class LoaderRegistry {
    /** Map of loaders organized by type */
    private loaders: Map<string, GenericContentLoader<any, any>> = new Map();

    /**
     * Registers a loader for a specific content type
     * @param type Content type identifier
     * @param loader Loader instance for the content type
     * @returns This registry instance for chaining
     */
    public registerLoader<T extends object, K extends string = string>(
        type: string,
        loader: GenericContentLoader<T, K>
    ): LoaderRegistry {
        this.loaders.set(type, loader);
        return this;
    }

    /**
     * Gets a loader for a specific content type
     * @template T Content type
     * @template K Content ID type
     * @param type Content type identifier
     * @returns Loader instance for the content type or undefined if not found
     */
    public getLoader<T extends object, K extends string = string>(
        type: string
    ): GenericContentLoader<T, K> | undefined {
        return this.loaders.get(type) as GenericContentLoader<T, K> | undefined;
    }

    /**
     * Checks if a loader for a specific content type exists
     * @param type Content type identifier
     * @returns True if loader exists, false otherwise
     */
    public hasLoader(type: string): boolean {
        return this.loaders.has(type);
    }

    /**
     * Gets all registered content types
     * @returns Array of content type identifiers
     */
    public getContentTypes(): string[] {
        return Array.from(this.loaders.keys());
    }

    /**
     * Removes a loader for a specific content type
     * @param type Content type identifier
     * @returns True if loader was removed, false if it didn't exist
     */
    public removeLoader(type: string): boolean {
        return this.loaders.delete(type);
    }
}