// Importuj správně typy a enumy
import {
  GameEngineOptions,
  GameEngineCoreEvents, // Použij přejmenovaný enum
  GameStartedEventData,
  GameEndedEventData,
  SceneChangedEventData,
  EffectAppliedEventData,
  EngineEventMap, // Import sjednocené mapy
  EngineCoreEventMap, // Import mapy pro core události
} from './types';
import { GameState, GameStateManagerEvents } from '../state/types'; // GameStateManagerEvents z state/types
import { Scene, SceneKey, SceneTransitionOptions } from '../scene/types';
import { Effect } from '../effect/types';
import { EventEmitter } from '../event/EventEmitter';
import { TypedEventEmitter } from '../event/TypedEventEmitter'; // Zkontroluj název souboru!
import { GameStateManager } from '../state'; // GameStateManager z state/index
import { SceneManager } from '../scene/SceneManager';
import { EffectManager } from '../effect/EffectManager';
import { PluginManager } from '../plugin/PluginManager';
import { GenericContentLoader } from '../content/GenericContentLoader';
import { LoaderRegistry } from '../content/LoaderRegistry';
import { SaveManager, SaveEvents, SaveEventMap } from '../save'; // SaveEventMap ze save/index
import { ContentDefinition, ContentRegistry } from '../content/types';
import { Plugin, PluginEvents, PluginEventMap } from '../plugin/types'; // PluginEventMap z plugin/types
import { createSaveManager } from '../save/utils';
import { GameEventType, EventListener } from '../event/types'; // Import z event/types
import { StateManagerPersistenceEvents, PersistedState } from '../state/persistence/types';

/**
 * Hlavní třída herního enginu
 */
export class GameEngine {
  private readonly version: string;
  private readonly eventEmitter: EventEmitter;
  private readonly stateManager: GameStateManager;
  private readonly sceneManager: SceneManager;
  private readonly effectManager: EffectManager;
  private readonly pluginManager: PluginManager;
  private readonly loaderRegistry: LoaderRegistry;
  private readonly saveManager: SaveManager;
  private isRunning: boolean = false;

  constructor(options: GameEngineOptions) {
    const { sceneLoader, initialState = {}, plugins = [], engineVersion = '0.1.0' } = options;

    this.version = engineVersion;
    this.eventEmitter = options.eventEmitter || new EventEmitter();

    // GameStateManager nyní přijímá engine
    this.stateManager = new GameStateManager(this, {
      initialState,
      persistentKeys: options.persistentKeys, // Předání persistentKeys
      onBeforeSerialize: options.onBeforeSerialize, // Předání callbacků
      onAfterDeserialize: options.onAfterDeserialize,
    });

    this.loaderRegistry = new LoaderRegistry();
    this.effectManager = new EffectManager({
      registerDefaultEffects: options.registerDefaultEffects ?? true,
    });
    this.loaderRegistry.registerLoader('scenes', sceneLoader);
    this.sceneManager = new SceneManager(sceneLoader);

    this.pluginManager = new PluginManager(this, this.eventEmitter, {
      autoActivate: options.autoActivatePlugins ?? true,
      allowOverride: options.allowPluginOverride ?? false,
    });

    if (options.saveManager) {
      this.saveManager = options.saveManager;
    } else {
      this.saveManager = createSaveManager(this, {
        storage: options.saveStorage,
        engineVersion: this.version,
        storagePrefix: options.storagePrefix,
        enableAutoSave: options.enableAutoSave,
        autoSaveInterval: options.autoSaveInterval,
        autoSaveSlots: options.autoSaveSlots,
        storageType: options.storageType,
      });
    }

    this.initializePlugins(plugins); // Tato metoda je async
  }

  private async initializePlugins(plugins: Plugin[]): Promise<void> {
    for (const plugin of plugins) {
      // Ošetření chyby při registraci pluginu
      try {
        await this.pluginManager.registerPlugin(plugin);
      } catch (error) {
        console.error(`Failed to register or activate plugin '${plugin.name}':`, error);
        // Emituj engine error
        this.getCoreEventEmitter().emit(GameEngineCoreEvents.ERROR, {
          message: `Plugin registration/activation failed: ${plugin.name}`,
          error,
          context: 'pluginInitialization',
        });
      }
    }
  }

