import {
  GameState,
  Choice,
  Scene,
  SceneId,
  Effect,
  Plugin,
  GameEventType,
  EventListener,
} from '../types';
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { SceneManager } from './SceneManager';
import { EffectManager } from './EffectManager';
import { ContentLoader } from './ContentLoader';
import { PluginManager } from './PluginManager';

/**
 * Configuration options for the game engine initialization
 */
export interface GameEngineOptions {
  /** Initial game state that will be merged with the default empty state */
  initialState?: Partial<GameState>;
}

/**
 * Main game engine class for interactive text games
 *
 * The engine manages game state, scenes, transitions between scenes,
 * effect processing, and provides a plugin architecture for extending functionality.
 * It uses Immer under the hood for immutable state management.
 */
export class GameEngine {
  private readonly eventEmitter: EventEmitter;
  private readonly stateManager: StateManager;
  private readonly contentLoader: ContentLoader;
  private readonly sceneManager: SceneManager;
  private readonly effectManager: EffectManager;
  private readonly pluginManager: PluginManager;
  private isRunning: boolean = false;

  /**
   * Creates a new game engine instance
   *
   * @param options - Configuration options for the engine
   */
  constructor(options: GameEngineOptions = {}) {
    const { initialState = {} } = options;

    this.eventEmitter = new EventEmitter();
    this.stateManager = new StateManager(initialState);
    this.contentLoader = new ContentLoader();
    this.sceneManager = new SceneManager(this.contentLoader);
    this.effectManager = new EffectManager();
    this.pluginManager = new PluginManager(this);
  }

  /**
   * Starts the game beginning with the specified scene
   *
   * @param initialSceneId - ID of the scene to start the game with
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
   * @param choiceId - ID of the choice to select
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

    // Získat aktuální stav
    const currentState = this.stateManager.getState();

    if (choice.condition && !choice.condition(currentState)) {
      console.warn(`Choice with ID '${choiceId}' is not available.`);
      return;
    }

    this.eventEmitter.emit('choiceSelected', { choice });

    // Aplikovat efekty, pokud existují
    if (choice.effects && choice.effects.length > 0) {
      const newState = this.effectManager.applyEffects(choice.effects, currentState);
      this.stateManager.setState(newState);
      this.eventEmitter.emit('stateChanged', this.stateManager.getState());
    }

    // Získat ID další scény
    let nextSceneId: string;
    if (typeof choice.nextScene === 'function') {
      nextSceneId = choice.nextScene(this.stateManager.getState());
    } else {
      nextSceneId = choice.nextScene;
    }

    // Přejít na další scénu
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
   * Registers a listener for the specified event type
   *
   * @param eventType - Type of event to register the listener for
   * @param listener - Function to be called when the event occurs
   */
  public on(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.on(eventType, listener);
  }

  /**
   * Unregisters a listener for the specified event type
   *
   * @param eventType - Type of event to unregister the listener from
   * @param listener - Function that was previously registered as a listener
   */
  public off(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.off(eventType, listener);
  }

  /**
   * Emits an event of the specified type with optional data
   *
   * @param eventType - Type of event to emit
   * @param data - Optional data to pass to the listeners
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
   * @param plugin - Plugin to register
   */
  public registerPlugin(plugin: Plugin): void {
    this.pluginManager.registerPlugin(plugin);
  }

  /**
   * Unregisters a plugin from the game engine
   *
   * @param pluginName - Name of the plugin to unregister
   */
  public unregisterPlugin(pluginName: string): void {
    this.pluginManager.unregisterPlugin(pluginName);
  }

  /**
   * Returns a plugin by name
   *
   * @template T - Type of plugin expected
   * @param pluginName - Name of the plugin to retrieve
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
   * @param effectType - Type of effect to register the processor for
   * @param processor - Function to process effects of the specified type
   */
  public registerEffectProcessor(
      effectType: string,
      processor: (effect: Effect, state: GameState) => void
  ): void {
    this.effectManager.registerEffectProcessor(effectType, processor);
  }

  /**
   * Returns the ContentLoader responsible for loading game content
   *
   * @returns The ContentLoader instance
   */
  public getContentLoader(): ContentLoader {
    return this.contentLoader;
  }

  /**
   * Returns the EventEmitter responsible for event management
   *
   * @returns The EventEmitter instance
   */
  public getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * Returns the StateManager responsible for game state management
   *
   * @returns The StateManager instance
   */
  public getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * Returns the SceneManager responsible for scene and transition management
   *
   * @returns The SceneManager instance
   */
  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  /**
   * Returns the EffectManager responsible for processing effects
   *
   * @returns The EffectManager instance
   */
  public getEffectManager(): EffectManager {
    return this.effectManager;
  }

  /**
   * Returns the PluginManager responsible for plugin management
   *
   * @returns The PluginManager instance
   */
  public getPluginManager(): PluginManager {
    return this.pluginManager;
  }
}