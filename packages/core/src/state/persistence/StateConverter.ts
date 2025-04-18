import { GameState } from '../types'; // Import GameState from runtime types
import {
    PersistedState,
    StateMetadata,
    SerializationOptions,
    StateManagerPersistenceEvents
} from './types';
import { StateMigrationService } from './StateMigrationService'; // Import Migration Service
import { TypedEventEmitter } from '../../event/TypedEventEmitter';

/**
 * Služba zodpovědná za převod mezi runtime GameState a serializovatelnou PersistedState a zpět.
 * Zahrnuje logiku serializace (GameState -> JSON string) a deserializace (JSON string -> PersistedState po migraci).
 * Tato třída je navržena jako statická/singleton.
 */
export class StateConverter {
    /**
     * Zabrání vytvoření instance.
     */
    private constructor() {}

    /**
     * Statická metoda pro serializaci GameState do JSON stringu.
     * Vytvoří PersistedState objekt obsahující pouze perzistentní klíče a metadata.
     * @template T Typ proměnných stavu.
     * @param state Aktuální runtime GameState.
     * @param persistentKeys Seznam klíčů (z GameStateManageru), které se mají serializovat.
     * @param options Možnosti serializace (zahrnutí metadat, replacer funkce).
     * @param onBeforeSerializeCallback Callback volaný PŘED zahájením serializace.
     * @param eventEmitter Volitelný event emitter pro emitování událostí serializace.
     * @returns JSON řetězec reprezentující perzistentní stav.
     */
    public static serialize<T extends Record<string, unknown>>(
        state: GameState<T>,
        persistentKeys: string[],
        options: SerializationOptions = {},
        onBeforeSerializeCallback?: (state: GameState<T>) => void,
        eventEmitter?: TypedEventEmitter<StateManagerPersistenceEvents<T>>
    ): string {
        const { includeMetadata = true, replacer } = options;

        // Volání callbacku před serializací (pokud je poskytnut)
        if (onBeforeSerializeCallback) {
            onBeforeSerializeCallback(state);
        }

        // Emitování události před serializací (pokud je poskytnut emitter)
        eventEmitter?.emit('beforeSerialize', { state });

        // Vytvoření objektu pro serializaci - bude obsahovat jen perzistentní data
        const serializableState: PersistedState<T> = {} as PersistedState<T>;

        // Přidání pouze perzistentních klíčů ze stavu
        for (const key of persistentKeys) {
            // Zajištění, že klíč existuje ve stavu, než se pokusíme o serializaci
            if (key in state) {
                const value = (state as any)[key];
                if (key === 'visitedScenes') {
                    // Speciální zpracování: Set<string> -> Array<string>
                    serializableState.visitedScenes = this.convertSetToArray(value);
                } else if (key === 'variables') {
                    // Speciální zpracování: variables (typ T)
                    // Zde předpokládáme, že T je přímo serializovatelné nebo obsahuje serializovatelné typy
                    serializableState.variables = value as T;
                } else {
                    // Ostatní perzistentní klíče - kopírování hodnoty
                    (serializableState as any)[key] = value; // Použití any kvůli dynamickému přístupu
                }
            } else {
                // Volitelné: Varování, pokud perzistentní klíč neexistuje ve stavu
                console.warn(`StateConverter: Persistent key '${key}' not found in GameState during serialization.`);
            }
        }

        // Přidání metadat, pokud je požadováno
        if (includeMetadata) {
            serializableState._metadata = this.createStateMetadata();
        }

        // Vrací JSON řetězec, potenciálně s custom replacerem
        try {
            return JSON.stringify(serializableState, replacer);
        } catch (error) {
            console.error("StateConverter: Failed to stringify serializable state.", error);
            throw new Error("Failed to serialize state to JSON");
        }
    }

