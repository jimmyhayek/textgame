/**
 * Typ pro identifikátor události
 * Může být buď z předem definovaných typů, nebo vlastní řetězec
 */
export type GameEventType =
    | 'sceneChanged'
    | 'stateChanged'
    | 'gameStarted'
    | 'gameEnded'
    | 'effectApplied'
    | string;

/**
 * Typ pro callback funkci posluchače události
 */
export type EventListener = (data: any) => void;

/**
 * Data předávaná při události změny scény
 */
export interface SceneChangedEventData {
    /**
     * Nová scéna
     */
    scene: any;

    /**
     * Volitelná data předaná při přechodu
     */
    transitionData?: any;
}

/**
 * Data předávaná při události startu hry
 */
export interface GameStartedEventData {
    /**
     * Klíč počáteční scény
     */
    sceneKey: string;

    /**
     * Volitelná data předaná při startu
     */
    transitionData?: any;
}

/**
 * Data předávaná při události konce hry
 */
export interface GameEndedEventData {
    /**
     * Důvod ukončení hry
     */
    reason?: string;

    /**
     * Konečné skóre nebo jiné metriky
     */
    stats?: Record<string, any>;
}

/**
 * Data předávaná při události aplikace efektu
 */
export interface EffectAppliedEventData {
    /**
     * Aplikovaný efekt
     */
    effect: any;

    /**
     * Stav po aplikaci efektu
     */
    state: any;
}

/**
 * Data předávaná při události změny stavu
 */
export interface StateChangedEventData {
    /**
     * Nový stav
     */
    state: any;

    /**
     * Změny oproti předchozímu stavu
     */
    changes?: Record<string, any>;
}

/**
 * Možnosti pro konfiguraci EventEmitter
 */
export interface EventEmitterOptions {
    /**
     * Zachytávat chyby v posluchačích událostí
     * Pokud true, chyby v posluchačích neukončí zpracování ostatních posluchačů
     * Výchozí: true
     */
    catchErrors?: boolean;

    /**
     * Maximální počet posluchačů na jeden typ události
     * Pokud je překročen, zobrazí se varování (pomáhá odhalit memory leaky)
     * Výchozí: 10
     */
    maxListeners?: number;
}