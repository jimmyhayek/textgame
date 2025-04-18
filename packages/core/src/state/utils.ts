import { GameState, StateMigrationFn, PersistedState } from './types';
import { StateManager } from './StateManager';
import lodashGet from 'lodash/get';
import lodashSet from 'lodash/set';
import lodashHas from 'lodash/has';
import { produce } from '../utils/immer';

/**
 * Získá hodnotu z herního stavu pomocí cesty (dot notation)
 * @template T Typ očekávaného výstupu
 * @param state Herní stav
 * @param path Cesta k hodnotě (např. 'variables.player.health')
 * @param defaultValue Výchozí hodnota, pokud cesta neexistuje
 */
export function getStatePath<T>(state: GameState<any>, path: string, defaultValue?: T): T | undefined {
    return lodashGet(state, path, defaultValue);
}

/**
 * Nastaví hodnotu v herním stavu pomocí cesty (dot notation)
 * @param state Herní stav
 * @param path Cesta k hodnotě (např. 'variables.player.health')
 * @param value Hodnota k nastavení
 * @returns Nový herní stav
 */
export function setStatePath<T extends Record<string, unknown>>(
    state: GameState<T>,
    path: string,
    value: any
): GameState<T> {
    return produce(state, draft => {
        lodashSet(draft, path, value);
    });
}

/**
 * Zkontroluje, zda cesta existuje v herním stavu
 * @param state Herní stav
 * @param path Cesta k kontrole
 * @returns True pokud cesta existuje
 */
export function hasStatePath(state: GameState<any>, path: string): boolean {
    return lodashHas(state, path);
}

/**
 * Vytvoří snapshot stavu (hluboká kopie)
 * @param state Herní stav
 * @returns Kopie stavu
 */
export function createStateSnapshot<T extends Record<string, unknown>>(state: GameState<T>): GameState<T> {
    // Použijeme JSON.parse/stringify pro hluboké klonování
    // Převedeme Set na pole a zpět
    const serialized = JSON.stringify({
        ...state,
        visitedScenes: Array.from(state.visitedScenes)
    });

    const parsed = JSON.parse(serialized);
    return {
        ...parsed,
        visitedScenes: new Set(parsed.visitedScenes)
    };
}

/**
 * Porovná dva stavy a vrátí rozdíly
 * @param oldState Starý stav
 * @param newState Nový stav
 * @returns Objekt s rozdíly
 */