    /**
     * Statická metoda pro deserializaci JSON stringu do PersistedState (po migraci).
     * Volá StateMigrationService pro migraci načtených dat na aktuální verzi.
     * @template T Typ cílových proměnných stavu (po migraci).
     * @param serializedState Serializovaný stav v JSON formátu.
     * @param options Možnosti deserializace (aktuálně se příliš nepoužívají, ale ponechány pro konzistenci).
     * @param onAfterDeserializeCallback Callback volaný PO dokončení deserializace A migrace.
     * @param eventEmitter Volitelný event emitter pro emitování událostí deserializace/migrace.
     * @returns Migrovaný stav ve formátu PersistedState<T>.
     * @throws Chyba při selhání parsování JSON nebo migraci.
     */
    public static deserialize<T extends Record<string, unknown>>(
        serializedState: string,
        options: SerializationOptions = {},
        onAfterDeserializeCallback?: (state: GameState<T>) => void, // Callback má signature pro GameState, zvažte jeho umístění
        eventEmitter?: TypedEventEmitter<StateManagerPersistenceEvents<T>> // Emitter for Persistence events
    ): PersistedState<T> {
        // 1. Parsování JSON řetězce
        let parsedState: PersistedState<unknown>;
        try {
            parsedState = JSON.parse(serializedState) as PersistedState<unknown>;
        } catch (error) {
            console.error("StateConverter: Failed to parse serialized state string.", error);
            throw new Error("Invalid serialized state format");
        }

        // 2. Migrace stavu na aktuální verzi
        // StateMigrationService.migrate pracuje s PersistedState<unknown>
        const targetVersion = StateMigrationService.getCurrentStateFormatVersion();
        let migratedState: PersistedState<unknown>;
        try {
            migratedState = StateMigrationService.migrate(
                parsedState, // Input state (může být modifikován migračními funkcemi)
                targetVersion,
                eventEmitter as TypedEventEmitter<StateManagerPersistenceEvents<unknown>> // Přetypování emitteru pro migrate
            );
        } catch (error) {
            console.error(`StateConverter: Failed to migrate state to version ${targetVersion}.`, error);
            // Chyba migrace již byla zalogována v migrate(), re-throw
            throw error;
        }


        // Emitování události po deserializaci a migraci (pokud je poskytnut emitter)
        // Callback onAfterDeserializeCallback je zde problematický, protože nemáme GameState.
        // Měl by být volán až po aplikaci migratedState na GameStateManager.
        // Odkaz na něj zde nemá smysl a měl by být odstraněn z parametrů a volání.
        eventEmitter?.emit('afterDeserialize', { state: migratedState as PersistedState<T> });

        // Vrací migrovaný PersistedState objekt, připravený k aplikaci na GameStateManager
        return migratedState as PersistedState<T>;
    }

    /**
     * Vytvoří metadata o stavu pro serializaci.
     * @returns Objekt StateMetadata.
     */
    private static createStateMetadata(): StateMetadata {
        return {
            version: StateMigrationService.getCurrentStateFormatVersion(), // Použije aktuální verzi z MigrationService
            timestamp: Date.now()
        };
    }

    /**
     * Pomocná metoda pro převod Set<string> nebo Array<string> na Array<string> pro serializaci.
     * @param setOrArray Vstupní data
     * @returns Pole stringů
     * @private
     */
    private static convertSetToArray(setOrArray: Set<string> | string[] | undefined): string[] {
        if (setOrArray instanceof Set) {
            return Array.from(setOrArray);
        }
        if (Array.isArray(setOrArray)) {
            return setOrArray;
        }
        // Pokud to není ani Set ani Array, vrátíme prázdné pole nebo zvážíme chybu/varování
        if (setOrArray !== undefined && setOrArray !== null) {
            console.warn("StateConverter: Expected Set<string> or Array<string> for visitedScenes, but received", setOrArray, ". Serializing as empty array.");
        }
        return [];
    }

    // Metoda convertArrayToSet se již nepoužívá v StateConverter, přesunuta do GameStateManager.applyPersistentState
    /*
    private static convertArrayToSet(...) { ... }
    */
}