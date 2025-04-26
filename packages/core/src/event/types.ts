/**
 * Typ pro callback funkci posluchače události
 * Přijímá data události (typ 'any' pro obecný emitter, specifický typ pro TypedEventEmitter)
 */
export type EventListener = (data: any) => void;

/**
 * Typ pro identifikátor události
 * Může být řetězec nebo symbol. Zde používáme string.
 */
export type GameEventType = string;

/**
 * Možnosti pro konfiguraci EventEmitter
 */
export interface EventEmitterOptions {
  /**
   * Zachytávat chyby v posluchačích událostí
   * Výchozí: true
   */
  catchErrors?: boolean;

  /**
   * Maximální počet posluchačů na jeden typ události
   * Výchozí: 10
   */
  maxListeners?: number;
}

/**
 * Data předávaná při události změny scény (patří spíše do scene/types nebo engine/types)
 */
export interface SceneChangedEventData {
  scene: any; // Mělo by být importováno z scene/types
  sceneKey: string; // Mělo by být SceneKey z scene/types
  previousScene?: any;
  previousSceneKey?: string;
  transitionData?: any;
}

/**
 * Data předávaná při události startu hry (patří spíše do engine/types)
 */
export interface GameStartedEventData {
  sceneKey: string; // Mělo by být SceneKey z scene/types
  transitionData?: any;
}

/**
 * Data předávaná při události konce hry (patří spíše do engine/types)
 */
export interface GameEndedEventData {
  reason?: string;
  stats?: Record<string, any>; // nebo specifický typ
}

/**
 * Data předávaná při události aplikace efektu (patří spíše do engine/types nebo effect/types)
 */
export interface EffectAppliedEventData {
  effect: any; // Mělo by být Effect z effect/types
  previousState: any; // Mělo by být GameState
  newState: any; // Mělo by být GameState
}
