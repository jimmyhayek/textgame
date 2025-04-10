import { GameEngine } from '../core/GameEngine';
import { Plugin } from '../types';
import { GenericContentLoader } from '../loaders/GenericContentLoader';

/**
 * Base options for plugin configuration
 */
export interface PluginOptions {
    /** Optional configuration parameters */
    [key: string]: any;
}

/**
 * Abstract base class for plugins
 * Provides common functionality and structure for all plugins
 */
export abstract class AbstractPlugin<Options extends PluginOptions = PluginOptions> implements Plugin {
    /** Plugin name */
    public readonly name: string;

    /** Plugin options */
    protected options: Options;

    /** Game engine reference */
    protected engine: GameEngine | null = null;

    /** Content loaders used by this plugin */
    protected loaders: Map<string, GenericContentLoader<any>> = new Map();

    /**
     * Creates a new plugin instance
     *
     * @param name Plugin name
     * @param options Plugin options
     */
    constructor(name: string, options: Options) {
        this.name = name;
        this.options = options;
        this.setupLoaders();
    }

    /**
     * Sets up content loaders used by this plugin
     * Override this method to initialize plugin-specific loaders
     */
    protected setupLoaders(): void {
        // Override in subclass to register specific loaders
    }

    /**
     * Initializes the plugin with the game engine
     *
     * @param engine Game engine instance
     */
    public initialize(engine: GameEngine): void {
        this.engine = engine;

        // Register all loaders with the engine
        this.loaders.forEach((loader, type) => {
            engine.getLoaderRegistry().registerLoader(type, loader);
        });

        // Register content
        this.registerContent();

        // Register event handlers
        this.registerEventHandlers();

        // Register effect processors
        this.registerEffectProcessors();

        // Run plugin-specific initialization
        this.onInitialize();
    }

    /**
     * Registers content with the engine
     * Override this method to register plugin-specific content
     */
    protected registerContent(): void {
        // Override in subclass to register specific content
    }

    /**
     * Registers event handlers with the engine
     * Override this method to register plugin-specific event handlers
     */
    protected registerEventHandlers(): void {
        // Override in subclass to register specific event handlers
    }

    /**
     * Registers effect processors with the engine
     * Override this method to register plugin-specific effect processors
     */
    protected registerEffectProcessors(): void {
        // Override in subclass to register specific effect processors
    }

    /**
     * Called during plugin initialization
     * Override this method for plugin-specific initialization logic
     */
    protected onInitialize(): void {
        // Override in subclass for plugin-specific initialization
    }

    /**
     * Cleans up plugin resources
     * Called when the plugin is unregistered
     */
    public destroy(): void {
        // Remove all event handlers
        if (this.engine) {
            this.unregisterEventHandlers();

            // Run plugin-specific cleanup
            this.onDestroy();

            // Remove loaders registered by this plugin
            this.loaders.forEach((_, type) => {
                this.engine?.getLoaderRegistry().removeLoader(type);
            });

            this.engine = null;
        }
    }

    /**
     * Unregisters event handlers from the engine
     * Override this method to unregister plugin-specific event handlers
     */
    protected unregisterEventHandlers(): void {
        // Override in subclass to unregister specific event handlers
    }

    /**
     * Called during plugin cleanup
     * Override this method for plugin-specific cleanup logic
     */
    protected onDestroy(): void {
        // Override in subclass for plugin-specific cleanup
    }

    /**
     * Gets the current game state
     *
     * @returns Current game state or undefined if plugin is not initialized
     */
    protected getState() {
        return this.engine?.getState();
    }

    /**
     * Gets a content loader by type
     *
     * @param type Content type
     * @returns Content loader or undefined if not found
     */
    protected getLoader<T extends object, K extends string = string>(type: string) {
        return this.engine?.getLoader<T, K>(type);
    }
}