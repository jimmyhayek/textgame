import { Scene } from '../scene/types';
import { StateManager } from '../state/StateManager';
import { EffectManager } from '../effect/EffectManager';
import { PluginManager } from '../plugin/PluginManager';
import { LoaderRegistry } from '../content/LoaderRegistry';
import { EventEmitter } from '../event/EventEmitter';
import { SaveManager } from '../save/SaveManager';
import { EntityManager } from '../entity/EntityManager';
import { GameState } from '../state/types';
import { SaveStorage } from '../save/types';
import { GenericContentLoader } from '../content/GenericContentLoader';
import { Plugin } from '../plugin/types';
import { SceneKey, SceneTransitionOptions } from '../scene/types';
import { Effect } from '../effect/types';

/**
 * Možnosti konfigurace herního enginu
 */
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

    /** Event emitter pro události enginu (volitelné) */
    eventEmitter?: EventEmitter;

    /** Úložiště pro ukládání her (volitelné) */
    saveStorage?: SaveStorage;

    /** Další konfigurační možnosti specifické pro implementaci */
    [key: string]: any;
}

/**
 * Události emitované herním enginem
 */
export enum GameEngineEvents {
    /** Hra byla zahájena */
    GAME_STARTED = 'gameStarted',

    /** Hra byla ukončena */
    GAME_ENDED = 'gameEnded',

    /** Došlo ke změně scény */
    SCENE_CHANGED = 'sceneChanged',

    /** Došlo ke změně stavu */
    STATE_CHANGED = 'stateChanged',

    /** Byl aplikován efekt na stav */
    EFFECT_APPLIED = 'effectApplied',

    /** Došlo k chybě v enginu */
    ERROR = 'engineError'
}

/**
 * Data předávaná při události startu hry
 */
export interface GameStartedEventData {
    /** Klíč počáteční scény */
    sceneKey: SceneKey;

    /** Volitelná data předaná při startu */
    transitionData?: any;
}

/**
 * Data předávaná při události konce hry
 */
export interface GameEndedEventData {
    /** Důvod ukončení hry */
    reason?: string;

    /** Další data o ukončení */
    [key: string]: any;
}

/**
 * Data předávaná při události změny scény
 */
export interface SceneChangedEventData {
    /** Nová scéna */
    scene: Scene;

    /** Klíč nové scény */
    sceneKey: SceneKey;

    /** Předchozí scéna */
    previousScene?: Scene;

    /** Klíč předchozí scény */
    previousSceneKey?: SceneKey;

    /** Volitelná data předaná při přechodu */
    transitionData?: any;
}

/**
 * Data předávaná při události aplikace efektu
 */
export interface EffectAppliedEventData {
    /** Aplikovaný efekt */
    effect: Effect;

    /** Stav před aplikací efektu */
    previousState: GameState;

    /** Stav po aplikaci efektu */
    newState: GameState;
}