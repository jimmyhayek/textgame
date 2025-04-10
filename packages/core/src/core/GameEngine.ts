import {
  GameState,
  Choice,
  Scene,
  SceneId,
  Effect,
  Plugin,
  GameEventType,
  EventListener,
  ContentDefinition,
  ContentRegistry
} from '../types';
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { SceneManager } from './SceneManager';
import { EffectManager } from './EffectManager';
import { PluginManager } from './PluginManager';
import { GenericContentLoader } from '../loaders/GenericContentLoader';
import { LoaderRegistry } from '../loaders/LoaderRegistry';

/**
 * Configuration options for the game engine initialization
 */
export interface GameEngineOptions {
  /** Initial game state that will be merged with the default empty state */
  initialState?: Partial<GameState>;


  /** Content loaders to be used by the engine */
  loaders?: {
    /** Additional loaders by type */
    [key: string]: GenericContentLoader<any>;
  };

  /** Plugins to be registered with the engine */
  plugins?: Plugin[];
}

/**
 * Main game engine class for interactive text games
 *
 * The engine manages game state, scenes, transitions between scenes,
 * effect processing, and provides a plugin architecture for extending functionality.
 * It uses Immer under the hood for immutable state management.
 */
export class GameEngine {
  /** Event emitter for game events */
  private readonly eventEmitter: EventEmitter;

  /** State manager for game state */
  private readonly stateManager: StateManager;

  /** Scene manager for scene transitions */
  private readonly sceneManager: SceneManager;

  /** Effect manager for processing effects */
  private readonly effectManager: EffectManager;

  /** Plugin manager for plugin registration */
  private readonly pluginManager: PluginManager;

  /** Loader registry for content loaders */
  private readonly loaderRegistry: LoaderRegistry;

  /** Flag indicating if the game is running */
  private isRunning: boolean = false;

  /**
   * Creates a new game engine instance
   *
   * @param options Configuration options for the engine
   */
  constructor(options: GameEngineOptions = {}) {
    const {
      initialState = {},
      loaders = {
        scenes: new GenericContentLoader<Scene>()
      },
      plugins = []
    } = options;

    this.eventEmitter = new EventEmitter();
    this.stateManager = new StateManager(initialState);
    this.loaderRegistry = new LoaderRegistry();

    // Register all provided loaders
    Object.entries(loaders).forEach(([type, loader]) => {
      this.loaderRegistry.registerLoader(type, loader);
    });

    // Initialize scene manager with the scene loader
    this.sceneManager = new SceneManager(loaders.scenes);
    this.effectManager = new EffectManager();
    this.pluginManager = new PluginManager(this);

    // Initialize plugins
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }

  /**
   * Starts the game beginning with the specified scene
   *
   * @param initialSceneId ID of the scene to start the game with
   * @returns Promise that resolves after successful transition to the initial scene
   * @throws Error if the scene doesn't exist or can't be transitioned to
   */
  public async start(initialSceneId: SceneId): Promise<void> {
    const success = await this.sceneManager.transitionToScene(
        initialSceneId,
        this.stateManager.getState(),
        this
    );

    if (success) {
      this.isRunning = true;
      this.eventEmitter.emit('gameStarted', { sceneId: initialSceneId });
      this.eventEmitter.emit('sceneChanged', this.sceneManager.getCurrentScene());
    } else {
      console.error(`Failed to start game at scene '${initialSceneId}'`);
    }
  }

  /**
   * Checks if the game is currently running
   *
   * @returns true if the game is running (start method was called and hasn't ended), false otherwise
   */
  public isGameRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Selects a choice from the current scene and transitions to the next scene
   *
   * @param choiceId ID of the choice to select
   * @returns Promise that resolves after completing the transition to the new scene
   */
  public async selectChoice(choiceId: string): Promise<void> {
    const currentScene = this.sceneManager.getCurrentScene();
    if (!currentScene) return;

    const choice = currentScene.choices.find(c => c.id === choiceId);
    if (!choice) {
      console.error(`Choice with ID '${choiceId}' not found in current scene.`);
      return;
    }

    // Get current state
    const currentState = this.stateManager.getState();

    if (choice.condition && !choice.condition(currentState)) {
      console.warn(`Choice with ID '${choiceId}' is not available.`);
      return;
    }

    this.eventEmitter.emit('choiceSelected', { choice });

    // Apply effects if they exist
    if (choice.effects && choice.effects.length > 0) {
      const newState = this.effectManager.applyEffects(choice.effects, currentState);
      this.stateManager.setState(newState);
      this.eventEmitter.emit('stateChanged', this.stateManager.getState());
    }

    // Get next scene ID
    let nextSceneId: string;
    if (typeof choice.nextScene === 'function') {
      nextSceneId = choice.nextScene(this.stateManager.getState());
    } else {
      nextSceneId = choice.nextScene;
    }

    // Transition to next scene
    const success = await this.sceneManager.transitionToScene(
        nextSceneId,
        this.stateManager.getState(),
        this
    );

    if (success) {
      this.eventEmitter.emit('sceneChanged', this.sceneManager.getCurrentScene());
    }
  }

