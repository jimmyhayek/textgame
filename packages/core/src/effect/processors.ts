import {
  EffectProcessor,
  BuiltInEffectType,
  BatchEffect,
  SequenceEffect,
  ConditionalEffect,
  RepeatEffect,
  Effect, // Import Effect
  VariableEffect, // Import specific effect types if needed later
  ArrayEffect,
} from './types';
import { GameState } from '../state/types';
import { produce } from '../utils/immer';
import get from 'lodash/get';
import set from 'lodash/set';

type ProcessorRegistry = Record<string, EffectProcessor>;

/**
 * Pomocná funkce pro zpracování efektu
 * (Lokální ekvivalent processSingleEffect z EffectManager)
 * @private
 */
function processSingleEffect(
    effect: any, // Keep as any for flexibility within this private helper
    draftState: GameState,
    processors: ProcessorRegistry
): void {
  const processor = processors[effect.type];

  if (processor) {
    processor(effect, draftState);
  } else {
    console.warn(`No processor registered for effect type '${effect.type}'`);
  }
}

/**
 * Vytvoří registry procesorů výchozích efektů
 *
 * @returns Objekt mapující typy efektů na jejich procesory
 */
export function createDefaultEffectProcessors(): ProcessorRegistry {
  const processors: ProcessorRegistry = {};

  // Základní operace s proměnnými
  processors[BuiltInEffectType.set] = (effect, draftState) => {
    const { variable, value, path } = effect;

    if (path) {
      set(draftState, path, value);
    } else {
      // Direct assignment is fine, overwrites previous type
      draftState.variables[variable] = value;
    }
  };

  processors[BuiltInEffectType.increment] = (effect, draftState) => {
    const { variable, value = 1, path } = effect;

    if (path) {
      const currentValue = get(draftState, path, 0);
      // Explicit check for number type
      const newValue = typeof currentValue === 'number' ? currentValue + value : value;
      set(draftState, path, newValue);
    } else {
      const currentValue = draftState.variables[variable];
      // Explicit check for number type before operation
      if (typeof currentValue !== 'number') {
        console.warn(`Increment effect: Variable '${variable}' is not a number. Setting to ${value}.`);
        draftState.variables[variable] = value;
      } else {
        // NOW it's safe to perform arithmetic
        (draftState.variables[variable] as number) += value; // Assertion is safe after check
      }
    }
  };

  processors[BuiltInEffectType.decrement] = (effect, draftState) => {
    const { variable, value = 1, path } = effect;

    if (path) {
      const currentValue = get(draftState, path, 0);
      // Explicit check for number type
      const newValue = typeof currentValue === 'number' ? currentValue - value : -value;
      set(draftState, path, newValue);
    } else {
      const currentValue = draftState.variables[variable];
      // Explicit check for number type before operation
      if (typeof currentValue !== 'number') {
        console.warn(`Decrement effect: Variable '${variable}' is not a number. Setting to ${-value}.`);
        draftState.variables[variable] = -value;
      } else {
        // NOW it's safe to perform arithmetic
        (draftState.variables[variable] as number) -= value; // Assertion is safe after check
      }
    }
  };

  processors[BuiltInEffectType.multiply] = (effect, draftState) => {
    const { variable, value, path } = effect;

    if (path) {
      const currentValue = get(draftState, path, 0);
      // Explicit check for number type
      const newValue = typeof currentValue === 'number' ? currentValue * value : 0;
      set(draftState, path, newValue);
    } else {
      const currentValue = draftState.variables[variable];
      // Explicit check for number type before operation
      if (typeof currentValue !== 'number') {
        console.warn(`Multiply effect: Variable '${variable}' is not a number. Setting to 0.`);
        draftState.variables[variable] = 0;
      } else {
        // NOW it's safe to perform arithmetic
        (draftState.variables[variable] as number) *= value; // Assertion is safe after check
      }
    }
  };

  processors[BuiltInEffectType.divide] = (effect, draftState) => {
    const { variable, value, path } = effect;

    if (value === 0) {
      console.error('Divide effect: Cannot divide by zero'); // Log error instead of throwing
      return; // Stop processing this effect
    }

    if (path) {
      const currentValue = get(draftState, path, 0);
      // Explicit check for number type
      const newValue = typeof currentValue === 'number' ? currentValue / value : 0;
      set(draftState, path, newValue);
    } else {
      const currentValue = draftState.variables[variable];
      // Explicit check for number type before operation
      if (typeof currentValue !== 'number') {
        console.warn(`Divide effect: Variable '${variable}' is not a number. Setting to 0.`);
        draftState.variables[variable] = 0;
      } else {
        // NOW it's safe to perform arithmetic
        (draftState.variables[variable] as number) /= value; // Assertion is safe after check
      }
    }
  };

  processors[BuiltInEffectType.toggle] = (effect, draftState) => {
    const { variable, path } = effect;

    if (path) {
      const currentValue = get(draftState, path, false);
      // Toggle logic works reasonably well even if not strictly boolean
      set(draftState, path, !currentValue);
    } else {
      // Toggle logic works reasonably well even if not strictly boolean
      draftState.variables[variable] = !draftState.variables[variable];
    }
  };

  // Operace s poli
  processors[BuiltInEffectType.push] = (effect, draftState) => {
    const { array: arrayKey, value, path } = effect; // Renamed 'array' to avoid conflict

    if (path) {
      const currentArray = get(draftState, path, []);
      if (!Array.isArray(currentArray)) {
        console.warn(`Push effect (path): Target at path '${path}' is not an array. Overwriting with new array.`);
        set(draftState, path, [value]);
      } else {
        currentArray.push(value); // Direct push on array is fine
      }
    } else {
      const targetArray = draftState.variables[arrayKey];
      // Check if it's an array before pushing
      if (!Array.isArray(targetArray)) {
        console.warn(`Push effect: Variable '${arrayKey}' is not an array. Initializing as new array.`);
        draftState.variables[arrayKey] = [value];
      } else {
        // NOW it's safe to push
        (draftState.variables[arrayKey] as any[]).push(value); // Assertion is safe after check
      }
    }
  };

  processors[BuiltInEffectType.remove] = (effect, draftState) => {
    const { array: arrayKey, value, byIndex = false, path } = effect; // Renamed 'array'

    const removeByIndexOrValue = (arr: any[], val: any, useIndex: boolean) => {
      if (!Array.isArray(arr)) { // Add check if arr is actually an array
        console.warn("Remove effect: Target is not an array.");
        return;
      }
      if (useIndex) {
        const index = typeof val === 'number' ? val : parseInt(String(val), 10); // Ensure index is number
        if (!isNaN(index) && index >= 0 && index < arr.length) {
          arr.splice(index, 1);
        } else {
          console.warn(`Remove effect: Invalid index ${val} for array of length ${arr.length}.`);
        }
      } else {
        // Using findIndex with equalityFn or simple indexOf
        const equalityFn = effect.equalityFn || ((a: any, b: any) => a === b);
        const index = arr.findIndex(item => equalityFn(item, val));
        if (index !== -1) {
          arr.splice(index, 1);
        }
      }
    };

    if (path) {
      const currentArray = get(draftState, path, []);
      if (Array.isArray(currentArray)) {
        removeByIndexOrValue(currentArray, value, byIndex);
      } else {
        console.warn(`Remove effect (path): Target at path '${path}' is not an array.`);
      }
    } else {
      const targetArray = draftState.variables[arrayKey];
      if (Array.isArray(targetArray)) {
        removeByIndexOrValue(targetArray, value, byIndex);
      } else {
        console.warn(`Remove effect: Variable '${arrayKey}' is not an array.`);
      }
    }
  };

  // Kompozitní efekty
  processors[BuiltInEffectType.batch] = (effect, draftState) => {
    const batchEffect = effect as BatchEffect;

    if (!batchEffect.effects || !Array.isArray(batchEffect.effects)) {
      console.error('Batch effect requires an array of effects'); // Log error
      return; // Stop processing
    }

    for (const subEffect of batchEffect.effects) {
      // Pass processors down for potential nested composite effects
      processSingleEffect(subEffect, draftState, processors);
    }
  };

  processors[BuiltInEffectType.sequence] = (effect, draftState) => {
    const sequenceEffect = effect as SequenceEffect;

    if (!sequenceEffect.effects || !Array.isArray(sequenceEffect.effects)) {
      console.error('Sequence effect requires an array of effects'); // Log error
      return; // Stop processing
    }

    for (const subEffect of sequenceEffect.effects) {
      // Pass processors down for potential nested composite effects
      processSingleEffect(subEffect, draftState, processors);
    }
  };

  processors[BuiltInEffectType.conditional] = (effect, draftState) => {
    const conditionalEffect = effect as ConditionalEffect;

    if (!conditionalEffect.condition || typeof conditionalEffect.condition !== 'function') {
      console.error('Conditional effect requires a condition function'); // Log error
      return; // Stop processing
    }

    // It's generally safe to check condition on draftState directly with immer
    // unless the condition relies on complex object identities changed during the draft.
    // Using produce here adds overhead. Let's try direct check first.
    // const immutableState = produce(draftState, () => {}); // Removed for performance
    let conditionResult: boolean;
    try {
      conditionResult = conditionalEffect.condition(draftState); // Check condition on draft
    } catch (e) {
      console.error("Error evaluating conditional effect condition:", e);
      return; // Stop if condition fails
    }


    const effectsToProcess = conditionResult
        ? conditionalEffect.thenEffects
        : conditionalEffect.elseEffects;

    if (effectsToProcess && Array.isArray(effectsToProcess)) {
      if (!conditionalEffect.thenEffects && conditionResult) { // Check required thenEffects
        console.error('Conditional effect requires thenEffects array');
        return;
      }
      for (const subEffect of effectsToProcess) {
        processSingleEffect(subEffect, draftState, processors);
      }
    } else if (conditionResult && !conditionalEffect.thenEffects) {
      console.error('Conditional effect requires thenEffects array'); // Log error
    }
  };

  processors[BuiltInEffectType.repeat] = (effect, draftState) => {
    const repeatEffect = effect as RepeatEffect;

    if (!repeatEffect.effect) {
      console.error('Repeat effect requires an effect to repeat'); // Log error
      return; // Stop processing
    }

    let count: number;
    try {
      if (typeof repeatEffect.count === 'function') {
        // Evaluate count on draft state
        count = repeatEffect.count(draftState);
      } else {
        count = repeatEffect.count;
      }
    } catch (e) {
      console.error("Error evaluating repeat effect count function:", e);
      return; // Stop if count fails
    }


    if (!Number.isInteger(count) || count < 0) {
      console.error(`Repeat count must be a non-negative integer, received: ${count}`); // Log error
      return; // Stop processing
    }

    for (let i = 0; i < count; i++) {
      processSingleEffect(repeatEffect.effect, draftState, processors);
    }
  };

  return processors;
}