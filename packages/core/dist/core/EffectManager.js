"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectManager = void 0;
class EffectManager {
    constructor() {
        this.effectProcessors = new Map();
        this.registerDefaultEffects();
    }
    registerDefaultEffects() {
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
    registerEffectProcessor(effectType, processor) {
        this.effectProcessors.set(effectType, processor);
    }
    applyEffect(effect, state) {
        const processor = this.effectProcessors.get(effect.type);
        if (processor) {
            processor(effect, state);
        }
        else {
            console.warn(`No processor registered for effect type '${effect.type}'`);
        }
    }
    applyEffects(effects, state) {
        for (const effect of effects) {
            this.applyEffect(effect, state);
        }
    }
}
exports.EffectManager = EffectManager;
