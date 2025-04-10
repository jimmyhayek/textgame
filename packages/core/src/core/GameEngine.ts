import {
  GameState,
  Choice,
  Scene,
  Effect,
  Plugin,
  GameEventType,
  EventListener,
  ContentDefinition,
  ContentRegistry, SceneKey
} from '../types';
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { SceneManager } from './SceneManager';
import { EffectManager } from './EffectManager';
import { PluginManager } from './PluginManager';
import { GenericContentLoader } from '../loaders/GenericContentLoader';
import { LoaderRegistry } from '../loaders/LoaderRegistry';

export interface GameEngineOptions {
  /** Loader scén pro načítání herního obsahu */
  sceneLoader: GenericContentLoader<Scene>;

  /** Počáteční stav hry, který bude sloučen s výchozím prázdným stavem */
  initialState?: Partial<GameState>;

  /** Pluginy, které budou registrovány s enginem */
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

  constructor(options: GameEngineOptions) {
    const {
      sceneLoader,
      initialState = {},
      plugins = []
    } = options;

    this.eventEmitter = new EventEmitter();
    this.stateManager = new StateManager(initialState);
    this.loaderRegistry = new LoaderRegistry();

    // Registrace scén loaderu
    this.loaderRegistry.registerLoader('scenes', sceneLoader);

    // Inicializace scene manager s loaderem scén
    this.sceneManager = new SceneManager(sceneLoader);
    this.effectManager = new EffectManager();
    this.pluginManager = new PluginManager(this);

    // Inicializace pluginů
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }


  public async start(initialSceneKey: SceneKey): Promise<void> {
    const success = await this.sceneManager.transitionToScene(
        initialSceneKey,
        this.stateManager.getState(),
        this
    );

    if (success) {
      this.isRunning = true;
      this.eventEmitter.emit('gameStarted', { sceneKey: initialSceneKey });
      this.eventEmitter.emit('sceneChanged', this.sceneManager.getCurrentScene());
    } else {
      console.error(`Failed to start game at scene '${initialSceneKey}'`);
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

  public async selectChoice(choiceIndex: number): Promise<void> {
    const currentScene = this.sceneManager.getCurrentScene();
    if (!currentScene) return;

    const choice = currentScene.choices[choiceIndex];
    if (!choice) {
      console.error(`Choice with index ${choiceIndex} not found in current scene.`);
      return;
    }

    // Kontrola podmínky volby
    const currentState = this.stateManager.getState();
    if (choice.condition && !choice.condition(currentState)) {
      console.warn(`Choice with index ${choiceIndex} is not available.`);
      return;
    }

    this.eventEmitter.emit('choiceSelected', { choice });

    // Aplikace efektů volby
    if (choice.effects && choice.effects.length > 0) {
      const newState = this.effectManager.applyEffects(choice.effects, currentState);
      this.stateManager.setState(newState);
      this.eventEmitter.emit('stateChanged', this.stateManager.getState());
    }

    // Přechod na další scénu, pokud je specifikována
    if (choice.scene) {
      let nextSceneKey: string;
      if (typeof choice.scene === 'function') {
        nextSceneKey = choice.scene(this.stateManager.getState());
      } else {
        nextSceneKey = choice.scene;
      }

      const success = await this.sceneManager.transitionToScene(
          nextSceneKey,
          this.stateManager.getState(),
          this
      );

      if (success) {
        this.eventEmitter.emit('sceneChanged', this.sceneManager.getCurrentScene());
      }
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

  public getCurrentSceneKey(): SceneKey | null {
    return this.sceneManager.getCurrentSceneKey();
  }
}