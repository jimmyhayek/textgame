import { Effect, EffectProcessor, GameState } from '../types';
import { produce } from '../utils/immer';

/**
 * Manages game effects and their application to the game state
 *
 * EffectManager is responsible for registering and applying effects that
 * modify the game state based on player choices and game events.
 * It uses Immer to ensure immutability when applying effects.
 */
export class EffectManager {
  private effectProcessors: Map<string, EffectProcessor> = new Map();

  /**
   * Creates a new EffectManager instance and registers default effects
   */
  constructor() {
    this.registerDefaultEffects();
  }

  /**
   * Registers default effect processors that handle basic game state changes
   */
  private registerDefaultEffects(): void {
    /**
     * Sets a variable to a specific value
     */
    this.registerEffectProcessor('SET_VARIABLE', (effect, draftState) => {
      const { variable, value } = effect;
      draftState.variables[variable] = value;
    });

    /**
     * Increments a variable by a specified value (or 1 by default)
     */
    this.registerEffectProcessor('INCREMENT_VARIABLE', (effect, draftState) => {
      const { variable, value = 1 } = effect;
      if (typeof draftState.variables[variable] !== 'number') {
        draftState.variables[variable] = 0;
      }
      draftState.variables[variable] += value;
    });

    /**
     * Decrements a variable by a specified value (or 1 by default)
     */
    this.registerEffectProcessor('DECREMENT_VARIABLE', (effect, draftState) => {
      const { variable, value = 1 } = effect;
      if (typeof draftState.variables[variable] !== 'number') {
        draftState.variables[variable] = 0;
      }
      draftState.variables[variable] -= value;
    });
  }

  /**
   * Registers a new effect processor for a specific effect type
   *
   * @param effectType - The type of effect to register for
   * @param processor - The function that will process the effect
   */
  public registerEffectProcessor(effectType: string, processor: EffectProcessor): void {
    this.effectProcessors.set(effectType, processor);
  }

  /**
   * Applies a single effect to the game state using Immer
   *
   * @param effect - The effect to apply
   * @param state - The current game state
   * @returns The new game state after applying the effect
   */
  public applyEffect(effect: Effect, state: GameState): GameState {
    const processor = this.effectProcessors.get(effect.type);
    if (processor) {
      return produce(state, (draftState: GameState) => {
        processor(effect, draftState);
      });
    } else {
      console.warn(`No processor registered for effect type '${effect.type}'`);
      return state;
    }
  }

  /**
   * Applies multiple effects to the game state in sequence
   *
   * @param effects - Array of effects to apply
   * @param state - The current game state
   * @returns The new game state after applying all effects
   */
  public applyEffects(effects: Effect[], state: GameState): GameState {
    if (effects.length === 0) {
      return state;
    }

    return produce(state, (draftState: GameState) => {
      for (const effect of effects) {
        const processor = this.effectProcessors.get(effect.type);
        if (processor) {
          processor(effect, draftState);
        } else {
          console.warn(`No processor registered for effect type '${effect.type}'`);
        }
      }
    });
  }
}