import { GameState } from '../types/state';

export enum BuiltInEffectType {
  set = 'set',
  increment = 'increment',
  decrement = 'decrement',
  multiply = 'multiply',
  divide = 'divide',
  toggle = 'toggle',

  // Pole efekty
  push = 'push',
  remove = 'remove',

  // Kompozitní efekty
  batch = 'batch',
  sequence = 'sequence',
  conditional = 'conditional',
  repeat = 'repeat'
}

export type EffectType = BuiltInEffectType | string;

export interface Effect {
  type: EffectType;
  [key: string]: any;
}

export type EffectProcessor = (effect: Effect, draftState: GameState) => void;

export interface PluginEffect extends Effect {
  namespace: string;
}

// Kompozitní efekty
export interface BatchEffect extends Effect {
  type: BuiltInEffectType.batch;
  effects: Effect[];
}

export interface SequenceEffect extends Effect {
  type: BuiltInEffectType.sequence;
  effects: Effect[];
}

export interface ConditionalEffect extends Effect {
  type: BuiltInEffectType.conditional;
  condition: (state: GameState) => boolean;
  thenEffects: Effect[];
  elseEffects?: Effect[];
}

export interface RepeatEffect extends Effect {
  type: BuiltInEffectType.repeat;
  count: number | ((state: GameState) => number);
  effect: Effect;
}

// Operace s proměnnými
export interface VariableEffect extends Effect {
  variable: string;
  path?: string;
}

export interface SetVariableEffect extends VariableEffect {
  type: BuiltInEffectType.set;
  value: any;
}

export interface IncrementVariableEffect extends VariableEffect {
  type: BuiltInEffectType.increment;
  value?: number;
}

export interface DecrementVariableEffect extends VariableEffect {
  type: BuiltInEffectType.decrement;
  value?: number;
}

export interface MultiplyVariableEffect extends VariableEffect {
  type: BuiltInEffectType.multiply;
  value: number;
}

export interface DivideVariableEffect extends VariableEffect {
  type: BuiltInEffectType.divide;
  value: number;
}

export interface ToggleVariableEffect extends VariableEffect {
  type: BuiltInEffectType.toggle;
}

// Operace s poli
export interface ArrayEffect extends Effect {
  array: string;
  path?: string;
}

export interface PushToArrayEffect extends ArrayEffect {
  type: BuiltInEffectType.push;
  value: any;
}

export interface RemoveFromArrayEffect extends ArrayEffect {
  type: BuiltInEffectType.remove;
  value: any;
  byIndex?: boolean;
}