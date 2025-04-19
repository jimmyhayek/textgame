import {
    GameState,
    GameStateManagerOptions,
    DEFAULT_PERSISTENT_KEYS,
    StateChangedEvent,
    GameStateManagerEvents // Importuj typ pro mapu událostí
} from './types';
import { PersistedState } from './persistence/types';
import { produce } from '../utils/immer';
import { TypedEventEmitter } from '../event/TypedEventEmitter';
import { validateState } from './utils';
import { GameEngine } from '../engine/GameEngine'; // Importuj GameEngine

/**
 * Spravuje herní stav s důrazem na neměnnost.
 * @template T Typ proměnných ve stavu
 */
export class GameStateManager<T extends Record<string, unknown> = Record<string, unknown>> {
    private state: GameState<T>;
    private persistentKeys: string[];
    // Emitter specifický pro události tohoto manažeru
    private readonly eventEmitter: TypedEventEmitter<GameStateManagerEvents<T>>;
    private onBeforeSerialize?: (state: GameState<T>) => void;
    private onAfterDeserialize?: (state: GameState<T>) => void;

    /**
     * Vytvoří novou instanci GameStateManager.
     * @param engine Instance GameEngine pro získání typovaného emitteru.
     * @param options Možnosti konfigurace GameStateManageru.
     */
    constructor(engine: GameEngine, options: GameStateManagerOptions<T> = {}) {
        this.state = this.createInitialState(options.initialState || {});
        this.persistentKeys = Array.isArray(options.persistentKeys)
            ? [...options.persistentKeys]
            : [...DEFAULT_PERSISTENT_KEYS];

        // Získání specifického emitteru z enginu
        this.eventEmitter = engine.getStateManagerEventEmitter<T>();

        this.onBeforeSerialize = options.onBeforeSerialize;
        this.onAfterDeserialize = options.onAfterDeserialize;
        this.ensureDefaultPersistentKeys();
    }

    private ensureDefaultPersistentKeys(): void {
        if (!this.persistentKeys.includes('visitedScenes')) {
            this.persistentKeys.push('visitedScenes');
        }
        if (!this.persistentKeys.includes('variables')) {
            this.persistentKeys.push('variables');
        }
    }

    private createInitialState(initialState: Partial<GameState<T>>): GameState<T> {
        const baseState: GameState<T> = {
            visitedScenes: new Set<string>(),
            variables: {} as T,
        };
        const state = { ...baseState, ...initialState } as GameState<T>;

        if (!(state.visitedScenes instanceof Set)) {
            console.warn("GameStateManager: Initial state for visitedScenes was not a Set. Converting to Set.");
            state.visitedScenes = new Set(Array.isArray(state.visitedScenes) ? state.visitedScenes : []);
        }
        if (typeof state.variables !== 'object' || state.variables === null) {
            console.warn("GameStateManager: Initial state for variables was not an object. Initializing as empty object.");
            state.variables = {} as T;
        }
        return state;
    }

    public getState(): GameState<T> {
        return this.state;
    }

    public updateState(updater: (state: GameState<T>) => void, source?: string): void {
        const previousState = this.state;
        this.state = produce(this.state, (draft: GameState<T>) => {
            updater(draft);
        });
        if (this.state !== previousState) {
            this.emitStateChanged(previousState, this.state, source || 'update');
        }
    }

    public setState(newState: GameState<T>, source?: string): void {
        if (!validateState(newState)) {
            console.error("GameStateManager: Attempted to set invalid state.", newState);
            throw new Error("Attempted to set invalid state.");
        }
        const previousState = this.state;
        this.state = newState;
        this.emitStateChanged(previousState, this.state, source || 'setState');
    }

    public applyPersistentState(persistedStateData: PersistedState<T>, source?: string): void {
        const previousState = this.state;
        const newState: GameState<T> = {
            visitedScenes: new Set(Array.isArray(persistedStateData.visitedScenes) ? persistedStateData.visitedScenes : []),
            variables: (typeof persistedStateData.variables === 'object' && persistedStateData.variables !== null ? persistedStateData.variables : {}) as T,
        } as GameState<T>;

        for (const key of this.persistentKeys) {
            if (key === 'visitedScenes' || key === 'variables') continue;
            if (key in persistedStateData && key !== '_metadata') {
                (newState as any)[key] = (persistedStateData as any)[key];
            }
        }

        this.state = newState;

        if (this.onAfterDeserialize) {
            try {
                this.onAfterDeserialize(this.state);
            } catch (error) {
                console.error("Error in onAfterDeserialize callback:", error)
            }
        }

        this.emitStateChanged(previousState, this.state, source || 'applyPersistentState');
    }

