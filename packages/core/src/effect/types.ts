import { GameState } from '../state/types';

/**
 * Výčet typů vestavěných efektů
 */
export enum BuiltInEffectType {
  set = 'set',
  increment = 'increment',
  decrement = 'decrement',
  multiply = 'multiply',
  divide = 'divide',
  toggle = 'toggle',

  // Efekty pro pole
  push = 'push',
  remove = 'remove',

  // Kompozitní efekty
  batch = 'batch',
  sequence = 'sequence',
  conditional = 'conditional',
  repeat = 'repeat'
}

/**
 * Typ pro identifikaci efektu (může být vestavěný nebo vlastní)
 */
export type EffectType = BuiltInEffectType | string;

/**
 * Základní rozhraní pro všechny efekty
 */
export interface Effect {
  /**
   * Typ efektu
   */
  type: EffectType;

  /**
   * Indexová signatura pro další vlastnosti
   */
  [key: string]: any;
}

/**
 * Funkce pro zpracování efektu
 */
export type EffectProcessor = (effect: Effect, draftState: GameState) => void;

/**
 * Rozhraní pro efekt z pluginu
 */
export interface PluginEffect extends Effect {
  /**
   * Jmenný prostor pluginu
   */
  namespace: string;
}

// Rozhraní pro kompozitní efekty

/**
 * Efekt pro aplikaci více efektů najednou
 */
export interface BatchEffect extends Effect {
  type: BuiltInEffectType.batch;
  /**
   * Pole efektů k aplikaci
   */
  effects: Effect[];
}

/**
 * Efekt pro sekvenční aplikaci efektů
 */
export interface SequenceEffect extends Effect {
  type: BuiltInEffectType.sequence;
  /**
   * Pole efektů k sekvenční aplikaci
   */
  effects: Effect[];
}

/**
 * Efekt pro podmíněnou aplikaci efektů
 */
export interface ConditionalEffect extends Effect {
  type: BuiltInEffectType.conditional;
  /**
   * Podmínka, která určuje, zda se efekty aplikují
   */
  condition: (state: GameState) => boolean;
  /**
   * Efekty aplikované, pokud je podmínka splněna
   */
  thenEffects: Effect[];
  /**
   * Efekty aplikované, pokud podmínka není splněna
   */
  elseEffects?: Effect[];
}

/**
 * Efekt pro opakování jiného efektu
 */
export interface RepeatEffect extends Effect {
  type: BuiltInEffectType.repeat;
  /**
   * Počet opakování nebo funkce, která vrátí počet opakování
   */
  count: number | ((state: GameState) => number);
  /**
   * Efekt, který se bude opakovat
   */
  effect: Effect;
}

// Rozhraní pro efekty proměnných

/**
 * Základní efekt pro operace s proměnnými
 */
export interface VariableEffect extends Effect {
  /**
   * Název proměnné
   */
  variable: string;
  /**
   * Volitelná cesta k vlastnosti (pro nested properties)
   */
  path?: string;
}

/**
 * Efekt pro nastavení hodnoty proměnné
 */
export interface SetVariableEffect extends VariableEffect {
  type: BuiltInEffectType.set;
  /**
   * Hodnota k nastavení
   */
  value: any;
}

/**
 * Efekt pro zvýšení hodnoty proměnné
 */
export interface IncrementVariableEffect extends VariableEffect {
  type: BuiltInEffectType.increment;
  /**
   * Hodnota k přičtení (výchozí: 1)
   */
  value?: number;
}

/**
 * Efekt pro snížení hodnoty proměnné
 */
export interface DecrementVariableEffect extends VariableEffect {
  type: BuiltInEffectType.decrement;
  /**
   * Hodnota k odečtení (výchozí: 1)
   */
  value?: number;
}

/**
 * Efekt pro násobení hodnoty proměnné
 */
export interface MultiplyVariableEffect extends VariableEffect {
  type: BuiltInEffectType.multiply;
  /**
   * Hodnota, kterou se proměnná vynásobí
   */
  value: number;
}

/**
 * Efekt pro dělení hodnoty proměnné
 */
export interface DivideVariableEffect extends VariableEffect {
  type: BuiltInEffectType.divide;
  /**
   * Hodnota, kterou se proměnná vydělí
   */
  value: number;
}

/**
 * Efekt pro přepnutí hodnoty proměnné (boolean toggle)
 */
export interface ToggleVariableEffect extends VariableEffect {
  type: BuiltInEffectType.toggle;
}

// Rozhraní pro efekty na polích

/**
 * Základní efekt pro operace s poli
 */
export interface ArrayEffect extends Effect {
  /**
   * Název pole
   */
  array: string;
  /**
   * Volitelná cesta k vlastnosti (pro nested properties)
   */
  path?: string;
}

/**
 * Efekt pro přidání hodnoty do pole
 */
export interface PushToArrayEffect extends ArrayEffect {
  type: BuiltInEffectType.push;
  /**
   * Hodnota k přidání do pole
   */
  value: any;
}

/**
 * Efekt pro odstranění hodnoty z pole
 */
export interface RemoveFromArrayEffect extends ArrayEffect {
  type: BuiltInEffectType.remove;
  /**
   * Hodnota k odstranění
   */
  value: any;
  /**
   * Zda se má odstranit podle indexu nebo hodnoty
   */
  byIndex?: boolean;
  /**
   * Volitelná funkce pro porovnání objektů
   */
  equalityFn?: (a: any, b: any) => boolean;
}