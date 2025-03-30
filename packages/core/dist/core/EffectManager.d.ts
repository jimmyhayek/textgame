import { Effect, GameState } from '../types';
export declare class EffectManager {
    private effectProcessors;
    constructor();
    private registerDefaultEffects;
    registerEffectProcessor(effectType: string, processor: (effect: Effect, state: GameState) => void): void;
    applyEffect(effect: Effect, state: GameState): void;
    applyEffects(effects: Effect[], state: GameState): void;
}
