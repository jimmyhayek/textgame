import { GameEngine } from '../engine/GameEngine';
import { Plugin } from './types';
import { GenericContentLoader } from '../content/GenericContentLoader';
import { Effect, EffectProcessor, GameState, GameEventType, EventListener } from '../types';

/**
 * Base configuration options for plugins
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

    /** Reference to game engine */
    protected engine: GameEngine | null = null;

    /** Content loaders used by this plugin */
    protected loaders: Map<string, GenericContentLoader<any>> = new Map();

    /** Registered effects with this plugin's namespace */
    protected registeredEffects: Set<string> = new Set();

    /** Registered event listeners for easy unregistration */
    private eventListeners: Map<GameEventType, Set<EventListener>> = new Map();

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
     * Override this method to initialize specific plugin loaders
     */
    protected setupLoaders(): void {
        // Override in subclass to register specific loaders
    }

    /**
     * Initializes the plugin with the game engine
     * This method is now asynchronous to allow async initialization
     *
     * @param engine Game engine instance
     */
    public async initialize(engine: GameEngine): Promise<void> {
        this.engine = engine;

        // Register all loaders with the engine
        this.loaders.forEach((loader, type) => {
            engine.getLoaderRegistry().registerLoader(type, loader);
        });

        // Register content
        await this.registerContent();

        // Register event handlers
        this.registerEventHandlers();

        // Register effect processors
        this.registerEffectProcessors();

        // Run plugin-specific initialization
        await this.onInitialize();
    }

    /**
     * Registers content with the engine
     * Override this method to register plugin-specific content
     * Now asynchronous to support lazy loading
     */
    protected async registerContent(): Promise<void> {
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
     * Now asynchronous to support async initialization
     */
    protected async onInitialize(): Promise<void> {
        // Override in subclass for plugin-specific initialization
    }

    /**
     * Cleans up plugin resources
     * Called when unregistering the plugin
     */
    public async destroy(): Promise<void> {
        // Remove all event handlers
        if (this.engine) {
            this.unregisterEventHandlers();
            this.unregisterEffectProcessors();

            // Run plugin-specific cleanup
            await this.onDestroy();

            // Remove loaders registered by this plugin
            this.loaders.forEach((_, type) => {
                this.engine?.getLoaderRegistry().removeLoader(type);
            });

            this.engine = null;
        }
    }

    /**
     * Unregisters event handlers from the engine
     */
    protected unregisterEventHandlers(): void {
        if (this.engine) {
            // Unregister all tracked event handlers
            this.eventListeners.forEach((listeners, eventType) => {
                listeners.forEach(listener => {
                    this.engine?.off(eventType, listener);
                });
            });
            this.eventListeners.clear();
        }
    }

    /**
     * Unregisters effect processors
     */
    protected unregisterEffectProcessors(): void {
        if (this.engine) {
            // Unregister all effects via namespace
            this.engine.getEffectManager().unregisterNamespace(this.name);
            this.registeredEffects.clear();
        }
    }

    /**
     * Called during plugin cleanup
     * Override this method for plugin-specific cleanup logic
     * Now asynchronous to support async cleanup
     */
    protected async onDestroy(): Promise<void> {
        // Override in subclass for plugin-specific cleanup
    }

    /**
     * Gets the current game state
     *
     * @returns Current game state or undefined if plugin is not initialized
     */
    protected getState(): GameState | undefined {
        return this.engine?.getState();
    }

    /**
     * Gets content loader by type
     *
     * @param type Content type
     * @returns Content loader or undefined if not found
     */
    protected getLoader<T extends object, K extends string = string>(type: string): GenericContentLoader<T, K> | undefined {
        return this.engine?.getLoader<T, K>(type);
    }

    /**
     * Adds namespace prefix to effect type if needed
     *
     * @param effectType Effect type to namespace
     * @returns Namespaced effect type
     */
    private namespaceEffectType(effectType: string): string {
        return effectType.includes(':') ? effectType : `${this.name}:${effectType}`;
    }

    /**
     * Registers an effect processor with automatic namespace prefix
     *
     * @param effectType Effect type
     * @param processor Function to process the effect
     */
    protected registerEffectProcessor(effectType: string, processor: EffectProcessor): void {
        if (this.engine) {
            const namespacedType = this.namespaceEffectType(effectType);
            this.engine.getEffectManager().registerEffectProcessor(namespacedType, processor);
            this.registeredEffects.add(namespacedType);
        }
    }

    /**
     * Registers multiple effect processors at once
     *
     * @param processors Object mapping effect types to processors
     */
    protected registerEffectProcessors(processors: Record<string, EffectProcessor>): void {
        if (!this.engine) return;

        // Add namespace to all effect types
        const namespacedProcessors: Record<string, EffectProcessor> = {};

        for (const [type, processor] of Object.entries(processors)) {
            const namespacedType = this.namespaceEffectType(type);
            namespacedProcessors[namespacedType] = processor;
            this.registeredEffects.add(namespacedType);
        }

        this.engine.getEffectManager().registerEffectProcessors(namespacedProcessors);
    }

    /**
     * Applies an effect to the game state with automatic namespace prefix
     *
     * @param effect Effect to apply
     */
    protected applyEffect(effect: Effect): void {
        if (!this.engine) return;

        const currentState = this.engine.getState();

        // Add namespace to effect type if it doesn't have one
        const namespacedEffect = {
            ...effect,
            type: this.namespaceEffectType(effect.type)
        };

        const newState = this.engine.getEffectManager().applyEffect(namespacedEffect, currentState);
        this.engine.getStateManager().setState(newState);
        this.engine.emit('stateChanged', this.engine.getState());
    }

    /**
     * Applies multiple effects to the game state with automatic namespace prefix
     *
     * @param effects Array of effects to apply
     */
    protected applyEffects(effects: Effect[]): void {
        if (!this.engine || effects.length === 0) return;

        const currentState = this.engine.getState();

        // Add namespace to all effects that don't have one
        const namespacedEffects = effects.map(effect => ({
            ...effect,
            type: this.namespaceEffectType(effect.type)
        }));

        const newState = this.engine.getEffectManager().applyEffects(namespacedEffects, currentState);
        this.engine.getStateManager().setState(newState);
        this.engine.emit('stateChanged', this.engine.getState());
    }

    /**
     * Emits an event with namespace prefix
     *
     * @param eventType Event type
     * @param data Optional event data
     */
    protected emitNamespacedEvent(eventType: string, data?: any): void {
        if (this.engine) {
            const namespacedType = eventType.includes(':') ? eventType : `${this.name}:${eventType}`;
            this.engine.emit(namespacedType, data);
        }
    }

    /**
     * Registers an event listener and tracks it for automatic unregistration
     *
     * @param eventType Event type
     * @param listener Function called when the event occurs
     */
    protected registerEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Register with engine
            this.engine.on(eventType, listener);

            // Track for later unregistration
            if (!this.eventListeners.has(eventType)) {
                this.eventListeners.set(eventType, new Set());
            }
            this.eventListeners.get(eventType)!.add(listener);
        }
    }

    /**
     * Unregisters an event listener
     *
     * @param eventType Event type
     * @param listener Function that was registered
     */
    protected unregisterEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Unregister from engine
            this.engine.off(eventType, listener);

            // Remove from tracking
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.eventListeners.delete(eventType);
                }
            }
        }
    }

    /**
     * Generic method to find entities by criteria
     *
     * @param criteria Function to query entities
     * @returns Array of entities matching criteria
     */
    protected findEntities<T>(criteria: (manager: any) => T[]): T[] {
        if (!this.engine) return [];
        return criteria(this.engine.getEntityManager());
    }

    /**
     * Returns entities with specific tag
     *
     * @param tag Tag to filter by
     * @returns Array of entities with given tag
     */
    protected getEntitiesByTag(tag: string): any[] {
        return this.findEntities(manager => manager.findEntitiesByTag(tag));
    }

    /**
     * Returns entities with specific component
     *
     * @param componentName Component name
     * @returns Array of entities with given component
     */
    protected getEntitiesByComponent(componentName: string): any[] {
        return this.findEntities(manager => manager.findEntitiesByComponent(componentName));
    }

    /**
     * Returns entities of specific type
     *
     * @param type Entity type
     * @returns Array of entities of given type
     */
    protected getEntitiesByType(type: string): any[] {
        return this.findEntities(manager => manager.findEntitiesByType(type));
    }
}