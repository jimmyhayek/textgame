import { Scene, SceneKey } from '../scene';
import { GameState, GameStateManagerEvents, StateManagerPersistenceEvents } from '../state';
import { Effect } from '../effect';
import { Plugin, PluginEventMap } from '../plugin';
import { SaveManager, SaveStorage, SaveEventMap } from '../save';
import { GenericContentLoader } from '../content';
import { EventEmitter } from '../event';

/** Možnosti konfigurace herního enginu */
export interface GameEngineOptions {
    sceneLoader: GenericContentLoader<Scene>;
    initialState?: Partial<GameState>;
    plugins?: Plugin[];
    saveManager?: SaveManager;
    engineVersion?: string;
    eventEmitter?: EventEmitter;
    saveStorage?: SaveStorage;
    allowPluginOverride?: boolean; // Příklad
    storagePrefix?: string; // Příklad
    [key: string]: any;
}

/** Události emitované *přímo* herním enginem (core události) */
export enum GameEngineCoreEvents { // Přejmenováno pro odlišení
    GAME_STARTED = 'game:started',
    GAME_ENDED = 'game:ended',
    SCENE_CHANGED = 'scene:changed', // Scéna se změnila (z pohledu enginu)
    EFFECT_APPLIED = 'effect:applied', // Efekt byl aplikován (z pohledu enginu)
    ERROR = 'engine:error' // Obecná chyba enginu
    // STATE_CHANGED se nyní emituje z GameStateManageru
}

// --- Typy dat pro Core události ---

/** Data předávaná při události startu hry */
export interface GameStartedEventData {
    sceneKey: SceneKey;
    transitionData?: any;
}

/** Data předávaná při události konce hry */
export interface GameEndedEventData {
    reason?: string;
    [key: string]: any;
}

/** Data předávaná při události změny scény */
export interface SceneChangedEventData {
    scene: Scene;
    sceneKey: SceneKey;
    previousScene?: Scene;
    previousSceneKey?: SceneKey;
    transitionData?: any;
}

/** Data předávaná při události aplikace efektu */
export interface EffectAppliedEventData {
    effect: Effect | { type: 'batch', effects: Effect[] }; // Zahrnuje i batch pro applyEffects
    previousState: GameState;
    newState: GameState;
}

/** Data předávaná při události chyby enginu */
export interface EngineErrorEventData {
    message: string;
    error?: Error | unknown;
    context?: string; // Kde chyba nastala
}

// --- Mapa pro Core události ---
export type EngineCoreEventMap = {
    [GameEngineCoreEvents.GAME_STARTED]: GameStartedEventData;
    [GameEngineCoreEvents.GAME_ENDED]: GameEndedEventData;
    [GameEngineCoreEvents.SCENE_CHANGED]: SceneChangedEventData;
    [GameEngineCoreEvents.EFFECT_APPLIED]: EffectAppliedEventData;
    [GameEngineCoreEvents.ERROR]: EngineErrorEventData;
};


/**
 * Sjednocená mapa VŠECH událostí, které mohou procházet přes engine emitter.
 * Zahrnuje core události, události pluginů, ukládání a stavu.
 * Používá se pro typování hlavního `TypedEventEmitter` v GameEngine.
 * Použití `<any>` pro generické typy stavu je zde kompromis,
 * pokud nechceme mít GameEngine závislý na konkrétním typu T stavu.
 */
export type EngineEventMap = EngineCoreEventMap
    & PluginEventMap
    & SaveEventMap
    & GameStateManagerEvents<any> // Události runtime stavu
    & StateManagerPersistenceEvents<any>; // Události persistence stavu


// Přejmenování enum pro konzistenci (můžeš použít i původní GameEngineEvents, pokud chceš)
export const GameEngineEvents = GameEngineCoreEvents;