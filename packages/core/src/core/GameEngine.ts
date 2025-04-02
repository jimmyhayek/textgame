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

export interface GameEngineOptions {
  initialState?: Partial<GameState>;
}

export class GameEngine {
  private readonly eventEmitter: EventEmitter;
  private readonly stateManager: StateManager;
  private readonly contentLoader: ContentLoader;
  private readonly sceneManager: SceneManager;
  private readonly effectManager: EffectManager;
  private readonly pluginManager: PluginManager;
  private isRunning: boolean = false;

  constructor(options: GameEngineOptions = {}) {
    const { initialState = {} } = options;

    this.eventEmitter = new EventEmitter();
    this.stateManager = new StateManager(initialState);
    this.contentLoader = new ContentLoader();
    this.sceneManager = new SceneManager(this.contentLoader);
    this.effectManager = new EffectManager();
    this.pluginManager = new PluginManager(this);
  }

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

  public isGameRunning(): boolean {
    return this.isRunning;
  }

  public async selectChoice(choiceId: string): Promise<void> {
    const currentScene = this.sceneManager.getCurrentScene();
    if (!currentScene) return;

    const choice = currentScene.choices.find(c => c.id === choiceId);
    if (!choice) {
      console.error(`Choice with ID '${choiceId}' not found in current scene.`);
      return;
    }

    if (choice.condition && !choice.condition(this.stateManager.getState())) {
      console.warn(`Choice with ID '${choiceId}' is not available.`);
      return;
    }

    this.eventEmitter.emit('choiceSelected', { choice });

    if (choice.effects && choice.effects.length > 0) {
      this.stateManager.updateState(state => {
        this.effectManager.applyEffects(choice.effects!, state);
      });

      this.eventEmitter.emit('stateChanged', this.stateManager.getState());
    }

    let nextSceneId: string;
    if (typeof choice.nextScene === 'function') {
      nextSceneId = choice.nextScene(this.stateManager.getState());
    } else {
      nextSceneId = choice.nextScene;
    }

    const success = await this.sceneManager.transitionToScene(
      nextSceneId,
      this.stateManager.getState(),
      this
    );

    if (success) {
      this.eventEmitter.emit('sceneChanged', this.sceneManager.getCurrentScene());
    }
  }

  public on(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.on(eventType, listener);
  }

  public off(eventType: GameEventType, listener: EventListener): void {
    this.eventEmitter.off(eventType, listener);
  }

  public emit(eventType: GameEventType, data?: any): void {
    this.eventEmitter.emit(eventType, data);
  }

  public getState(): GameState {
    return this.stateManager.getState();
  }

  public getCurrentScene(): Scene | null {
    return this.sceneManager.getCurrentScene();
  }

  public getAvailableChoices(): Choice[] {
    return this.sceneManager.getAvailableChoices(this.stateManager.getState());
  }

  public registerPlugin(plugin: Plugin): void {
    this.pluginManager.registerPlugin(plugin);
  }

  public unregisterPlugin(pluginName: string): void {
    this.pluginManager.unregisterPlugin(pluginName);
  }

  public getPlugin<T extends Plugin>(pluginName: string): T | undefined {
    return this.pluginManager.getPlugin<T>(pluginName);
  }

  public registerEffectProcessor(
    effectType: string,
    processor: (effect: Effect, state: GameState) => void
  ): void {
    this.effectManager.registerEffectProcessor(effectType, processor);
  }

  public getContentLoader(): ContentLoader {
    return this.contentLoader;
  }

  public getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  public getStateManager(): StateManager {
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
}
