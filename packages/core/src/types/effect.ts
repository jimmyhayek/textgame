import { GameState } from './state';

export interface Effect {
    type: string;
    [key: string]: any;
}

export type EffectProcessor = (effect: Effect, state: GameState) => void;