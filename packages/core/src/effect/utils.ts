import {
  Effect,
  BatchEffect,
  SequenceEffect,
  ConditionalEffect,
  RepeatEffect,
  SetVariableEffect,
  IncrementVariableEffect,
  DecrementVariableEffect,
  ToggleVariableEffect,
  PushToArrayEffect,
  RemoveFromArrayEffect,
  BuiltInEffectType
} from './types';
import { GameState } from '../state/types';

/**
 * Vytvoří efekt pro nastavení hodnoty proměnné
 */
export function createSetEffect(variable: string, value: any, path?: string): SetVariableEffect {
  return {
    type: BuiltInEffectType.set,
    variable,
    value,
    path
  };
}

/**
 * Vytvoří efekt pro zvýšení hodnoty proměnné
 */
export function createIncrementEffect(variable: string, value = 1, path?: string): IncrementVariableEffect {
  return {
    type: BuiltInEffectType.increment,
    variable,
    value,
    path
  };
}

/**
 * Vytvoří efekt pro snížení hodnoty proměnné
 */
export function createDecrementEffect(variable: string, value = 1, path?: string): DecrementVariableEffect {
  return {
    type: BuiltInEffectType.decrement,
    variable,
    value,
    path
  };
}

/**
 * Vytvoří efekt pro přepnutí boolean hodnoty proměnné
 */
export function createToggleEffect(variable: string, path?: string): ToggleVariableEffect {
  return {
    type: BuiltInEffectType.toggle,
    variable,
    path
  };
}

/**
 * Vytvoří efekt pro přidání hodnoty do pole
 */
export function createPushEffect(array: string, value: any, path?: string): PushToArrayEffect {
  return {
    type: BuiltInEffectType.push,
    array,
    value,
    path
  };
}

/**
 * Vytvoří efekt pro odstranění hodnoty z pole
 */
export function createRemoveEffect(
    array: string,
    value: any,
    options: { byIndex?: boolean; path?: string; equalityFn?: (a: any, b: any) => boolean } = {}
): RemoveFromArrayEffect {
  return {
    type: BuiltInEffectType.remove,
    array,
    value,
    ...options
  };
}

/**
 * Vytvoří efekt pro dávkové provedení více efektů najednou
 */
export function createBatchEffect(effects: Effect[]): BatchEffect {
  return {
    type: BuiltInEffectType.batch,
    effects
  };
}

/**
 * Vytvoří efekt pro sekvenční provedení více efektů
 */
export function createSequenceEffect(effects: Effect[]): SequenceEffect {
  return {
    type: BuiltInEffectType.sequence,
    effects
  };
}

/**
 * Vytvoří efekt pro podmíněné provedení efektů
 */
export function createConditionalEffect(
    condition: (state: GameState) => boolean,
    thenEffects: Effect[],
    elseEffects?: Effect[]
): ConditionalEffect {
  return {
    type: BuiltInEffectType.conditional,
    condition,
    thenEffects,
    elseEffects
  };
}

/**
 * Vytvoří efekt pro opakované provedení jiného efektu
 */
export function createRepeatEffect(
    effect: Effect,
    count: number | ((state: GameState) => number)
): RepeatEffect {
  return {
    type: BuiltInEffectType.repeat,
    count,
    effect
  };
}

/**
 * Převede neuspořádaný seznam efektů na batch efekt
 */
export function toBatchEffect(effects: Effect[]): BatchEffect {
  return createBatchEffect(effects);
}

/**
 * Převede neuspořádaný seznam efektů na sequence efekt
 */
export function toSequenceEffect(effects: Effect[]): SequenceEffect {
  return createSequenceEffect(effects);
}

/**
 * Zkontroluje, zda je efekt určitého typu
 */
export function isEffectOfType<T extends Effect>(effect: Effect, type: BuiltInEffectType | string): effect is T {
  return effect.type === type;
}

/**
 * Zkontroluje, zda je efekt z určitého jmenného prostoru
 */
export function isEffectFromNamespace(effect: Effect, namespace: string): boolean {
  return 'namespace' in effect && (effect as any).namespace === namespace;
}