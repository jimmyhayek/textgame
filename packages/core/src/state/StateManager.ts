import { GameState, StateManagerOptions, SerializationOptions, StateMetadata } from './types';
import { enableMapSet, produce } from 'immer';

// Aktivace podpory pro Map a Set v immer
enableMapSet();

/**
 * Aktuální verze formátu stavu
 */
const CURRENT_STATE_VERSION = 1;

/**
 * Spravuje herní stav s důrazem na neměnnost
 */
export class StateManager {
    private state: GameState;

    /**
     * Vytvoří novou instanci StateManager
     */
    constructor(options: StateManagerOptions = {}) {
        this.state = this.createInitialState(options.initialState || {});
    }

    /**
     * Vytvoří výchozí herní stav
     */
    private createInitialState(initialState: Partial<GameState>): GameState {
        return {
            visitedScenes: new Set<string>(),
            variables: {},
            ...initialState,
        };
    }

    /**
     * Vrátí aktuální herní stav
     */
    public getState(): GameState {
        return this.state;
    }

    /**
     * Aktualizuje herní stav pomocí Immer
     */
    public updateState(updater: (state: GameState) => void): void {
        this.state = produce(this.state, (draft: GameState) => {
            updater(draft);
        });
    }

    /**
     * Nastaví kompletně nový herní stav
     */
    public setState(newState: GameState): void {
        this.state = newState;
    }

    /**
     * Resetuje stav na výchozí hodnoty
     */
    public resetState(options: Partial<GameState> = {}): void {
        this.state = this.createInitialState(options);
    }

    /**
     * Serializuje herní stav do JSON řetězce
     */
    public serialize(options: SerializationOptions = {}): string {
        const { includeMetadata = true, replacer } = options;

        // Vytvoření serializovatelné kopie stavu
        const serializableState: any = {
            ...this.state,
            visitedScenes: Array.from(this.state.visitedScenes || [])
        };

        // Přidání metadat, pokud je požadováno
        if (includeMetadata) {
            serializableState._metadata = this.createStateMetadata();
        }

        return JSON.stringify(serializableState, replacer);
    }

    /**
     * Vytvoří metadata o stavu
     */
    private createStateMetadata(): StateMetadata {
        return {
            version: CURRENT_STATE_VERSION,
            timestamp: Date.now()
        };
    }

    /**
     * Deserializuje JSON řetězec do herního stavu
     */
    public deserialize(serializedState: string): void {
        const parsedState = JSON.parse(serializedState);

        // Převod polí zpět na Set
        const newState: GameState = {
            ...parsedState,
            visitedScenes: new Set(parsedState.visitedScenes || [])
        };

        // Odstranění metadat ze stavu
        if (newState._metadata) {
            delete newState._metadata;
        }

        this.state = newState;
    }

    /**
     * Získá hodnotu proměnné ze stavu
     */
    public getVariable<T>(name: string, defaultValue?: T): T | undefined {
        return this.state.variables[name] as T ?? defaultValue;
    }

    /**
     * Nastaví hodnotu proměnné ve stavu
     */
    public setVariable<T>(name: string, value: T): void {
        this.updateState(state => {
            state.variables[name] = value;
        });
    }

    /**
     * Zkontroluje, zda proměnná existuje ve stavu
     */
    public hasVariable(name: string): boolean {
        return name in this.state.variables;
    }

    /**
     * Sloučí externí stav s aktuálním
     */
    public mergeState(externalState: Partial<GameState>): void {
        this.updateState(state => {
            // Sloučení visitedScenes
            if (externalState.visitedScenes) {
                for (const sceneKey of externalState.visitedScenes) {
                    state.visitedScenes.add(sceneKey);
                }
            }

            // Sloučení variables
            if (externalState.variables) {
                state.variables = {
                    ...state.variables,
                    ...externalState.variables
                };
            }

            // Sloučení ostatních vlastností
            for (const [key, value] of Object.entries(externalState)) {
                if (key !== 'visitedScenes' && key !== 'variables') {
                    state[key] = value;
                }
            }
        });
    }
}