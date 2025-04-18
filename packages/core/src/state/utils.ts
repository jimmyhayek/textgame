import { GameState } from './types';
import lodashGet from 'lodash/get';
import lodashSet from 'lodash/set';
import lodashHas from 'lodash/has';

/**
 * Získá hodnotu z herního stavu pomocí cesty (dot notation)
 */
export function getStatePath<T>(state: GameState, path: string, defaultValue?: T): T | undefined {
    return lodashGet(state, path, defaultValue);
}

/**
 * Nastaví hodnotu v herním stavu pomocí cesty (dot notation)
 */
export function setStatePath(state: GameState, path: string, value: any): GameState {
    lodashSet(state, path, value);
    return state;
}

/**
 * Zkontroluje, zda cesta existuje v herním stavu
 */
export function hasStatePath(state: GameState, path: string): boolean {
    return lodashHas(state, path);
}

/**
 * Vytvoří snapshot stavu (hluboká kopie)
 */
export function createStateSnapshot(state: GameState): GameState {
    return JSON.parse(JSON.stringify({
        ...state,
        visitedScenes: Array.from(state.visitedScenes)
    }));
}

/**
 * Porovná dva stavy a vrátí rozdíly
 */
export function compareStates(oldState: GameState, newState: GameState): Record<string, any> {
    const differences: Record<string, any> = {};

    // Porovnání visitedScenes
    const oldScenes = Array.from(oldState.visitedScenes);
    const newScenes = Array.from(newState.visitedScenes);
    const addedScenes = newScenes.filter(scene => !oldState.visitedScenes.has(scene));

    if (addedScenes.length > 0) {
        differences.visitedScenes = { added: addedScenes };
    }

    // Porovnání variables
    const oldVars = oldState.variables;
    const newVars = newState.variables;
    const changedVars: Record<string, { old: any; new: any }> = {};

    // Kontrola změněných a přidaných proměnných
    for (const key in newVars) {
        if (!(key in oldVars) || oldVars[key] !== newVars[key]) {
            changedVars[key] = {
                old: oldVars[key],
                new: newVars[key]
            };
        }
    }

    // Kontrola odstraněných proměnných
    for (const key in oldVars) {
        if (!(key in newVars)) {
            changedVars[key] = {
                old: oldVars[key],
                new: undefined
            };
        }
    }

    if (Object.keys(changedVars).length > 0) {
        differences.variables = changedVars;
    }

    // Porovnání ostatních vlastností (první úroveň)
    for (const key in newState) {
        if (key !== 'visitedScenes' && key !== 'variables') {
            if (!(key in oldState) || oldState[key] !== newState[key]) {
                differences[key] = {
                    old: oldState[key],
                    new: newState[key]
                };
            }
        }
    }

    for (const key in oldState) {
        if (key !== 'visitedScenes' && key !== 'variables' && !(key in newState)) {
            differences[key] = {
                old: oldState[key],
                new: undefined
            };
        }
    }

    return differences;
}

/**
 * Validuje herní stav
 */
export function validateState(state: GameState): boolean {
    if (!state) return false;

    // Kontrola základní struktury
    if (!state.variables || typeof state.variables !== 'object') {
        return false;
    }

    // Kontrola visitedScenes
    if (!state.visitedScenes) {
        return false;
    }

    // Pro jistotu zajistíme, že visitedScenes je Set
    if (!(state.visitedScenes instanceof Set)) {
        try {
            // Pokus o konverzi, pokud to není Set (např. po deserializaci)
            if (Array.isArray(state.visitedScenes)) {
                state.visitedScenes = new Set(state.visitedScenes);
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    return true;
}