  /**
   * Registers a content definition with the appropriate loader
   *
   * @param contentDefinition Content definition to register
   * @returns true if registration was successful, false otherwise
   */
  public registerContent<T extends ContentRegistry<any, any>>(
      contentDefinition: ContentDefinition<T>
  ): boolean {
    const { type, content } = contentDefinition;
    const loader = this.loaderRegistry.getLoader(type);

    if (!loader) {
      console.warn(`No loader registered for content type '${type}'`);
      return false;
    }

    loader.registerContent(content);
    return true;
  }

  /**
   * Gets a content loader by type
   *
   * @template T Content type
   * @template K Content ID type
   * @param type Content type identifier
   * @returns Loader for the specified content type or undefined if not found
   */
  public getLoader<T extends object, K extends string = string>(
      type: string
  ): GenericContentLoader<T, K> | undefined {
    return this.loaderRegistry.getLoader<T, K>(type);
  }

  /**
   * Registers a listener for the specified event type
   *
   * @param eventType Type of event to register the listener for
   * @param listener Function to be called when the event occurs
   */
  public on(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.on(eventType, listener);
  }

  /**
   * Unregisters a listener for the specified event type
   *
   * @param eventType Type of event to unregister the listener from
   * @param listener Function that was previously registered as a listener
   */
  public off(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.off(eventType, listener);
  }

  /**
   * Emits an event of the specified type with optional data
   *
   * @param eventType Type of event to emit
   * @param data Optional data to pass to the listeners
   */
  public emit(eventType: GameEventType, data?: any): void {
    this.eventEmitter.emit(eventType, data);
  }

  /**
   * Returns the current game state
   *
   * @returns The current game state
   */
  public getState(): GameState {
    return this.stateManager.getState();
  }

  /**
   * Returns the current scene
   *
   * @returns The current scene or null if no scene is active
   */
  public getCurrentScene(): Scene | null {
    return this.sceneManager.getCurrentScene();
  }

  /**
   * Returns available choices for the current scene, filtered by conditions
   *
   * @returns Array of available choices
   */
  public getAvailableChoices(): Choice[] {
    return this.sceneManager.getAvailableChoices(this.stateManager.getState());
  }

  /**
   * Registers a plugin with the game engine
   *
   * Plugins allow extending engine functionality with features like inventory systems,
   * character management, locations, etc.
   *
   * @param plugin Plugin to register
   */
  public registerPlugin(plugin: Plugin): void {
    this.pluginManager.registerPlugin(plugin);
  }

  /**
   * Unregisters a plugin from the game engine
   *
   * @param pluginName Name of the plugin to unregister
   */
  public unregisterPlugin(pluginName: string): void {
    this.pluginManager.unregisterPlugin(pluginName);
  }

  /**
   * Returns a plugin by name
   *
   * @template T Type of plugin expected
   * @param pluginName Name of the plugin to retrieve
   * @returns Plugin of the requested type or undefined if not found
   */
  public getPlugin<T extends Plugin>(pluginName: string): T | undefined {
    return this.pluginManager.getPlugin<T>(pluginName);
  }

  /**
   * Registers an effect processor for the specified effect type
   *
   * Allows extending the engine with custom effect types that can be triggered
   * during scene transitions or player interactions.
   *
   * @param effectType Type of effect to register the processor for
   * @param processor Function to process effects of the specified type
   */
  public registerEffectProcessor(
      effectType: string,
      processor: (effect: Effect, state: GameState) => void
  ): void {
    this.effectManager.registerEffectProcessor(effectType, processor);
  }

  /**
   * Gets the scene manager instance
   *
   * @returns Scene manager
   */
  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  /**
   * Gets the state manager instance
   *
   * @returns State manager
   */
  public getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * Gets the effect manager instance
   *
   * @returns Effect manager
   */
  public getEffectManager(): EffectManager {
    return this.effectManager;
  }

  /**
   * Gets the plugin manager instance
   *
   * @returns Plugin manager
   */
  public getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Gets the event emitter instance
   *
   * @returns Event emitter
   */
  public getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * Gets the loader registry instance
   *
   * @returns Loader registry
   */
  public getLoaderRegistry(): LoaderRegistry {
    return this.loaderRegistry;
  }
}