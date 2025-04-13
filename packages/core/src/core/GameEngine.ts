import {
  GameState,
  Choice,
  Scene,
  Effect,
  Plugin,
  GameEventType,
  EventListener,
  ContentDefinition,
  ContentRegistry,
  SceneKey,
  SaveMetadata,
  SaveOptions,
  AutoSaveOptions
} from '../types';
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { SceneManager } from './SceneManager';
import { EffectManager } from './EffectManager';
import { PluginManager } from './PluginManager';
import { GenericContentLoader } from '../loaders/GenericContentLoader';
import { LoaderRegistry } from '../loaders/LoaderRegistry';
import { SaveManager } from '../save/SaveManager';

export interface GameEngineOptions {
  /** Loader scén pro načítání herního obsahu */
  sceneLoader: GenericContentLoader<Scene>;

  /** Počáteční stav hry, který bude sloučen s výchozím prázdným stavem */
  initialState?: Partial<GameState>;

  /** Pluginy, které budou registrovány s enginem */
  plugins?: Plugin[];

  /** SaveManager pro ukládání a načítání her (volitelné) */
  saveManager?: SaveManager;

  /** Verze enginu pro ukládání her (volitelné) */
  engineVersion?: string;
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

  /** Save manager for saving and loading games */
  private readonly saveManager: SaveManager;

  /** Engine version */
  private readonly engineVersion: string;

  /** Flag indicating if the game is running */
  private isRunning: boolean = false;

  /**
   * Creates a new GameEngine instance
   *
   * @param options Options for the game engine
   */
  constructor(options: GameEngineOptions) {
    const {
      sceneLoader,
      initialState = {},
      plugins = [],
      engineVersion = '0.1.0'
    } = options;

    this.engineVersion = engineVersion;
    this.eventEmitter = new EventEmitter();
    this.stateManager = new StateManager(initialState);
    this.loaderRegistry = new LoaderRegistry();
    this.effectManager = new EffectManager();
    this.pluginManager = new PluginManager(this);

    // Registrace loaderu scén
    this.loaderRegistry.registerLoader('scenes', sceneLoader);

    // Inicializace scene manageru
    this.sceneManager = new SceneManager(sceneLoader);

    // Inicializace save manageru
    if (options.saveManager) {
      this.saveManager = options.saveManager;
    } else {
      this.saveManager = new SaveManager(this, { engineVersion });
    }

    // Inicializace pluginů
    this.initializePlugins(plugins);
  }

  /**
   * Initializes plugins
   *
   * @param plugins Array of plugins to initialize
   * @private
   */
  private initializePlugins(plugins: Plugin[]): void {
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }

  /**
   * Starts the game at the specified scene
   *
   * @param initialSceneKey Key of the scene to start at
   * @returns Promise that resolves when the game is started
   */
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

  /**
   * Selects a choice in the current scene
   *
   * @param choiceIndex Index of the choice to select
   * @returns Promise that resolves when the choice is processed
   */
  public async selectChoice(choiceIndex: number): Promise<void> {
    const currentScene = this.sceneManager.getCurrentScene();
    if (!currentScene) return;

    const choice = currentScene.choices[choiceIndex];
    if (!choice) {
      console.error(`Choice with index ${choiceIndex} not found in current scene.`);
      return;
    }

    if (!this.isChoiceAvailable(choice)) {
      console.warn(`Choice with index ${choiceIndex} is not available.`);
      return;
    }

    this.eventEmitter.emit('choiceSelected', { choice });
    await this.processChoice(choice);
  }

  /**
   * Checks if a choice is available based on its condition
   *
   * @param choice The choice to check
   * @returns true if the choice is available, false otherwise
   * @private
   */
  private isChoiceAvailable(choice: Choice): boolean {
    if (!choice.condition) return true;
    return choice.condition(this.stateManager.getState());
  }

  /**
   * Processes a choice by applying its effects and transitioning to the next scene if specified
   *
   * @param choice The choice to process
   * @returns Promise that resolves when the choice is processed
   * @private
   */
  private async processChoice(choice: Choice): Promise<void> {
    // Aplikace efektů volby
    if (choice.effects && choice.effects.length > 0) {
      this.applyChoiceEffects(choice.effects);
    }

    // Přechod na další scénu, pokud je specifikována
    if (choice.scene) {
      await this.transitionToNextScene(choice);
    }
  }

  /**
   * Applies effects of a choice to the game state
   *
   * @param effects Array of effects to apply
   * @private
   */
  private applyChoiceEffects(effects: Effect[]): void {
    const currentState = this.stateManager.getState();
    const newState = this.effectManager.applyEffects(effects, currentState);
    this.stateManager.setState(newState);
    this.eventEmitter.emit('stateChanged', this.stateManager.getState());
  }

  /**
   * Transitions to the next scene based on a choice
   *
   * @param choice The choice containing the scene to transition to
   * @returns Promise that resolves when the transition is complete
   * @private
   */
  private async transitionToNextScene(choice: Choice): Promise<void> {
    let nextSceneKey: string;
    if (typeof choice.scene === 'function') {
      nextSceneKey = choice.scene(this.stateManager.getState());
    } else {
      nextSceneKey = choice.scene as string;
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
   * Returns the key of the current scene
   *
   * @returns The current scene key or null if no scene is active
   */
  public getCurrentSceneKey(): SceneKey | null {
    return this.sceneManager.getCurrentSceneKey();
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

  /**
   * Gets the save manager instance
   *
   * @returns Save manager
   */
  public getSaveManager(): SaveManager {
    return this.saveManager;
  }

  /**
   * Gets the engine version
   *
   * @returns Engine version
   */
  public getEngineVersion(): string {
    return this.engineVersion;
  }

  /**
   * Saves the current game state
   *
   * @param saveId ID for the save
   * @param options Save options
   * @returns Promise that resolves to true if save was successful
   */
  public async saveGame(saveId: string, options: SaveOptions = {}): Promise<boolean> {
    return await this.saveManager.save(saveId, options);
  }

  /**
   * Loads a saved game
   *
   * @param saveId ID of the save to load
   * @returns Promise that resolves to true if load was successful
   */
  public async loadGame(saveId: string): Promise<boolean> {
    return await this.saveManager.load(saveId);
  }

  /**
   * Gets a list of all saved games
   *
   * @returns Promise that resolves to an object mapping save IDs to metadata
   */
  public async getSavedGames(): Promise<Record<string, SaveMetadata>> {
    return await this.saveManager.getSaves();
  }

  /**
   * Performs a quick save
   *
   * @returns Promise that resolves to true if save was successful
   */
  public async quickSave(): Promise<boolean> {
    return await this.saveManager.quickSave();
  }

  /**
   * Performs a quick load
   *
   * @returns Promise that resolves to true if load was successful
   */
  public async quickLoad(): Promise<boolean> {
    return await this.saveManager.quickLoad();
  }

  /**
   * Enables auto saving
   *
   * @param options Auto save options
   */
  public enableAutoSave(options: AutoSaveOptions = {}): void {
    this.saveManager.enableAutoSave(options);
  }

  /**
   * Disables auto saving
   */
  public disableAutoSave(): void {
    this.saveManager.disableAutoSave();
  }
}