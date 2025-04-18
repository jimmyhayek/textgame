import {
    PersistedState,
    StateMetadata,
    StateMigrationFn,
    StateManagerPersistenceEvents
} from './types';
import { TypedEventEmitter } from '../../event/TypedEventEmitter';

/**
 * Aktuální verze formátu persistovaného stavu.
 * Měla by se inkrementovat při každé změně struktury stavu, která vyžaduje migraci.
 */
const CURRENT_STATE_FORMAT_VERSION = 1; // Přejmenováno pro jasnost

/**
 * Služba zodpovědná za správu a aplikaci migračních funkcí pro persistovaný stav.
 * Tato třída je navržena jako statická/singleton pro správu globální mapy migrací.
 */
export class StateMigrationService {
    /**
     * Statická mapa migračních funkcí.
     * Klíčem je verze stavu *před* aplikací migrace (fromVersion).
     * Hodnota je migrační funkce, která transformuje stav z `fromVersion` na `fromVersion + 1`.
     */
    private static migrations = new Map<number, StateMigrationFn>();

    /**
     * Zabrání vytvoření instance, jelikož jde o statickou službu.
     */
    private constructor() {}

    /**
     * Registruje migrační funkci pro konkrétní verzi stavu.
     * Migrační funkce by měla transformovat stav z `fromVersion` na `fromVersion + 1`.
     * @param fromVersion Zdrojová verze (verze před aplikací migrace).
     * @param migrationFn Migrační funkce.
     * @returns Funkce pro odregistraci migrace.
     */
    public static registerMigration(fromVersion: number, migrationFn: StateMigrationFn): () => boolean {
        if (StateMigrationService.migrations.has(fromVersion)) {
            console.warn(`StateMigrationService: Migration for version ${fromVersion} is already registered. Overwriting.`);
        }
        StateMigrationService.migrations.set(fromVersion, migrationFn);
        return () => StateMigrationService.unregisterMigration(fromVersion);
    }

    /**
     * Odregistruje migrační funkci pro konkrétní verzi stavu.
     * @param fromVersion Zdrojová verze.
     * @returns True pokud byla migrace úspěšně odregistrována, jinak False.
     */
    public static unregisterMigration(fromVersion: number): boolean {
        return StateMigrationService.migrations.delete(fromVersion);
    }

    /**
     * Získá aktuální verzi formátu persistovaného stavu, kterou PersistenceService používá.
     * @returns Aktuální verze stavu.
     */
    public static getCurrentStateFormatVersion(): number { // Přejmenováno pro jasnost
        return CURRENT_STATE_FORMAT_VERSION;
    }

    /**
     * Migruje persistovaný stav na cílovou verzi.
     * Postupně aplikuje registrované migrační funkce od verze stavu až po cílovou verzi.
     * @param state Stav k migraci (očekává PersistedState<unknown> s volitelnými metadaty). Může být modifikován!
     * @param targetVersion Cílová verze migrace (obvykle CURRENT_STATE_FORMAT_VERSION).
     * @param eventEmitter Volitelný event emitter pro emitování událostí migrace.
     * @returns Migrovaný stav ve formátu PersistedState<unknown>. Vrací referenci na (potenciálně modifikovaný) vstupní objekt, pokud nedošlo k chybě.
     * @throws Error pokud migrace selže (např. chybí migrační funkce nebo dojde k chybě uvnitř migrační funkce).
     */
    public static migrate(
        state: PersistedState<unknown>,
        targetVersion: number = CURRENT_STATE_FORMAT_VERSION,
        eventEmitter?: TypedEventEmitter<StateManagerPersistenceEvents<unknown>> // Použijeme generic <unknown> zde, jelikož typ T není znám na statické úrovni
    ): PersistedState<unknown> {

        // Pracujeme přímo s referencí na vstupní objekt.
        // Migrační funkce by se měly postarat o immutable aktualizace, pokud je to potřeba
        // (např. pomocí utilit z persistence/utils, které vytváří kopie).
        let migratedState = state;


        // Pokud stav nemá metadata, přidáme je s výchozí verzí 0
        if (!migratedState._metadata) {
            migratedState._metadata = { version: 0, timestamp: Date.now() };
        }

        let currentStateVersion = migratedState._metadata.version;

        // Pokud je verze stavu již na cílové verzi nebo vyšší, není potřeba migrace
        if (currentStateVersion >= targetVersion) {
            if (currentStateVersion > targetVersion) {
                console.warn(`StateMigrationService: State version (${currentStateVersion}) is higher than target version (${targetVersion}). No migration applied.`);
            } else {
                console.log(`StateMigrationService: State is already at target version ${targetVersion}. No migration needed.`);
            }
            return migratedState;
        }

        console.log(`StateMigrationService: Migrating state from version ${currentStateVersion} to ${targetVersion}`);

        // Postupně aplikujeme migrační funkce
        // Iterujeme od aktuální verze stavu (včetně) až po *před* cílovou verzi
        for (let v = currentStateVersion; v < targetVersion; v++) {
            const migrationFn = StateMigrationService.migrations.get(v); // Hledáme migraci pro verzi 'v' -> 'v+1'

            if (migrationFn) {
                console.log(`StateMigrationService: Applying migration from version ${v} to ${v + 1}`);
                try {
                    // Aplikujeme migrační funkci na aktuální migrovaný stav.
                    // Migrační funkce by měla vrátit nový objekt nebo modifikovat vstupní kopii.
                    // Utlity v persistence/utils vytváří kopie.
                    migratedState = migrationFn(migratedState, v, v + 1);

                    // Aktualizujeme verzi v metadatech pracovní kopie po úspěšné migraci
                    // Důležité: Migrační funkce by neměla měnit verzi! To je zodpovědnost migrační služby.
                    if (!migratedState._metadata) {
                        // Toto by se nemělo stávat, pokud předchozí kroky migrace byly správné,
                        // ale přidáme metadata zpět pro robustnost.
                        migratedState._metadata = { version: v + 1, timestamp: Date.now() };
                    } else {
                        migratedState._metadata.version = v + 1; // Nastaví novou verzi
                    }


                    // Emitování události o aplikaci migrace
                    // Emitujeme s nově aktualizovanou verzí
                    eventEmitter?.emit('migrationApplied', {
                        fromVersion: v,
                        toVersion: v + 1,
                        state: migratedState // Emitujeme stav po aplikaci jednoho kroku
                    });


                } catch (migrationError) {
                    console.error(`StateMigrationService: Migration from version ${v} to ${v + 1} failed:`, migrationError);
                    // Důležité: Pokud migrace selže, měli bychom zastavit proces a vyhodit chybu.
                    throw migrationError; // Zastavíme proces a signalizujeme chybu
                }

            } else {
                console.error(`StateMigrationService: No migration function found for version ${v} to ${v + 1}. Cannot complete migration to version ${targetVersion}. State may be incomplete or incorrect.`);
                // Pokud chybí migrace, stav nemůže být plně migrován.
                // Měli bychom zastavit proces a vyhodit chybu.
                throw new Error(`StateMigrationService: Missing migration function for version ${v} to ${v + 1}`);
            }
        }

        // Konečná verze v metadatech by měla být targetVersion
        if (migratedState._metadata) {
            migratedState._metadata.version = targetVersion;
        } else {
            // Metadata by měla existovat po prvním kroku, ale pro jistotu
            migratedState._metadata = { version: targetVersion, timestamp: Date.now() };
        }


        console.log(`StateMigrationService: Migration complete. State is now version ${targetVersion}.`);

        return migratedState; // Vrací finálně migrovaný objekt
    }
}