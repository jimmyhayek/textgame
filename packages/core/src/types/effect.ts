import { GameState } from './state';

/**
 * Represents an effect that can modify game state
 *
 * Effects are atomic units of state change that can be applied
 * to the game state in response to player actions, scene transitions,
 * or other game events.
 */
export interface Effect {
  /**
   * The type of effect, used to determine which processor handles it
   */
  type: string;

  /**
   * Additional properties specific to the effect type
   */
  [key: string]: any;
}

/**
 * Function signature for effect processors
 *
 * Effect processors modify the draft state directly (thanks to Immer)
 * without needing to return a new state
 *
 * @param effect - The effect to process
 * @param draftState - The mutable draft of the game state (provided by Immer)
 */
export type EffectProcessor = (effect: Effect, draftState: GameState) => void;