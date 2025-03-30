import { Scene, Choice, GameState, Effect, Plugin, GameEventType, EventListener } from '../types';
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { SceneManager } from './SceneManager';
import { EffectManager } from './EffectManager';
export declare class GameEngine {
    private sceneManager;
    private stateManager;
    private eventEmitter;
    private effectManager;
    private plugins;
    private isRunning;
    constructor(options?: {
        scenes?: Scene[];
        initialState?: Partial<GameState>;
    });
    start(initialSceneId: string): void;
    selectChoice(choiceId: string): void;
    on(eventType: GameEventType, listener: EventListener): void;
    off(eventType: GameEventType, listener: EventListener): void;
    emit(eventType: GameEventType, data?: any): void;
    getState(): GameState;
    getCurrentScene(): Scene | null;
    getAvailableChoices(): Choice[];
    registerEffectProcessor(effectType: string, processor: (effect: Effect, state: GameState) => void): void;
    registerScenes(scenes: Scene[]): void;
    registerPlugin(plugin: Plugin): void;
    unregisterPlugin(pluginName: string): void;
    getPlugin<T extends Plugin>(pluginName: string): T | undefined;
    getEventEmitter(): EventEmitter;
    getStateManager(): StateManager;
    getSceneManager(): SceneManager;
    getEffectManager(): EffectManager;
}
