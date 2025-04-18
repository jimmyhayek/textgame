import {
    GameState,
    StateManagerOptions,
    SerializationOptions,
    StateMetadata,
    PERSISTENT_KEYS_KEY,
    DEFAULT_PERSISTENT_KEYS,
    StateChangedEvent,
    StateMigrationFn,
    StateManagerEvents,
    PersistedState
} from './types';
import { produce } from '../utils/immer';
import { TypedEventEmitter } from '../event/TypedEventEmitter';

/**
 * Aktuální verze formátu stavu
 */
const CURRENT_STATE_VERSION = 1;

/**
 * Spravuje herní stav s důrazem na neměnnost
 * @template T Typ proměnných ve stavu
 */
export class StateManager<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Herní stav
     */
    private state: GameState<T>;

    /**
     * Seznam klíčů, které budou persistovány při serializaci
     * Uloženo mimo stav pro zachování neměnnosti
     */
    private persistentKeys: string[];

    /**
     * Event emitter pro události StateManageru
     */
    private eventEmitter: TypedEventEmitter<StateManagerEvents<T>>;

    /**
     * Callback volaný před serializací stavu
     */
    private onBeforeSerialize?: (state: GameState<T>) => void;

    /**
     * Callback volaný po deserializaci stavu
     */
    private onAfterDeserialize?: (state: GameState<T>) => void;

    /**
     * Statická mapa migračních funkcí
     */
    private static migrations = new Map<number, StateMigrationFn>();

    /**
     * Vytvoří novou instanci StateManager
     * @param options Možnosti konfigurace
     */
    constructor(options: StateManagerOptions<T> = {}) {
        this.state = this.createInitialState(options.initialState || {});
        this.persistentKeys = options.persistentKeys || DEFAULT_PERSISTENT_KEYS;
        this.eventEmitter = new TypedEventEmitter<StateManagerEvents<T>>();
        this.onBeforeSerialize = options.onBeforeSerialize;
        this.onAfterDeserialize = options.onAfterDeserialize;
    }

    /**
     * Vytvoří výchozí herní stav
     * @param initialState Počáteční stav
     */
    private createInitialState(initialState: Partial<GameState<T>>): GameState<T> {
        return {
            visitedScenes: new Set<string>(),
            variables: {} as T,
            ...initialState,
        };
    }

    /**
     * Vrátí aktuální herní stav
     */
    public getState(): GameState<T> {
        return this.state;
    }

    /**
     * Aktualizuje herní stav pomocí Immer
     * @param updater Funkce pro aktualizaci stavu
     * @param source Zdroj změny (volitelné)
     */
    public updateState(updater: (state: GameState<T>) => void, source?: string): void {
        const previousState = this.state;

        this.state = produce(this.state, (draft: GameState<T>) => {
            updater(draft);
        });

        // Emitování události změny stavu
        this.emitStateChanged(previousState, this.state, source);
    }

    /**
     * Nastaví kompletně nový herní stav
     * @param newState Nový stav
     * @param source Zdroj změny (volitelné)
     */
    public setState(newState: GameState<T>, source?: string): void {
        const previousState = this.state;
        this.state = newState;

        // Emitování události změny stavu
        this.emitStateChanged(previousState, this.state, source);
    }

    /**
     * Resetuje stav na výchozí hodnoty
     * @param options Částečný stav k nastavení po resetu
     */
    public resetState(options: Partial<GameState<T>> = {}): void {
        const previousState = this.state;
        this.state = this.createInitialState(options);

        // Emitování události změny stavu
        this.emitStateChanged(previousState, this.state, 'reset');
    }

    /**
     * Serializuje herní stav do JSON řetězce
     * @param options Možnosti serializace
     */
    public serialize(options: SerializationOptions = {}): string {
        const { includeMetadata = true, replacer } = options;

        // Volání callbacku před serializací
        if (this.onBeforeSerialize) {
            this.onBeforeSerialize(this.state);
        }

        // Emitování události před serializací
        this.eventEmitter.emit('beforeSerialize', { state: this.state });

        // Vytvoření serializovatelné kopie stavu
        const serializableState: PersistedState<T> = {} as PersistedState<T>;

        // Přidání pouze perzistentních klíčů
        for (const key of this.persistentKeys) {
            if (key === 'visitedScenes') {
                // Speciální zpracování pro Set
                serializableState.visitedScenes = Array.from(this.state.visitedScenes || []);
            } else if (key in this.state) {
                (serializableState as any)[key] = this.state[key];
            }
        }

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
     * @param serializedState Serializovaný stav
     */
    public deserialize(serializedState: string): void {
        const parsedState = JSON.parse(serializedState) as PersistedState<unknown>;

        // Migrujeme stav na aktuální verzi, pokud je to potřeba
        const migratedState = this.migrateState(parsedState);

        // Převod polí zpět na Set a vytvoření nového stavu
        const newState: GameState<T> = {
            ...this.state, // Zachování neperzistentních klíčů
            visitedScenes: new Set(migratedState.visitedScenes || []),
            variables: migratedState.variables as T
        };

        // Přidání dalších perzistentních vlastností
        for (const key of this.persistentKeys) {
            if (key !== 'visitedScenes' && key !== 'variables' && key in migratedState) {
                (newState as any)[key] = migratedState[key];
            }
        }

        // Odstranění metadat ze stavu
        if ('_metadata' in newState) {
            delete (newState as any)._metadata;
        }

        // Nastavení nového stavu
        this.state = newState;

        // Volání callbacku po deserializaci
        if (this.onAfterDeserialize) {
            this.onAfterDeserialize(this.state);
        }

        // Emitování události po deserializaci
        this.eventEmitter.emit('afterDeserialize', { state: this.state });

        // Emitování události změny stavu
        this.emitStateChanged(null, this.state, 'deserialize');
    }

    /**
     * Migruje stav na aktuální verzi
     * @param state Stav k migraci
     */
    private migrateState(state: PersistedState<unknown>): PersistedState<unknown> {
        // Pokud stav nemá metadata, přidáme je s výchozí verzí 0
        if (!state._metadata) {
            state._metadata = { version: 0, timestamp: Date.now() };
        }

        const stateVersion = state._metadata.version;

        // Pokud je verze stavu aktuální, není potřeba migrace
        if (stateVersion === CURRENT_STATE_VERSION) {
            return state;
        }

        // Postupně aplikujeme migrační funkce
        let migratedState = state;

        for (let v = stateVersion; v < CURRENT_STATE_VERSION; v++) {
            const migrationFn = StateManager.migrations.get(v);

            if (migrationFn) {
                migratedState = migrationFn(migratedState, v, v + 1);

                // Emitování události o aplikaci migrace
                this.eventEmitter.emit('migrationApplied', {
                    fromVersion: v,
                    toVersion: v + 1,
                    state: migratedState as PersistedState<T>
                });
            } else {
                console.warn(`No migration function found for version ${v} to ${v + 1}`);
            }
        }

        // Aktualizace verze v metadatech
        if (migratedState._metadata) {
            migratedState._metadata.version = CURRENT_STATE_VERSION;
        }

        return migratedState;
    }

    /**
     * Získá hodnotu proměnné ze stavu
     * @param name Název proměnné
     * @param defaultValue Výchozí hodnota, pokud proměnná neexistuje
     */
    public getVariable<K extends keyof T>(name: K, defaultValue?: T[K]): T[K] | undefined {
        return this.state.variables[name as string] as T[K] ?? defaultValue;
    }

    /**
     * Nastaví hodnotu proměnné ve stavu
     * @param name Název proměnné
     * @param value Hodnota k nastavení
     */
    public setVariable<K extends keyof T>(name: K, value: T[K]): void {
        this.updateState(state => {
            state.variables[name as string] = value as any;
        }, 'setVariable');
    }

    /**
     * Zkontroluje, zda proměnná existuje ve stavu
     * @param name Název proměnné
     */
    public hasVariable<K extends keyof T>(name: K): boolean {
        return name as string in this.state.variables;
    }

    /**
     * Sloučí externí stav s aktuálním
     * @param externalState Částečný stav k sloučení
     */
    public mergeState(externalState: Partial<GameState<T>>): void {
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
        }, 'mergeState');
    }

    /**
     * Registruje migrační funkci pro konkrétní verzi stavu
     * @param fromVersion Zdrojová verze
     * @param migrationFn Migrační funkce
     * @returns Funkce pro odregistraci migrace
     */
    public static registerMigration(fromVersion: number, migrationFn: StateMigrationFn): () => boolean {
        StateManager.migrations.set(fromVersion, migrationFn);
        return () => StateManager.unregisterMigration(fromVersion);
    }

    /**
     * Odregistruje migrační funkci pro konkrétní verzi stavu
     * @param fromVersion Zdrojová verze
     * @returns True pokud byla migrace úspěšně odregistrována
     */
    public static unregisterMigration(fromVersion: number): boolean {
        return StateManager.migrations.delete(fromVersion);
    }

    /**
     * Získá aktuální verzi formátu stavu
     */
    public static getCurrentStateVersion(): number {
        return CURRENT_STATE_VERSION;
    }

    /**
     * Emituje událost změny stavu
     * @param previousState Předchozí stav
     * @param newState Nový stav
     * @param source Zdroj změny
     */
    private emitStateChanged(previousState: GameState<T> | null, newState: GameState<T>, source?: string): void {
        this.eventEmitter.emit('stateChanged', {
            previousState,
            newState,
            source
        });
    }

    /**
     * Registruje posluchače události
     * @param event Typ události
     * @param listener Funkce volaná při události
     */
    public on<K extends keyof StateManagerEvents<T>>(
        event: K,
        listener: (data: StateManagerEvents<T>[K]) => void
    ): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * Odregistruje posluchače události
     * @param event Typ události
     * @param listener Funkce volaná při události
     */
    public off<K extends keyof StateManagerEvents<T>>(
        event: K,
        listener: (data: StateManagerEvents<T>[K]) => void
    ): void {
        this.eventEmitter.off(event, listener);
    }

    /**
     * Označí scénu jako navštívenou
     * @param sceneKey Klíč scény
     */
    public markSceneVisited(sceneKey: string): void {
        this.updateState(state => {
            state.visitedScenes.add(sceneKey);
        }, 'markSceneVisited');
    }

    /**
     * Zruší označení scény jako navštívené
     * @param sceneKey Klíč scény
     */
    public unmarkSceneVisited(sceneKey: string): void {
        this.updateState(state => {
            state.visitedScenes.delete(sceneKey);
        }, 'unmarkSceneVisited');
    }

    /**
     * Vyčistí seznam navštívených scén
     */
    public clearVisitedScenes(): void {
        this.updateState(state => {
            state.visitedScenes.clear();
        }, 'clearVisitedScenes');
    }

    /**
     * Zkontroluje, zda scéna byla navštívena
     * @param sceneKey Klíč scény
     */
    public hasVisitedScene(sceneKey: string): boolean {
        return this.state.visitedScenes.has(sceneKey);
    }

    /**
     * Vrátí počet navštívených scén
     */
    public getVisitedScenesCount(): number {
        return this.state.visitedScenes.size;
    }

    /**
     * Nastaví seznam klíčů, které budou persistovány při serializaci
     * @param keys Seznam klíčů
     */
    public setPersistentKeys(keys: string[]): void {
        this.persistentKeys = keys;

        // Emitování události o změně perzistentních klíčů
        this.eventEmitter.emit('persistentKeysChanged', { keys });
    }

    /**
     * Vrátí seznam klíčů, které budou persistovány při serializaci
     */
    public getPersistentKeys(): string[] {
        return this.persistentKeys;
    }

    /**
     * Přidá klíč do seznamu perzistentních klíčů
     * @param key Klíč k přidání
     */
    public addPersistentKey(key: string): void {
        if (!this.persistentKeys.includes(key)) {
            this.persistentKeys = [...this.persistentKeys, key];

            // Emitování události o změně perzistentních klíčů
            this.eventEmitter.emit('persistentKeysChanged', { keys: this.persistentKeys });
        }
    }

    /**
     * Odebere klíč ze seznamu perzistentních klíčů
     * @param key Klíč k odebrání
     */
    public removePersistentKey(key: string): void {
        const index = this.persistentKeys.indexOf(key);
        if (index !== -1) {
            this.persistentKeys = [
                ...this.persistentKeys.slice(0, index),
                ...this.persistentKeys.slice(index + 1)
            ];

            // Emitování události o změně perzistentních klíčů
            this.eventEmitter.emit('persistentKeysChanged', { keys: this.persistentKeys });
        }
    }
}