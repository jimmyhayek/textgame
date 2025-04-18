import { GameState } from '../types'; // Import GameState from runtime types

/**
 * Možnosti pro serializaci stavu
 */
export interface SerializationOptions {
    /**
     * Zda zahrnout metadata o stavu (např. verzi stavu)
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
 * Metadata o formátu stavu, uložená v persistovaném stavu
 */
export interface StateMetadata {
    /**
     * Verze formátu stavu (pro účely migrace)
     */
    version: number;

    /**
     * Časové razítko vytvoření metadat
     */
    timestamp: number;

    /**
     * Další metadata
     */
    [key: string]: any;
}

/**
 * Typ pro persistovanou část stavu (formát pro serializaci/deserializaci)
 * Jedná se o plain object, který může být konvertován na JSON.
 * Obsahuje pouze perzistentní klíče z GameState a metadata.
 */
export interface PersistedState<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Navštívené scény - konvertované na pole pro JSON serializaci.
     * Volitelné, pokud by persistentKeys neobsahovalo 'visitedScenes'.
     */
    visitedScenes?: string[];

    /**
     * Herní proměnné.
     * Volitelné, pokud by persistentKeys neobsahovalo 'variables'.
     */
    variables?: T;

    /**
     * Metadata stavu (volitelné, pokud includeMetadata=false).
     */
    _metadata?: StateMetadata;

    /**
     * Indexová signatura pro další persistované vlastnosti.
     */
    [key: string]: unknown;
}

/**
 * Typ pro migrační funkci
 * Přijímá PersistedState (ne GameState) a vrací novou PersistedState.
 */
export type StateMigrationFn = (state: PersistedState<unknown>, fromVersion: number, toVersion: number) => PersistedState<unknown>;


/**
 * Eventy emitované Persistence vrstvou StateManageru (serializace, deserializace, migrace)
 */
export interface StateManagerPersistenceEvents<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Emitováno po aplikaci jednoho kroku migrace.
     */
    migrationApplied: {
        fromVersion: number;
        toVersion: number;
        state: PersistedState<T>; // Emituje PersistedState po kroku migrace
    };

    /**
     * Emitováno před serializací stavu (v rámci StateConverter).
     */
    beforeSerialize: { state: GameState<T> }; // Emituje GameState před konverzí na PersistedState

    /**
     * Emitováno po deserializaci stringu a migraci (v rámci StateConverter),
     * před jeho aplikací na GameStateManager.
     */
    afterDeserialize: { state: PersistedState<T> }; // Emituje PersistedState po deserializaci a migraci
}