export function compareStates<T extends Record<string, unknown>>(
    oldState: GameState<T>,
    newState: GameState<T>
): Record<string, any> {
    const differences: Record<string, any> = {};

    // Porovnání visitedScenes
    const oldScenes = Array.from(oldState.visitedScenes);
    const newScenes = Array.from(newState.visitedScenes);
    const addedScenes = newScenes.filter(scene => !oldState.visitedScenes.has(scene));
    const removedScenes = oldScenes.filter(scene => !newState.visitedScenes.has(scene));

    if (addedScenes.length > 0 || removedScenes.length > 0) {
        differences.visitedScenes = {
            added: addedScenes,
            removed: removedScenes
        };
    }

    // Porovnání variables
    const oldVars = oldState.variables;
    const newVars = newState.variables;
    const changedVars: Record<string, { old: any; new: any }> = {};

    // Kontrola změněných a přidaných proměnných
    const allKeys = new Set([...Object.keys(oldVars), ...Object.keys(newVars)]);

    for (const key of allKeys) {
        // Hluboké porovnání může být pomalé pro složité objekty
        // Pro jednoduchost používáme JSON.stringify, ale v produkčním kódu
        // by bylo lepší použít specializovanou knihovnu pro hluboké porovnání
        const oldJson = JSON.stringify(oldVars[key]);
        const newJson = JSON.stringify(newVars[key]);

        if (oldJson !== newJson) {
            changedVars[key] = {
                old: oldVars[key],
                new: newVars[key]
            };
        }
    }

    if (Object.keys(changedVars).length > 0) {
        differences.variables = changedVars;
    }

    // Porovnání ostatních vlastností (první úroveň)
    const excludeKeys = ['visitedScenes', 'variables', '_metadata'];

    for (const key in newState) {
        if (!excludeKeys.includes(key)) {
            // Opět používáme JSON.stringify pro jednoduché hluboké porovnání
            const oldJson = JSON.stringify(oldState[key]);
            const newJson = JSON.stringify(newState[key]);

            if (!(key in oldState) || oldJson !== newJson) {
                differences[key] = {
                    old: oldState[key],
                    new: newState[key]
                };
            }
        }
    }

    for (const key in oldState) {
        if (!excludeKeys.includes(key) && !(key in newState)) {
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
 * @param state Herní stav
 * @returns True pokud je stav validní
 */
export function validateState<T extends Record<string, unknown>>(state: GameState<T>): boolean {
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

/**
 * Vytvoří migrační funkci pro přejmenování proměnné
 * @param variableName Původní název proměnné
 * @param newVariableName Nový název proměnné
 * @returns Migrační funkce
 */
export function createVariableRenameMigration(
    variableName: string,
    newVariableName: string
): StateMigrationFn {
    return (state, fromVersion, toVersion) => {
        if (state.variables && variableName in state.variables) {
            const newState = { ...state };
            newState.variables = { ...state.variables };
            newState.variables[newVariableName] = newState.variables[variableName];
            delete newState.variables[variableName];

            console.log(`Migrated variable '${variableName}' to '${newVariableName}'`);
            return newState;
        }
        return state;
    };
}

/**
 * Vytvoří migrační funkci pro změnu struktury proměnné
 * @param variableName Název proměnné
 * @param transformFn Funkce pro transformaci hodnoty
 * @returns Migrační funkce
 */
export function createVariableTransformMigration<T, U>(
    variableName: string,
    transformFn: (oldValue: T) => U
): StateMigrationFn {
    return (state, fromVersion, toVersion) => {
        if (state.variables && variableName in state.variables) {
            const newState = { ...state };
            newState.variables = { ...state.variables };
            newState.variables[variableName] = transformFn(newState.variables[variableName] as T);

            console.log(`Transformed variable '${variableName}' during migration from v${fromVersion} to v${toVersion}`);
            return newState;
        }
        return state;
    };
}

/**
 * Kombinuje více migračních funkcí do jedné
 * @param migrations Pole migračních funkcí
 * @returns Kombinovaná migrační funkce
 */
export function combineMigrations(...migrations: StateMigrationFn[]): StateMigrationFn {
    return (state, fromVersion, toVersion) => {
        return migrations.reduce((currentState, migration) => {
            return migration(currentState, fromVersion, toVersion);
        }, state);
    };
}

/**
 * Vytvoří migrační funkci pro přidání nové proměnné s výchozí hodnotou
 * @param variableName Název nové proměnné
 * @param defaultValue Výchozí hodnota
 * @returns Migrační funkce
 */
export function createAddVariableMigration<T>(
    variableName: string,
    defaultValue: T
): StateMigrationFn {
    return (state, fromVersion, toVersion) => {
        if (state.variables && !(variableName in state.variables)) {
            const newState = { ...state };
            newState.variables = { ...state.variables };
            newState.variables[variableName] = defaultValue;

            console.log(`Added new variable '${variableName}' during migration from v${fromVersion} to v${toVersion}`);
            return newState;
        }
        return state;
    };
}

/**
 * Vytvoří migrační funkci pro změnu struktury celého stavu
 * @param transformFn Funkce pro transformaci celého stavu
 * @returns Migrační funkce
 */
export function createStateMigration(
    transformFn: (state: PersistedState<unknown>) => PersistedState<unknown>
): StateMigrationFn {
    return (state, fromVersion, toVersion) => {
        try {
            const newState = transformFn(state);
            console.log(`Applied custom state transformation during migration from v${fromVersion} to v${toVersion}`);
            return newState;
        } catch (error) {
            console.error('Error during state migration:', error);
            return state;
        }
    };
}