/**
 * Základní herní stav
 * Obsahuje základní strukturu pro ukládání herního stavu
 * @template T Typ pro proměnné, výchozí je prázdný objekt
 */
export interface GameState<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Množina klíčů navštívených scén
     */
    visitedScenes: Set<string>;

    /**
     * Úložiště herních proměnných
     */
    variables: T;

    /**
     * Indexová signatura pro další vlastnosti
     * Umožňuje rozšiřování stavu pluginy a dalšími komponentami
     */
    [key: string]: any;
}

/**
 * Klíč pro perzistentní vlastnosti ve stavu - pouze pro interní použití
 */
export const PERSISTENT_KEYS_KEY = '__persistentKeys';

/**
 * Výchozí perzistentní klíče
 */
export const DEFAULT_PERSISTENT_KEYS = ['visitedScenes', 'variables'];

/**
 * Funkce pro aktualizaci herního stavu
 * Používá se s immer pro bezpečné mutace
 * @template T Typ proměnných ve stavu
 */
export type StateUpdater<T extends Record<string, unknown> = Record<string, unknown>> = (state: GameState<T>) => void;

/**
 * Možnosti pro vytvoření StateManager
 * @template T Typ proměnných ve stavu
 */
export interface StateManagerOptions<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Počáteční stav, který bude sloučen s výchozím prázdným stavem
     */
    initialState?: Partial<GameState<T>>;

    /**
     * Seznam klíčů, které budou persistovány při serializaci
     */
    persistentKeys?: string[];

    /**
     * Callback volaný před serializací stavu
     */
    onBeforeSerialize?: (state: GameState<T>) => void;

    /**
     * Callback volaný po deserializaci stavu
     */
    onAfterDeserialize?: (state: GameState<T>) => void;
}

/**
 * Možnosti pro serializaci stavu
 */
export interface SerializationOptions {
    /**
     * Zda zahrnout metadata o stavu (např. verzi enginu)
     * Výchozí: true
     */
    includeMetadata?: boolean;

    /**
     * Vlastní replacer funkce pro JSON.stringify
     */
    replacer?: (key: string, value: any) => any;

    /**
     * Další volby specifické pro implementaci
     */
    [key: string]: any;
}

/**
 * Metadata o stavu
 */
export interface StateMetadata {
    /**
     * Verze formátu stavu
     */
    version: number;

    /**
     * Časové razítko vytvoření
     */
    timestamp: number;

    /**
     * Další metadata
     */
    [key: string]: any;
}

/**
 * Data předávaná při události změny stavu
 */
export interface StateChangedEvent<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Předchozí stav
     */
    previousState: GameState<T> | null;

    /**
     * Nový stav
     */
    newState: GameState<T>;

    /**
     * Zdroj změny (např. 'effect', 'scene', 'plugin', atd.)
     */
    source?: string;
}

/**
 * Typ pro migrační funkci
 */
export type StateMigrationFn = (state: PersistedState<unknown>, fromVersion: number, toVersion: number) => PersistedState<unknown>;

/**
 * Typ pro persistovanou část stavu (při serializaci/deserializaci)
 */
export interface PersistedState<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Navštívené scény - konvertované na pole pro JSON serializaci
     */
    visitedScenes: string[];

    /**
     * Herní proměnné
     */
    variables: T;

    /**
     * Metadata stavu
     */
    _metadata?: StateMetadata;

    /**
     * Další persistované vlastnosti
     */
    [key: string]: unknown;
}

/**
 * Eventy emitované StateManagerem
 */
export interface StateManagerEvents<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Emitováno při změně stavu
     */
    stateChanged: StateChangedEvent<T>;

    /**
     * Emitováno při změně perzistentních klíčů
     */
    persistentKeysChanged: { keys: string[] };

    /**
     * Emitováno po aplikaci migrace
     */
    migrationApplied: {
        fromVersion: number;
        toVersion: number;
        state: PersistedState<T>;
    };

    /**
     * Emitováno před serializací stavu
     */
    beforeSerialize: { state: GameState<T> };

    /**
     * Emitováno po deserializaci stavu
     */
    afterDeserialize: { state: GameState<T> };
}