    public resetState(options: Partial<GameState<T>> = {}): void {
        const previousState = this.state;
        this.state = this.createInitialState(options);
        this.emitStateChanged(previousState, this.state, 'reset');
    }

    public mergeState(externalState: Partial<GameState<T>>): void {
        this.updateState(state => {
            if (externalState.visitedScenes) {
                const scenesToAdd = externalState.visitedScenes instanceof Set
                    ? externalState.visitedScenes
                    : Array.isArray(externalState.visitedScenes)
                        ? new Set(externalState.visitedScenes)
                        : [];
                for (const sceneKey of scenesToAdd) {
                    state.visitedScenes.add(sceneKey);
                }
            }
            if (externalState.variables && typeof externalState.variables === 'object') {
                Object.assign(state.variables, externalState.variables);
            }
            for (const key in externalState) {
                if (Object.prototype.hasOwnProperty.call(externalState, key) && key !== 'visitedScenes' && key !== 'variables') {
                    (state as any)[key] = (externalState as any)[key];
                }
            }
        }, 'mergeState');
    }

    public getVariable<K extends keyof T>(name: K, defaultValue?: T[K]): T[K] | undefined {
        return this.state.variables[name] ?? defaultValue;
    }

    public setVariable<K extends keyof T>(name: K, value: T[K]): void {
        this.updateState(state => { state.variables[name] = value; }, 'setVariable');
    }

    public hasVariable<K extends keyof T>(name: K): boolean {
        return this.state.variables[name] !== undefined;
    }

    public removeVariable<K extends keyof T>(name: K): void {
        this.updateState(state => { delete state.variables[name]; }, 'removeVariable');
    }

    public markSceneVisited(sceneKey: string): void {
        this.updateState(state => { state.visitedScenes.add(sceneKey); }, 'markSceneVisited');
    }

    public unmarkSceneVisited(sceneKey: string): void {
        this.updateState(state => { state.visitedScenes.delete(sceneKey); }, 'unmarkSceneVisited');
    }

    public clearVisitedScenes(): void {
        this.updateState(state => { state.visitedScenes.clear(); }, 'clearVisitedScenes');
    }

    public hasVisitedScene(sceneKey: string): boolean {
        return this.state.visitedScenes.has(sceneKey);
    }

    public getVisitedScenesCount(): number {
        return this.state.visitedScenes.size;
    }

    public setPersistentKeys(keys: string[]): void {
        this.persistentKeys = Array.isArray(keys) ? [...keys] : [];
        this.ensureDefaultPersistentKeys();
        this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
    }

    public getPersistentKeys(): string[] {
        return [...this.persistentKeys];
    }

    public addPersistentKey(key: string): void {
        if (typeof key !== 'string' || key.length === 0) return;
        if (!this.persistentKeys.includes(key)) {
            this.persistentKeys = [...this.persistentKeys, key];
            this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
        }
    }

    public removePersistentKey(key: string): void {
        if (typeof key !== 'string' || key.length === 0) return;
        if (key === 'visitedScenes' || key === 'variables') {
            console.warn(`GameStateManager: Cannot remove default persistent key "${key}".`);
            return;
        }
        const index = this.persistentKeys.indexOf(key);
        if (index !== -1) {
            this.persistentKeys = [
                ...this.persistentKeys.slice(0, index),
                ...this.persistentKeys.slice(index + 1)
            ];
            this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
        }
    }

    private emitStateChanged(previousState: GameState<T> | null, newState: GameState<T>, source?: string): void {
        const eventData: StateChangedEvent<T> = { previousState, newState, source };
        this.eventEmitter.emit('stateChanged', eventData);
    }

    // Veřejné on/off metody pro naslouchání na události GameStateManageru
    public on<K extends keyof GameStateManagerEvents<T>>(
        event: K,
        listener: (data: GameStateManagerEvents<T>[K]) => void
    ): void {
        this.eventEmitter.on(event, listener);
    }

    public off<K extends keyof GameStateManagerEvents<T>>(
        event: K,
        listener: (data: GameStateManagerEvents<T>[K]) => void
    ): void {
        this.eventEmitter.off(event, listener);
    }

    public getOnBeforeSerializeCallback(): ((state: GameState<T>) => void) | undefined {
        return this.onBeforeSerialize;
    }

    public getOnAfterDeserializeCallback(): ((state: GameState<T>) => void) | undefined {
        return this.onAfterDeserialize;
    }
}