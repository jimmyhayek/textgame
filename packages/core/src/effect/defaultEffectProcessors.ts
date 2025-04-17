import {
    EffectProcessor,
    BuiltInEffectType,
    BatchEffect,
    SequenceEffect,
    ConditionalEffect,
    RepeatEffect,
} from './types';
import { GameState } from '../types';
import { produce } from '../utils/immer';
import get from 'lodash/get';
import set from 'lodash/set';

type ProcessorRegistry = Record<string, EffectProcessor>;

/**
 * Registruje všechny výchozí procesory efektů
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
            draftState.variables[variable] = value;
        }
    };

    processors[BuiltInEffectType.increment] = (effect, draftState) => {
        const { variable, value = 1, path } = effect;

        if (path) {
            const currentValue = get(draftState, path, 0);
            const newValue = typeof currentValue !== 'number' ? value : currentValue + value;
            set(draftState, path, newValue);
        } else {
            if (typeof draftState.variables[variable] !== 'number') {
                draftState.variables[variable] = 0;
            }
            draftState.variables[variable] += value;
        }
    };

    processors[BuiltInEffectType.decrement] = (effect, draftState) => {
        const { variable, value = 1, path } = effect;

        if (path) {
            const currentValue = get(draftState, path, 0);
            const newValue = typeof currentValue !== 'number' ? -value : currentValue - value;
            set(draftState, path, newValue);
        } else {
            if (typeof draftState.variables[variable] !== 'number') {
                draftState.variables[variable] = 0;
            }
            draftState.variables[variable] -= value;
        }
    };

    processors[BuiltInEffectType.multiply] = (effect, draftState) => {
        const { variable, value, path } = effect;

        if (path) {
            const currentValue = get(draftState, path, 0);
            const newValue = typeof currentValue !== 'number' ? 0 : currentValue * value;
            set(draftState, path, newValue);
        } else {
            if (typeof draftState.variables[variable] !== 'number') {
                draftState.variables[variable] = 0;
            }
            draftState.variables[variable] *= value;
        }
    };

    processors[BuiltInEffectType.divide] = (effect, draftState) => {
        const { variable, value, path } = effect;

        if (value === 0) {
            throw new Error('Cannot divide by zero');
        }

        if (path) {
            const currentValue = get(draftState, path, 0);
            const newValue = typeof currentValue !== 'number' ? 0 : currentValue / value;
            set(draftState, path, newValue);
        } else {
            if (typeof draftState.variables[variable] !== 'number') {
                draftState.variables[variable] = 0;
            }
            draftState.variables[variable] /= value;
        }
    };

    processors[BuiltInEffectType.toggle] = (effect, draftState) => {
        const { variable, path } = effect;

        if (path) {
            const currentValue = get(draftState, path, false);
            set(draftState, path, !currentValue);
        } else {
            draftState.variables[variable] = !draftState.variables[variable];
        }
    };

    // Operace s poli
    processors[BuiltInEffectType.push] = (effect, draftState) => {
        const { array, value, path } = effect;

        if (path) {
            const currentArray = get(draftState, path, []);
            if (!Array.isArray(currentArray)) {
                set(draftState, path, [value]);
            } else {
                currentArray.push(value);
            }
        } else {
            if (!Array.isArray(draftState.variables[array])) {
                draftState.variables[array] = [];
            }
            draftState.variables[array].push(value);
        }
    };

    processors[BuiltInEffectType.remove] = (effect, draftState) => {
        const { array, value, byIndex = false, path } = effect;

        const removeByIndexOrValue = (arr: any[], val: any, useIndex: boolean) => {
            if (useIndex) {
                if (val >= 0 && val < arr.length) {
                    arr.splice(val, 1);
                }
            } else if (typeof val === 'object') {
                // Pro objektové hodnoty hledáme podle equality funkce, pokud je poskytnuta
                const equalityFn = effect.equalityFn || ((a: any, b: any) => a === b);
                const index = arr.findIndex(item => equalityFn(item, val));
                if (index !== -1) {
                    arr.splice(index, 1);
                }
            } else {
                const index = arr.indexOf(val);
                if (index !== -1) {
                    arr.splice(index, 1);
                }
            }
        };

        if (path) {
            const currentArray = get(draftState, path, []);
            if (Array.isArray(currentArray)) {
                removeByIndexOrValue(currentArray, value, byIndex);
            }
        } else {
            if (Array.isArray(draftState.variables[array])) {
                removeByIndexOrValue(draftState.variables[array], value, byIndex);
            }
        }
    };

    // Kompozitní efekty
    processors[BuiltInEffectType.batch] = (effect, draftState) => {
        const batchEffect = effect as BatchEffect;

        if (!batchEffect.effects || !Array.isArray(batchEffect.effects)) {
            throw new Error('Batch effect requires an array of effects');
        }

        for (const subEffect of batchEffect.effects) {
            processSingleEffect(subEffect, draftState, processors);
        }
    };

    processors[BuiltInEffectType.sequence] = (effect, draftState) => {
        const sequenceEffect = effect as SequenceEffect;

        if (!sequenceEffect.effects || !Array.isArray(sequenceEffect.effects)) {
            throw new Error('Sequence effect requires an array of effects');
        }

        for (const subEffect of sequenceEffect.effects) {
            processSingleEffect(subEffect, draftState, processors);
        }
    };

    processors[BuiltInEffectType.conditional] = (effect, draftState) => {
        const conditionalEffect = effect as ConditionalEffect;

        if (!conditionalEffect.condition || typeof conditionalEffect.condition !== 'function') {
            throw new Error('Conditional effect requires a condition function');
        }

        if (!conditionalEffect.thenEffects || !Array.isArray(conditionalEffect.thenEffects)) {
            throw new Error('Conditional effect requires thenEffects array');
        }

        // Pro vyhodnocení podmínky použijeme immutable kopii stavu
        const immutableState = produce(draftState, () => {});
        const conditionResult = conditionalEffect.condition(immutableState);

        if (conditionResult) {
            // Aplikujeme 'then' efekty
            for (const subEffect of conditionalEffect.thenEffects) {
                processSingleEffect(subEffect, draftState, processors);
            }
        } else if (conditionalEffect.elseEffects && Array.isArray(conditionalEffect.elseEffects)) {
            // Aplikujeme 'else' efekty, pokud existují
            for (const subEffect of conditionalEffect.elseEffects) {
                processSingleEffect(subEffect, draftState, processors);
            }
        }
    };

    processors[BuiltInEffectType.repeat] = (effect, draftState) => {
        const repeatEffect = effect as RepeatEffect;

        if (!repeatEffect.effect) {
            throw new Error('Repeat effect requires an effect to repeat');
        }

        let count: number;

        if (typeof repeatEffect.count === 'function') {
            // Pro vyhodnocení počtu opakování použijeme immutable kopii stavu
            const immutableState = produce(draftState, () => {});
            count = repeatEffect.count(immutableState);
        } else {
            count = repeatEffect.count;
        }

        if (!Number.isInteger(count) || count < 0) {
            throw new Error('Repeat count must be a non-negative integer');
        }

        for (let i = 0; i < count; i++) {
            processSingleEffect(repeatEffect.effect, draftState, processors);
        }
    };

    return processors;
}

/**
 * Pomocná funkce pro zpracování efektu
 * (Lokální ekvivalent processSingleEffect z EffectManager)
 */
function processSingleEffect(
    effect: any,
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