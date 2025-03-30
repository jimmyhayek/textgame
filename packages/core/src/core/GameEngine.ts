import { Scene, Choice, GameState, Effect, Plugin, GameEventType, EventListener } from '../types';
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { SceneManager } from './SceneManager';
import { EffectManager } from './EffectManager';

export class GameEngine {
    private sceneManager: SceneManager;
    private stateManager: StateManager;
    private eventEmitter: EventEmitter;
    private effectManager: EffectManager;
    private plugins: Map<string, Plugin> = new Map();
    private isRunning: boolean = false;

    constructor(options: {
        scenes?: Scene[];
        initialState?: Partial<GameState>;
    } = {}) {
        const { scenes = [], initialState = {} } = options;

        this.eventEmitter = new EventEmitter();
        this.stateManager = new StateManager(initialState);
        this.sceneManager = new SceneManager(scenes);
        this.effectManager = new EffectManager();
    }

    public start(initialSceneId: string): void {
        const success = this.sceneManager.transitionToScene(
            initialSceneId,
            this.stateManager.getState(),
            this
        );

        if (success) {
            this.isRunning = true;
            this.eventEmitter.emit('gameStarted', { sceneId: initialSceneId });
        }
    }

    public selectChoice(choiceId: string): void {
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

        const success = this.sceneManager.transitionToScene(
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

    public registerEffectProcessor(
        effectType: string,
        processor: (effect: Effect, state: GameState) => void
    ): void {
        this.effectManager.registerEffectProcessor(effectType, processor);
    }

    public registerScenes(scenes: Scene[]): void {
        this.sceneManager.registerScenes(scenes);
    }

    public registerPlugin(plugin: Plugin): void {
        if (this.plugins.has(plugin.name)) {
            console.warn(`Plugin with name '${plugin.name}' is already registered.`);
            return;
        }

        this.plugins.set(plugin.name, plugin);
        plugin.initialize(this);
    }

    public unregisterPlugin(pluginName: string): void {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            if (plugin.destroy) {
                plugin.destroy();
            }
            this.plugins.delete(pluginName);
        }
    }

    public getPlugin<T extends Plugin>(pluginName: string): T | undefined {
        return this.plugins.get(pluginName) as T | undefined;
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
}