  // --- Typed Emitter Getters ---
  // Vrací typovaný emitter pro všechny události procházející enginem
  public getTypedEventEmitter(): TypedEventEmitter<EngineEventMap> {
    return new TypedEventEmitter<EngineEventMap>(this.eventEmitter);
  }
  // Specifické gettery pro jednotlivé mapy událostí
  public getCoreEventEmitter(): TypedEventEmitter<EngineCoreEventMap> {
    return new TypedEventEmitter<EngineCoreEventMap>(this.eventEmitter);
  }
  public getPluginEventEmitter(): TypedEventEmitter<PluginEventMap> {
    return new TypedEventEmitter<PluginEventMap>(this.eventEmitter);
  }
  public getSaveEventEmitter(): TypedEventEmitter<SaveEventMap> {
    return new TypedEventEmitter<SaveEventMap>(this.eventEmitter);
  }
  public getStateManagerEventEmitter<T extends Record<string, unknown>>(): TypedEventEmitter<
    GameStateManagerEvents<T>
  > {
    return new TypedEventEmitter<GameStateManagerEvents<T>>(this.eventEmitter);
  }
  public getPersistenceEventEmitter<T extends Record<string, unknown>>(): TypedEventEmitter<
    StateManagerPersistenceEvents<T>
  > {
    return new TypedEventEmitter<StateManagerPersistenceEvents<T>>(this.eventEmitter);
  }
  public getGenericEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
  // ---

