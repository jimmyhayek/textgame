import {
    PersistedState,
    StateMetadata,
    StateMigrationFn,
    StateManagerPersistenceEvents
} from './types';
import { TypedEventEmitter } from '../../event/TypedEventEmitter'; // Zkontroluj název souboru/třídy

const CURRENT_STATE_FORMAT_VERSION = 1;

/**
 * Služba zodpovědná za správu a aplikaci migračních funkcí pro persistovaný stav.
 */
export class StateMigrationService {
    private static migrations = new Map<number, StateMigrationFn>();
    private constructor() {}

    public static registerMigration(fromVersion: number, migrationFn: StateMigrationFn): () => boolean {
        if (StateMigrationService.migrations.has(fromVersion)) {
            console.warn(`StateMigrationService: Migration for version ${fromVersion} is already registered. Overwriting.`);
        }
        StateMigrationService.migrations.set(fromVersion, migrationFn);
        return () => StateMigrationService.unregisterMigration(fromVersion);
    }

    public static unregisterMigration(fromVersion: number): boolean {
        return StateMigrationService.migrations.delete(fromVersion);
    }

    public static getCurrentStateFormatVersion(): number {
        return CURRENT_STATE_FORMAT_VERSION;
    }

    public static migrate(
        state: PersistedState<unknown>,
        targetVersion: number = CURRENT_STATE_FORMAT_VERSION,
        // Přijímá typovaný emitter pro <unknown>
        eventEmitter?: TypedEventEmitter<StateManagerPersistenceEvents<unknown>>
    ): PersistedState<unknown> {
        let migratedState = state; // Pracujeme s referencí, migrační funkce by měly být čisté nebo pracovat s kopiemi

        if (!migratedState._metadata) {
            console.warn("StateMigrationService: State is missing _metadata. Assuming version 0.");
            migratedState._metadata = { version: 0, timestamp: Date.now() };
        }

        let currentStateVersion = migratedState._metadata.version;

        if (currentStateVersion >= targetVersion) {
            if (currentStateVersion > targetVersion) {
                console.warn(`StateMigrationService: State version (${currentStateVersion}) is higher than target version (${targetVersion}). No migration applied.`);
            }
            // No migration needed if versions match
            return migratedState;
        }

        console.log(`StateMigrationService: Migrating state from version ${currentStateVersion} to ${targetVersion}`);

        for (let v = currentStateVersion; v < targetVersion; v++) {
            const migrationFn = StateMigrationService.migrations.get(v);

            if (migrationFn) {
                console.log(`StateMigrationService: Applying migration from version ${v} to ${v + 1}`);
                try {
                    // Migrační funkce může modifikovat migratedState nebo vrátit nový
                    migratedState = migrationFn(migratedState, v, v + 1);

                    // Aktualizace verze v metadatech migrovaného stavu
                    if (!migratedState._metadata) {
                        // Mělo by být vytvořeno v prvním kroku, pokud chybělo
                        migratedState._metadata = { version: v + 1, timestamp: Date.now() };
                    } else {
                        migratedState._metadata.version = v + 1;
                    }

                    // Emitování události
                    eventEmitter?.emit('migrationApplied', {
                        fromVersion: v,
                        toVersion: v + 1,
                        state: migratedState // Emitujeme stav po aplikaci kroku
                    });

                } catch (migrationError) {
                    console.error(`StateMigrationService: Migration from version ${v} to ${v + 1} failed:`, migrationError);
                    throw migrationError;
                }
            } else {
                const errorMsg = `StateMigrationService: Missing migration function for version ${v} to ${v + 1}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        console.log(`StateMigrationService: Migration complete. State is now version ${targetVersion}.`);
        return migratedState;
    }
}