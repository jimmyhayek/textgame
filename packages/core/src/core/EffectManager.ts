import { Effect, GameState } from '../types';

export class EffectManager {
    private effectProcessors: Map<string, (effect: Effect, state: GameState) => void> = new Map();

    constructor() {
        this.registerDefaultEffects();
    }

    private registerDefaultEffects(): void {
        this.registerEffectProcessor('SET_VARIABLE', (effect, state) => {
            const { variable, value } = effect;
            state.variables[variable] = value;
        });

        this.registerEffectProcessor('INCREMENT_VARIABLE', (effect, state) => {
            const { variable, value = 1 } = effect;
            if (typeof state.variables[variable] !== 'number') {
                state.variables[variable] = 0;
            }
            state.variables[variable] += value;
        });

        this.registerEffectProcessor('DECREMENT_VARIABLE', (effect, state) => {
            const { variable, value = 1 } = effect;
            if (typeof state.variables[variable] !== 'number') {
                state.variables[variable] = 0;
            }
            state.variables[variable] -= value;
        });
    }

    public registerEffectProcessor(
        effectType: string,
        processor: (effect: Effect, state: GameState) => void
    ): void {
        this.effectProcessors.set(effectType, processor);
    }

    public applyEffect(effect: Effect, state: GameState): void {
        const processor = this.effectProcessors.get(effect.type);
        if (processor) {
            processor(effect, state);
        } else {
            console.warn(`No processor registered for effect type '${effect.type}'`);
        }
    }

    public applyEffects(effects: Effect[], state: GameState): void {
        for (const effect of effects) {
            this.applyEffect(effect, state);
        }
    }
}