  public async start(
    initialSceneKey: SceneKey,
    options?: SceneTransitionOptions
  ): Promise<boolean> {
    if (options?.effects && options.effects.length > 0) {
      this.applyEffects(options.effects);
    }

    const success = await this.sceneManager.transitionToScene(
      initialSceneKey,
      this.stateManager.getState(),
      this
    );

    if (success) {
      this.isRunning = true;
      const startEventData: GameStartedEventData = {
        sceneKey: initialSceneKey,
        transitionData: options?.data,
      };
      // Použij core emitter
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.GAME_STARTED, startEventData);

      const sceneChangeEventData: SceneChangedEventData = {
        scene: this.sceneManager.getCurrentScene()!,
        sceneKey: initialSceneKey,
        transitionData: options?.data,
      };
      // Použij core emitter
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.SCENE_CHANGED, sceneChangeEventData);
    } else {
      console.error(`Failed to start game at scene '${initialSceneKey}'`);
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.ERROR, {
        message: `Failed to start game at scene '${initialSceneKey}'`,
        context: 'startGame',
      });
    }
    return success;
  }

  public end(reason?: string, data: Record<string, any> = {}): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    const eventData: GameEndedEventData = { reason, ...data };
    // Použij core emitter
    this.getCoreEventEmitter().emit(GameEngineCoreEvents.GAME_ENDED, eventData);
  }

  public async transitionToScene(
    sceneKey: SceneKey,
    options?: SceneTransitionOptions
  ): Promise<boolean> {
    if (!this.isRunning) {
      console.warn('Cannot transition: game is not running. Call start() first.');
      return false;
    }
    const previousSceneKey = this.sceneManager.getCurrentSceneKey();
    const previousScene = this.sceneManager.getCurrentScene();

    if (options?.effects && options.effects.length > 0) {
      this.applyEffects(options.effects);
    }

    const success = await this.sceneManager.transitionToScene(
      sceneKey,
      this.stateManager.getState(),
      this
    );

    if (success) {
      const eventData: SceneChangedEventData = {
        scene: this.sceneManager.getCurrentScene()!,
        sceneKey,
        previousScene: previousScene ?? undefined,
        previousSceneKey: previousSceneKey ?? undefined,
        transitionData: options?.data,
      };
      // Použij core emitter
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.SCENE_CHANGED, eventData);
    } else {
      console.error(`Failed to transition to scene '${sceneKey}'`);
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.ERROR, {
        message: `Failed to transition to scene '${sceneKey}'`,
        context: 'transitionScene',
      });
    }
    return success;
  }

  public applyEffects(effects: Effect[]): void {
    if (!effects || effects.length === 0) return;

    const currentState = this.stateManager.getState();
    let newState = currentState; // Inicializace pro případ chyby
    try {
      // Předpokládáme, že EffectManager může pracovat s draftem nebo vrátí nový stav
      this.stateManager.updateState(draftState => {
        // Zde EffectManager *musí* modifikovat draft, pokud má být změna efektivní v rámci jednoho updateState
        // Pokud EffectManager vrací nový stav, logika by byla jiná (méně efektivní s Immer)
        this.effectManager.applyEffects(effects, draftState); // Předpokládáme, že toto modifikuje draftState
      }, 'applyEffects');

      newState = this.stateManager.getState(); // Získání nového stavu po úspěšné aktualizaci

      const eventData: EffectAppliedEventData = {
        effect: effects.length === 1 ? effects[0] : { type: 'batch', effects },
        previousState: currentState,
        newState,
      };
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.EFFECT_APPLIED, eventData);
    } catch (error) {
      console.error('Error applying effects:', error);
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.ERROR, {
        message: `Error applying effects`,
        error,
        context: 'applyEffects',
      });
      // Stav zůstane 'currentState', protože updateState selhal nebo nebyl dokončen
    }
  }

  public applyEffect(effect: Effect): void {
    if (!effect) return;
    this.applyEffects([effect]);
  }

  public registerContent(contentDefinition: ContentDefinition<any>): boolean {
    const { type, content } = contentDefinition;
    const loader = this.loaderRegistry.getLoader<any>(type);
    if (!loader) {
      console.warn(`No loader registered for content type '${type}'`);
      return false;
    }
    try {
      loader.registerContent(content);
      return true;
    } catch (error) {
      console.error(`Failed to register content for type '${type}':`, error);
      this.getCoreEventEmitter().emit(GameEngineCoreEvents.ERROR, {
        message: `Failed to register content for type '${type}'`,
        error,
        context: 'registerContent',
      });
      return false;
    }
  }

  public getLoader<T extends object, K extends string = string>(
    type: string
  ): GenericContentLoader<T, K> | undefined {
    return this.loaderRegistry.getLoader<T, K>(type);
  }

  // Obecné on/off/emit pro flexibilitu
  public on(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.on(eventType, listener);
  }
  public off(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.off(eventType, listener);
  }
  public emit(eventType: GameEventType, data?: any): void {
    this.eventEmitter.emit(eventType, data);
  }

  // --- Gettery pro managery ---
  public getState(): GameState {
    return this.stateManager.getState();
  }
  public getCurrentScene(): Scene | null {
    return this.sceneManager.getCurrentScene();
  }
  public getCurrentSceneKey(): SceneKey | null {
    return this.sceneManager.getCurrentSceneKey();
  }
  public getVersion(): string {
    return this.version;
  }
  public isGameRunning(): boolean {
    return this.isRunning;
  }
  public getStateManager(): GameStateManager {
    return this.stateManager;
  }
  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }
  public getEffectManager(): EffectManager {
    return this.effectManager;
  }
  public getPluginManager(): PluginManager {
    return this.pluginManager;
  }
  public getLoaderRegistry(): LoaderRegistry {
    return this.loaderRegistry;
  }
  public getSaveManager(): SaveManager {
    return this.saveManager;
  }

  // --- Metody pro pluginy a ukládání ---
  public async registerPlugin(plugin: Plugin): Promise<boolean> {
    return await this.pluginManager.registerPlugin(plugin);
  }
  public async unregisterPlugin(pluginName: string): Promise<boolean> {
    return await this.pluginManager.unregisterPlugin(pluginName);
  }
  public getPlugin<T extends Plugin>(pluginName: string): T | undefined {
    return this.pluginManager.getPlugin<T>(pluginName);
  }
  public async saveGame(saveId: string, options = {}): Promise<boolean> {
    return await this.saveManager.save(saveId, options);
  }
  public async loadGame(saveId: string): Promise<boolean> {
    return await this.saveManager.load(saveId);
  }
  public async restart(
    options: {
      initialState?: Partial<GameState>;
      initialSceneKey?: SceneKey;
    } = {}
  ): Promise<boolean> {
    if (this.isRunning) {
      this.end('restart');
    }
    this.stateManager.resetState(options.initialState);
    const initialSceneKey =
      options.initialSceneKey || this.sceneManager.getCurrentSceneKey() || 'start';
    return await this.start(initialSceneKey);
  }
}
