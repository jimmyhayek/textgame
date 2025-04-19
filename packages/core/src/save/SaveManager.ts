import {
    SaveData,
    SaveMetadata,
    SaveOptions,
    SaveStorage,
    AutoSaveOptions,
    SaveEvents
} from './types'; // Import SaveManager types
import { GameEngine } from '../engine/GameEngine'; // Import GameEngine
import { EventEmitter } from '../event/EventEmitter'; // Import EventEmitter
import { SceneKey } from '../scene/types'; // Import SceneKey
import { GameStateManager } from '../state/GameStateManager'; // Import GameStateManager
import { StateConverter } from '../state/persistence/StateConverter'; // Import StateConverter
import { StateMigrationService } from '../state/persistence/StateMigrationService'; // Import StateMigrationService
import { PersistedState, StateManagerPersistenceEvents } from '../state/persistence/types'; // Import Persistence types

// Aktuální verze formátu dat uložení.
// Tato verze se týká *struktury souboru uložení* (metadata + serializovaný stav string),
// NE formátu samotného stavu obsaženého uvnitř (ten má svou vlastní verzi v metadatech stavu).
// Změňte toto číslo, pokud změníte strukturu SaveData nebo SaveMetadata.
const CURRENT_SAVE_DATA_FORMAT_VERSION = 1;

/**
 * Správce ukládání a načítání her
 *
 * Koordinuje proces ukládání a načítání her, včetně správy metadat uložení,
 * verzování dat uložení a automatického ukládání.
 * Využívá GameStateManager a persistence služby pro práci s herním stavem.
 * @template T Typ proměnných ve stavu hry spravovaném tímto SaveManagerem.
 */
export class SaveManager<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Event emitter pro události SaveManageru.
     */
    private eventEmitter: EventEmitter; // GameEngine's event emitter

    /**
     * Reference na herní engine.
     * Používá se pro získání GameStateManageru, SceneManageru atd.
     */
    private engine: GameEngine;

    /**
     * Úložiště pro uložené hry (plugovatelný interface).
     * Zodpovídá za fyzické čtení a zápis dat (JSON stringů) do nějakého média.
     */
    private storage: SaveStorage;

    /**
     * Verze formátu dat uložení spravovaná tímto SaveManagerem.
     * Ukládá se do metadat uložení.
     */
    private readonly saveDataFormatVersion: number;

    /**
     * Aktuální verze enginu.
     * Ukládá se do metadat uložení pro referenci.
     */
    private readonly engineVersion: string;

    /**
     * Časovač pro automatické ukládání.
     */
    private autoSaveTimer: number | null = null; // number v prohlížeči, NodeJS.Timeout v Node

    /**
     * Nastavení pro automatické ukládání.
     */
    private autoSaveOptions: AutoSaveOptions | null = null;

    /**
     * Počítadlo automatických uložení (pro rotující sloty).
     */
    private autoSaveCounter: number = 0;

    /**
     * Čas, kdy hra naposledy začala počítat čas hraní (při startu/načtení).
     * Používá se pro výpočet aktuálního času hraní.
     */
    private gameStartTime: number;

    /**
     * Celkový čas hraní v milisekundách zaznamenaný do posledního uložení/načtení.
     */
    private totalPlayTime: number = 0;

    /**
     * ID rychlého uložení.
     */
    private readonly quickSaveId: string = 'quicksave';

    /**
     * Reference na statickou službu pro konverzi runtime stavu na persistovaný a zpět.
     */
    private stateConverter: typeof StateConverter;

    /**
     * Reference na statickou službu pro migraci persistovaného stavu.
     */
    private stateMigrationService: typeof StateMigrationService;

    /**
     * Vytvoří novou instanci SaveManager.
     *
     * @param engine Reference na herní engine.
     * @param options Možnosti konfigurace SaveManageru.
     */
    constructor(engine: GameEngine, options: {
        storage: SaveStorage;
        engineVersion?: string;
        saveDataFormatVersion?: number; // Volitelná verze formátu dat uložení
        eventEmitter?: EventEmitter;
        // Reference na persistence služby, volitelné, pokud jsou globálně dostupné nebo v enginu
        stateConverter?: typeof StateConverter;
        stateMigrationService?: typeof StateMigrationService;
    }) {
        this.engine = engine;
        this.storage = options.storage;
        this.engineVersion = options.engineVersion || (typeof engine.getVersion === 'function' ? engine.getVersion() : '0.1.0');
        this.saveDataFormatVersion = options.saveDataFormatVersion || CURRENT_SAVE_DATA_FORMAT_VERSION;
        this.eventEmitter = options.eventEmitter || engine.getEventEmitter();
        this.gameStartTime = Date.now(); // Inicializace času při vytvoření SaveManageru

        // Získání nebo převzetí závislostí na persistence službách.
        // Prozatím předpokládáme, že je buď dostaneme v options, nebo použijeme přímo importované statické třídy.
        this.stateConverter = options.stateConverter || StateConverter;
        this.stateMigrationService = options.stateMigrationService || StateMigrationService;


        // Sledování událostí enginu pro reset času hraní při startu/načtení hry
        this.setupEventListeners();
    }

    /**
     * Nastaví event listenery pro sledování herních událostí, které ovlivňují SaveManager.
     * @private
     */
    private setupEventListeners(): void {
        // Sledování začátku hry z GameEngine pro reset času hraní
        this.engine.getEventEmitter().on('gameStarted', () => {
            console.log("SaveManager: Game started event received. Resetting play time.");
            this.gameStartTime = Date.now(); // Začínáme počítat čas pro novou hru
            this.totalPlayTime = 0; // Celkový čas začíná od nuly
        });

        // Sledování načtení hry pro obnovu času hraní a reset gameStartTime
        // Posloucháme na událost SaveEvents.GAME_LOADED, kterou SaveManager sám emituje po úspěšném načtení
        this.eventEmitter.on(SaveEvents.GAME_LOADED, (data) => {
            if (data.success) {
                console.log("SaveManager: Game loaded event received. Setting play time from metadata and resetting start time.");
                // totalPlayTime je již nastaveno v load() metodě z metadat načtení
                this.gameStartTime = Date.now(); // Resetujeme startovací čas, aby se čas začal počítat od tohoto momentu
            }
        });

        // Zde mohou být další listenery, např. pro automatické ukládání při změně scény, pokud je to potřeba
        // this.engine.getEventEmitter().on('sceneChanged', () => { ... trigger auto-save ... });
    }

    /**
     * Uloží aktuální stav hry.
     *
     * @param saveId Identifikátor uložené hry (slot).
     * @param options Další možnosti pro uložení (např. název, thumbnail).
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné.
     */
    public async save(saveId: string, options: SaveOptions = {}): Promise<boolean> {
        if (!saveId) {
            console.error("SaveManager: Invalid save ID provided.", saveId);
            this.eventEmitter.emit(SaveEvents.GAME_SAVED, { saveId, success: false, error: 'invalid id' });
            return false;
        }

        // Aktualizace času hraní PŘED vytvořením metadat
        this.updatePlayTime();

        // Získání aktuálního runtime stavu a konfigurace perzistentních klíčů z GameStateManageru
        // Očekáváme, že GameEngine má metodu getStateManager, která vrací instanci GameStateManager<T>.
        const gameStateManager = this.engine.getStateManager<T>();
        const currentState = gameStateManager.getState();
        const persistentKeys = gameStateManager.getPersistentKeys();

        // Vytvoření metadat pro samotné uložení (data o uloženém souboru/slotu)
        // Tato metadata se liší od _metadata uvnitř stavu.
        const metadata: SaveMetadata = {
            id: saveId,
            name: options.name || this.generateDefaultSaveName(),
            createdAt: Date.now(), // Čas vytvoření tohoto uloženého slotu
            updatedAt: Date.now(), // Čas poslední aktualizace
            playTime: this.totalPlayTime, // Celkový čas hraní k tomuto bodu
            engineVersion: this.engineVersion, // Verze enginu
            saveDataFormatVersion: this.saveDataFormatVersion, // Verze formátu SaveData
            stateFormatVersion: this.stateMigrationService.getCurrentStateFormatVersion(), // Verze formátu stavu uvnitř
            currentSceneKey: this.engine.getCurrentSceneKey(), // Klíč scény
            // Zkopírujeme případné další volitelné vlastnosti z options do metadat
            ...options
            // Z options ale nechceme přepsat systémové vlastnosti (id, createdAt atd.)
            // Vylepšili bychom to filtrováním options.
        };

        // Odstraníme z metadat vlastnosti, které by tam neměly být, pokud přišly z options
        delete (metadata as any).id;
        delete (metadata as any).createdAt;
        // updateAt může být přepsán? currentSceneKey? playTime? Rozhodněte se, co lze přepsat z options.
        // Prozatím necháme takto s vědomím, že options může přepsat některé systémové klíče.
        // Lepší přístup je: const metadata: SaveMetadata = { default_system_values, ...filtered_options };


        // Použití StateConverteru k serializaci runtime stavu do JSON stringu.
        // StateConverter potřebuje runtime stav, seznam klíčů a serializační options.
        // Také mu předáme callback a emitter, aby mohl emitovat události persistence.
        let serializedState: string;
        try {
            serializedState = this.stateConverter.serialize(
                currentState,
                persistentKeys,
                { includeMetadata: true, replacer: options.replacer }, // Pro předání custom replaceru z SaveOptions
                gameStateManager.getOnBeforeSerializeCallback(), // Callback z GameStateManageru
                this.eventEmitter as TypedEventEmitter<StateManagerPersistenceEvents<T>> // Emitter pro persistence události
            );
        } catch (error) {
            console.error(`SaveManager: Failed to serialize game state for save id '${saveId}':`, error);
            this.eventEmitter.emit(SaveEvents.GAME_SAVED, { saveId, metadata, success: false, error });
            return false;
        }


        // Vytvoření dat uložené hry (kontejner pro metadata a serializovaný stav string)
        const saveData: SaveData = {
            metadata,
            state: serializedState // Serializovaný JSON string
            // Zde by se mohly přidat další data do SaveData, která nesouvisí se stavem, např. screenshot blob
            // screenshot: options.screenshot,
        };

        // Uložení dat do úložiště (např. LocalStorage, IndexDB, server)
        try {
            const success = await this.storage.save(saveId, saveData);

            if (success) {
                console.log(`SaveManager: Game saved successfully with id '${saveId}'.`);
                this.eventEmitter.emit(SaveEvents.GAME_SAVED, { saveId, metadata, success: true });
            } else {
                console.warn(`SaveManager: Storage reported failure to save game with id '${saveId}'.`);
                this.eventEmitter.emit(SaveEvents.GAME_SAVED, { saveId, metadata, success: false, error: 'storage failed' });
            }

            return success;

        } catch (error) {
            console.error(`SaveManager: Failed to save game to storage for id '${saveId}':`, error);
            this.eventEmitter.emit(SaveEvents.GAME_SAVED, { saveId, metadata, success: false, error });
            return false;
        }
    }

    /**
     * Načte uloženou hru podle identifikátoru.
     * Získá data z úložiště, deserializuje je, provede migraci a aplikuje stav na GameStateManager.
     * @param saveId Identifikátor uložené hry.
     * @returns Promise rozhodnutý na true, pokud bylo načtení úspěšné.
     */
    public async load(saveId: string): Promise<boolean> {
        if (!saveId || typeof saveId !== 'string') {
            console.error("SaveManager: Invalid save ID provided for loading.", saveId);
            this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, success: false, error: 'invalid id' });
            return false;
        }

        // Načtení dat z úložiště
        let saveData: SaveData | null;
        try {
            saveData = await this.storage.load(saveId);
        } catch (error) {
            console.error(`SaveManager: Failed to load data from storage for id '${saveId}':`, error);
            this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, success: false, error }); // Emit failure event
            return false;
        }

        if (!saveData) {
            console.error(`SaveManager: Save with id '${saveId}' not found in storage.`);
            this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, success: false, error: 'not found' }); // Emit failure event
            return false;
        }

        // Volitelná Validace základního formátu uložených dat (metadata a string stavu)
        // Tato validace kontroluje pouze strukturu kontejneru SaveData, ne samotný stav string.
        // Logika validace by měla být v save/utils.ts.
        /*
        if (!validateSaveData(saveData)) { // Předpokládá se existence validateSaveData v save/utils
             console.error(`SaveManager: Loaded data for id '${saveId}' has invalid SaveData format.`);
             this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, success: false, error: 'invalid SaveData format' });
             return false;
        }
        */

        // Migrace formátu SaveData, pokud je potřeba.
        // Toto se týká struktury metadata nebo dalších polí SaveData, nikoli serializovaného stavu.
        // Pokud nemáte migrace formátu SaveData, tuto část lze smazat nebo zjednodušit.
        let migratedSaveData = this.migrateSaveDataFormatIfNeeded(saveData);
        if (!migratedSaveData) { // migrateSaveDataFormatIfNeeded může vrátit null/false při selhání
            console.error(`SaveManager: Failed to migrate SaveData format for id '${saveId}'.`);
            this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, success: false, error: 'SaveData format migration failed' });
            return false;
        }
        saveData = migratedSaveData; // Použijeme migrovaná SaveData


        try {
            // Získání GameStateManageru
            // Očekáváme, že GameEngine má metodu getStateManager, která vrací instanci GameStateManager<T>.
            const gameStateManager = this.engine.getStateManager<T>();

            // Použití StateConverteru k deserializaci JSON stringu a následné migraci na PersistedState.
            // StateConverter interně volá StateMigrationService.
            const migratedPersistedState = this.stateConverter.deserialize<T>(
                saveData.state, // JSON string stavu z načtených dat uložení
                {}, // Serializační/deserializační options (pokud jsou potřeba)
                undefined, // onAfterDeserialize callback je zde problematický, předá se GameStateManageru
                this.eventEmitter as TypedEventEmitter<StateManagerPersistenceEvents<T>> // Emitter pro persistence události
            );

            // Aplikace migrovaného PersistedState na GameStateManager.
            // Tato metoda GameStateManageru zajistí konverzi Array -> Set a nastavení runtime stavu.
            gameStateManager.applyPersistentState(migratedPersistedState, 'loadGame');

            // Po úspěšné aplikaci stavu, zavoláme onAfterDeserialize callback GameStateManageru
            const onAfterDeserializeCallback = gameStateManager.getOnAfterDeserializeCallback();
            if (onAfterDeserializeCallback) {
                onAfterDeserializeCallback(gameStateManager.getState()); // Voláme s novým GameState
            }


            // Nastavení času hraní z metadat uložení.
            // Toto je čas zaznamenaný v době uložení. GameStartTime se resetuje v event listeneru po emitování GAME_LOADED.
            this.totalPlayTime = saveData.metadata.playTime || 0;
            // this.gameStartTime = Date.now(); // Tuto logiku děláme v event listeneru 'gameLoaded'


            // Přechod na uloženou scénu.
            // Získáme klíč scény z metadat uložení.
            const currentSceneKey = saveData.metadata.currentSceneKey;
            if (currentSceneKey) {
                // Můžete předat i transitionData, pokud jsou v metadatech uložení
                // saveData.metadata by mohla obsahovat i data pro scénu po načtení (např. pozice postavy)
                await this.engine.transitionToScene(currentSceneKey as SceneKey, {
                    // data: saveData.metadata.transitionData // Příklad předání dat
                });
            } else {
                // Pokud není uložena scéna (např. starý formát uložení), můžete přejít na výchozí scénu nebo zůstat
                console.warn(`SaveManager: Save data for id '${saveId}' does not contain current scene key. Staying on current scene.`);
                // Nebo: await this.engine.transitionToScene('default_start_scene_key');
            }


            // Emitování události úspěšného načtení hry.
            // Posluchači (včetně interního SaveManager listeneru pro čas) mohou reagovat.
            console.log(`SaveManager: Game loaded successfully with id '${saveId}'.`);
            this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, metadata: saveData.metadata, success: true });
            return true;

        } catch (error) {
            console.error(`SaveManager: Failed to process and apply loaded state for id '${saveId}':`, error);
            // Emitování události selhání načtení
            this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, success: false, error });
            return false;
        }
    }

    /**
     * Vrátí seznam metadat všech uložených her z úložiště.
     *
     * @returns Promise rozhodnutý na objekt mapující ID na SaveMetadata.
     */
    public async getSaves(): Promise<Record<string, SaveMetadata>> {
        try {
            // Úložiště vrátí mapu ID na SaveMetadata
            return await this.storage.list();
        } catch (error) {
            console.error("SaveManager: Failed to list saves from storage:", error);
            return {}; // V případě chyby vrátí prázdný objekt
        }
    }

    /**
     * Smaže uloženou hru z úložiště podle identifikátoru.
     *
     * @param saveId Identifikátor uložené hry k smazání.
     * @returns Promise rozhodnutý na true, pokud bylo smazání úspěšné.
     */
    public async deleteSave(saveId: string): Promise<boolean> {
        if (!saveId || typeof saveId !== 'string') {
            console.error("SaveManager: Invalid save ID provided for deletion.", saveId);
            this.eventEmitter.emit(SaveEvents.GAME_DELETED, { saveId, success: false, error: 'invalid id' });
            return false;
        }
        try {
            const success = await this.storage.delete(saveId);

            if (success) {
                console.log(`SaveManager: Game save with id '${saveId}' deleted successfully.`);
                this.eventEmitter.emit(SaveEvents.GAME_DELETED, { saveId, success: true });
            } else {
                console.warn(`SaveManager: Storage reported failure to delete game with id '${saveId}'. May not exist.`);
                this.eventEmitter.emit(SaveEvents.GAME_DELETED, { saveId, success: false, error: 'storage failed' });
            }

            return success;
        } catch (error) {
            console.error(`SaveManager: Failed to delete game with id '${saveId}' from storage:`, error);
            this.eventEmitter.emit(SaveEvents.GAME_DELETED, { saveId, success: false, error });
            return false;
        }
    }

    /**
     * Provede rychlé uložení pod předdefinovaným ID (quicksave).
     *
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné.
     */
    public async quickSave(): Promise<boolean> {
        console.log("SaveManager: Performing quick save...");
        // save() metoda již emituje událost
        return await this.save(this.quickSaveId, {
            name: 'Rychlé uložení',
            // Další metadata pro quicksave
            isQuickSave: true
        });
    }

    /**
     * Načte rychlé uložení pod předdefinovaným ID (quicksave).
     *
     * @returns Promise rozhodnutý na true, pokud bylo načtení úspěšné.
     */
    public async quickLoad(): Promise<boolean> {
        console.log("SaveManager: Attempting quick load...");
        try {
            const exists = await this.storage.exists(this.quickSaveId);
            if (!exists) {
                console.warn('SaveManager: No quicksave found to load.');
                // Zvažte emitování specifické události nebo jen vrácení false
                // this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId: this.quickSaveId, success: false, error: 'not found' });
                return false;
            }

            // load() metoda již emituje událost
            return await this.load(this.quickSaveId);
        } catch (error) {
            console.error("SaveManager: Failed to check existence or load quicksave:", error);
            // Chyba při exist() nebo load() bude logována a emitována v těchto metodách
            return false;
        }
    }

    /**
     * Aktivuje automatické ukládání v pravidelných intervalech.
     *
     * @param options Nastavení pro automatické ukládání (interval, počet slotů, prefix, callbacky).
     */
    public enableAutoSave(options: AutoSaveOptions = {}): void {
        // Deaktivace existujícího automatického ukládání, pokud běží
        this.disableAutoSave();

        // Validace intervalu
        const interval = options.interval || 5 * 60 * 1000; // Výchozí 5 minut
        if (interval <= 0) {
            console.error("SaveManager: Auto-save interval must be a positive number.");
            return;
        }

        // Validace počtu slotů
        const slots = options.slots || 3; // Výchozí 3 sloty
        if (slots <= 0 || !Number.isInteger(slots)) {
            console.error("SaveManager: Auto-save slots must be a positive integer.");
            return;
        }


        // Uložení nastavení pro automatické ukládání
        this.autoSaveOptions = {
            interval,
            slots,
            prefix: options.prefix || 'auto', // Výchozí prefix 'auto'
            beforeSave: options.beforeSave,
            afterSave: options.afterSave
        };

        // Spuštění časovače
        // Použijeme window.setInterval pro kompatibilitu s prohlížečem.
        // V Node.js je potřeba jiný modul (timers). Pokud engine běží v Node.js,
        // setInterval/clearInterval můžou být globální nebo z 'timers'.
        if (typeof setInterval !== 'undefined' && typeof clearInterval !== 'undefined') {
            this.autoSaveTimer = setInterval(() => {
                // Asynchronní volání performAutoSave, aby nezablokovalo časovač ani hlavní vlákno
                this.performAutoSave().catch(error => {
                    console.error("SaveManager: Uncaught error during auto-save execution:", error);
                    // Chyba je již logována a emitována v performAutoSave/save
                });
            }, this.autoSaveOptions.interval) as any; // Přetypování pro jistotu
        } else {
            console.warn("SaveManager: setInterval/clearInterval not available. Auto-save cannot be fully enabled.");
            // Můžete zde emitovat událost chyby enginu nebo SaveManageru
            // this.eventEmitter.emit(SaveEvents.AUTO_SAVE_ENABLED, { success: false, error: 'environment not supported' });
            return; // Nemůžeme nastavit interval
        }

        console.log(`SaveManager: Auto-save enabled with interval ${interval}ms and ${slots} slots.`);
        this.eventEmitter.emit(SaveEvents.AUTO_SAVE_ENABLED, { options: this.autoSaveOptions });
    }

    /**
     * Deaktivuje automatické ukládání.
     */
    public disableAutoSave(): void {
        if (this.autoSaveTimer !== null) {
            // Použijeme clearInterval
            if (typeof clearInterval !== 'undefined') {
                clearInterval(this.autoSaveTimer as any); // Přetypování pro konzistenci
            } else {
                console.warn("SaveManager: clearInterval not available. Cannot disable auto-save timer.");
            }
            this.autoSaveTimer = null;
            this.autoSaveOptions = null; // Reset nastavení
            this.autoSaveCounter = 0; // Reset counter
            console.log("SaveManager: Auto-save disabled.");
            this.eventEmitter.emit(SaveEvents.AUTO_SAVE_DISABLED, {});
        }
    }

    /**
     * Provede jedno automatické uložení.
     * Vybírá slot na základě interního počítadla a nastavení.
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné.
     * @private
     */
    private async performAutoSave(): Promise<boolean> {
        // Dvojitá kontrola, zda je auto-save stále aktivní
        if (!this.autoSaveOptions || this.autoSaveTimer === null) {
            console.log("SaveManager: Auto-save requested, but it's not enabled.");
            return false;
        }

        // Kontrola podmínky před uložením (callback může být asynchronní)
        // beforeSave callback může zabránit uložení (např. pokud je hráč v boji)
        if (this.autoSaveOptions.beforeSave) {
            try {
                const shouldSave = await Promise.resolve(this.autoSaveOptions.beforeSave());
                if (!shouldSave) {
                    console.log("SaveManager: Auto-save skipped by beforeSave callback.");
                    return false;
                }
            } catch (error) {
                console.error("SaveManager: Error in auto-save beforeSave callback:", error);
                // Pokud callback selže, uložení se přeskočí.
                return false;
            }
        }

        // Výpočet ID pro auto-save slot
        // Použijeme aktuální hodnotu počítadla pro určení slotu
        const autoSaveSlotIndex = this.autoSaveCounter % (this.autoSaveOptions.slots || 1); // Index slotu (0-based)
        // Zvýšíme počítadlo pro PŘÍŠTÍ uložení až po určení slotu pro toto uložení.
        this.autoSaveCounter++;

        const saveId = `${this.autoSaveOptions.prefix}_${autoSaveSlotIndex}`; // Např. auto_0, auto_1, auto_2
        const saveName = `Automatické uložení ${autoSaveSlotIndex + 1}`; // Jméno slotu (1-based)

        console.log(`SaveManager: Performing auto-save to slot ${autoSaveSlotIndex + 1} (id: ${saveId}).`);

        // Provedení samotného uložení
        const success = await this.save(saveId, {
            name: saveName,
            // Další metadata pro auto-save
            isAutoSave: true,
            autoSaveSlot: autoSaveSlotIndex + 1
            // Můžete zde přidat i další metadata specifická pro auto-save, např. timestamp
        });

        // Callback po uložení (může být asynchronní)
        if (success) {
            console.log(`SaveManager: Auto-save to slot ${autoSaveSlotIndex + 1} successful.`);
            if (this.autoSaveOptions.afterSave) {
                try {
                    await Promise.resolve(this.autoSaveOptions.afterSave(saveId));
                } catch (error) {
                    console.error("SaveManager: Error in auto-save afterSave callback:", error);
                    // Chyba v afterSave by neměla způsobit selhání uložení, jen se zaloguje
                }
            }
        } else {
            // Chyba při ukládání je již logována a emitována v metodě save()
            console.error(`SaveManager: Auto-save to slot ${autoSaveSlotIndex + 1} failed.`);
        }

        return success;
    }

    /**
     * Generuje výchozí název pro uloženou hru na základě aktuálního času a scény.
     *
     * @returns Výchozí název pro uložení.
     * @private
     */
    private generateDefaultSaveName(): string {
        const now = new Date();
        // Formátování data a času pro název
        const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
        // Použijte locale z enginu nebo default
        const dateStr = now.toLocaleDateString(undefined, dateOptions);
        const timeStr = now.toLocaleTimeString(undefined, timeOptions);

        const sceneTitle = this.engine.getCurrentScene()?.title || 'Neznámá scéna';

        return `${sceneTitle} - ${dateStr} ${timeStr}`;
    }

    /**
     * Aktualizuje celkový čas hraní (`this.totalPlayTime`).
     * Přidá čas uplynulý od posledního resetu `gameStartTime`.
     * Volá se před každým uložením.
     * @private
     */
    private updatePlayTime(): void {
        const now = Date.now();
        // Přidá čas, který uplynul od posledního nastavení gameStartTime (např. při startu nebo načtení hry)
        this.totalPlayTime += now - this.gameStartTime;
        // Resetuje gameStartTime, aby se při dalším volání updatePlayTime počítal čas od tohoto nového momentu
        this.gameStartTime = now;
    }

    /**
     * Tato metoda slouží pro migraci *formátu samotných SaveData* (např. struktura metadat),
     * NIKOLI pro migraci *formátu herního stavu* (což dělá StateMigrationService).
     * Pokud nemáte migrace formátu SaveData, lze ji smazat nebo zjednodušit.
     * Aktuálně pouze kontroluje, zda má SaveData metadata a nastaví save Data Format Version, pokud chybí (migrace z verze 0 na 1 SaveData format).
     * V budoucnu zde mohou být další kroky pro migraci SaveData formatu.
     *
     * @param saveData Data uložené hry (SaveData) k migraci.
     * @returns Migrovaná data uložené hry (SaveData) nebo null/undefined při selhání.
     * @private
     */
    private migrateSaveDataFormatIfNeeded(saveData: SaveData): SaveData | null {
        let currentSaveData = { ...saveData }; // Pracujeme s kopií, nebo upravujeme přímo vstup? Upravovat vstup je běžné u migračních funkcí.

        // Zajistíme existenci metadat a verze formátu SaveData
        if (!currentSaveData.metadata) {
            console.error("SaveManager: SaveData missing metadata.");
            // Nelze migrovat data bez metadat, považujeme za nevalidní.
            return null;
        }

        // Pokud chybí saveDataFormatVersion, předpokládáme starší verzi 0 a migrujeme na 1.
        if (typeof currentSaveData.metadata.saveDataFormatVersion !== 'number') {
            console.log(`SaveManager: Migrating SaveData format for id '${currentSaveData.metadata.id}' from version 0 to 1.`);
            currentSaveData.metadata.saveDataFormatVersion = 1; // Nastavíme novou verzi formátu SaveData

            // V tomto kroku migrace SaveData formatu (0->1) můžeme také přejmenovat staré pole 'saveVersion' na 'stateFormatVersion'
            // pokud ve starém formátu uložení bylo pole 'saveVersion' v metadatech uložení (SaveMetadata),
            // které ale ve skutečnosti uchovávalo verzi *stavu* (_metadata.version), nikoli verzi formátu uložení.
            if (typeof (currentSaveData.metadata as any).saveVersion === 'number') {
                currentSaveData.metadata.stateFormatVersion = (currentSaveData.metadata as any).saveVersion;
                delete (currentSaveData.metadata as any).saveVersion;
                console.log(`SaveManager: Migrated old 'saveVersion' field to 'stateFormatVersion' in SaveData metadata.`);
            } else if (typeof currentSaveData.metadata.stateFormatVersion !== 'number') {
                // Pokud ani staré ani nové pole s verzí stavu neexistuje, předpokládáme verzi stavu 0
                currentSaveData.metadata.stateFormatVersion = 0;
            }

            // Zkopírovat nebo nastavit další pole přidaná ve verzi 1 SaveData formatu, pokud je potřeba.
            // Např. pokud ve v1 SaveData formatu přibylo pole 'engineVersion' v metadatech, které ve v0 chybělo.
            if (!currentSaveData.metadata.engineVersion && typeof this.engine.getVersion === 'function') {
                currentSaveData.metadata.engineVersion = this.engine.getVersion();
            }
        }

        // Zde by se implementovaly další kroky migrace SaveData formatu (1->2, 2->3, atd.)
        // let currentFormatVersion = currentSaveData.metadata.saveDataFormatVersion;
        // for (let v = currentFormatVersion; v < this.saveDataFormatVersion; v++) {
        //    const nextVersion = v + 1;
        //    if (nextVersion === 2) {
        //       // Implementace migrace SaveData formatu z 1 na 2
        //       console.log(`SaveManager: Applying SaveData format migration from ${v} to ${nextVersion}`);
        //       // Např.: Přidání nového pole 'screenshot' do metadat
        //       if (!currentSaveData.metadata.screenshot) {
        //           currentSaveData.metadata.screenshot = 'placeholder';
        //       }
        //       currentSaveData.metadata.saveDataFormatVersion = nextVersion; // Aktualizace verze
        //    } else {
        //       console.warn(`SaveManager: No SaveData format migration defined for version ${v} to ${nextVersion}. Cannot fully migrate SaveData format.`);
        //       // Můžete zvážit, zda v takovém případě vyhodit chybu nebo vrátit částečně migrovaná data.
        //       // Prozatím jen varování a pokračování.
        //    }
        // }


        // Pokud žádná migrace SaveData formatu není potřeba nebo byla dokončena:
        return currentSaveData;
    }


    /**
     * Vrátí aktuální čas hraní v milisekundách.
     *
     * @returns Aktuální čas hraní v milisekundách.
     */
    public getPlayTime(): number {
        // Čas hraní je součet totalPlayTime (čas zaznamenaný do posledního uložení/načtení)
        // a času, který uplynul od posledního nastavení gameStartTime (čas aktuálního běhu).
        return this.totalPlayTime + (Date.now() - this.gameStartTime);
    }

    /**
     * Naformátuje čas hraní z milisekund do čitelné podoby (např. "HH:MM:SS").
     * Tato metoda by ideálně měla být v save/utils.ts a zde jen volána nebo reexportována.
     * Ponechána pro zachování původního API.
     *
     * @param timeMs Volitelný čas v milisekundách k formátování. Pokud není uveden, použije se aktuální čas hraní.
     * @returns Naformátovaný čas ve formátu "HH:MM:SS" nebo delší/kratší, v závislosti na implementaci utils.
     */
    public formatPlayTime(timeMs?: number): string {
        // Použijeme externí utilitu z save/utils.ts, pokud existuje.
        // Tím se zajistí konzistence formátování.
        // Pokud utils.ts neobsahuje formatPlayTime, implementujte ji zde nebo ji přidejte do utils.
        // Předpokládáme, že existuje utility funkce: import { formatPlayTime as formatTimeUtil } from './utils';
        const time = timeMs !== undefined ? timeMs : this.getPlayTime();

        // Zde byste měli volat externí formatovací utilitu
        // return formatTimeUtil(time, 'medium');

        // Dočasná jednoduchá implementace pro případ, že utils utilita neexistuje:
        const seconds = Math.floor((time / 1000) % 60);
        const minutes = Math.floor((time / (1000 * 60)) % 60);
        const hours = Math.floor(time / (1000 * 60 * 60));
        // const days = Math.floor(time / (1000 * 60 * 60 * 24));

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }

    /**
     * Vymaže všechna uložení z úložiště.
     *
     * @returns Promise rozhodnutý na true, pokud bylo smazání všech uložení úspěšné.
     */
    public async clearAllSaves(): Promise<boolean> {
        console.log("SaveManager: Attempting to clear all saves...");
        try {
            // Můžete zkusit zavolat metodu clearAll() přímo na úložišti, pokud ji implementuje,
            // nebo iterovat a mazat jednotlivě jako v původním kódu. clearAll je efektivnější.
            if (typeof this.storage.clearAll === 'function') {
                const success = await this.storage.clearAll();
                if (success) {
                    console.log("SaveManager: All saves cleared successfully.");
                    this.eventEmitter.emit(SaveEvents.ALL_SAVES_CLEARED, { success: true });
                } else {
                    console.warn("SaveManager: Storage reported failure to clear all saves.");
                    this.eventEmitter.emit(SaveEvents.ALL_SAVES_CLEARED, { success: false, error: 'storage failed' });
                }
                return success;
            } else {
                // Alternativní implementace pomocí list a delete, pokud storage.clearAll neexistuje
                console.log("SaveManager: Storage does not support clearAll. Deleting saves individually.");
                const saves = await this.getSaves();
                const saveIds = Object.keys(saves);

                if (saveIds.length === 0) {
                    console.log("SaveManager: No saves to clear individually.");
                    this.eventEmitter.emit(SaveEvents.ALL_SAVES_CLEARED, { success: true });
                    return true; // Nic ke smazání
                }

                const results = await Promise.all(
                    saveIds.map(id => this.deleteSave(id))
                );

                const allSuccessful = results.every(result => result);

                if (allSuccessful) {
                    console.log("SaveManager: All saves cleared successfully (individually).");
                    this.eventEmitter.emit(SaveEvents.ALL_SAVES_CLEARED, { success: true });
                } else {
                    console.error("SaveManager: Not all saves were successfully cleared individually.");
                    this.eventEmitter.emit(SaveEvents.ALL_SAVES_CLEARED, { success: false, error: 'partial failure' });
                }

                return allSuccessful;
            }

        } catch (error) {
            console.error("SaveManager: Failed to clear all saves:", error);
            this.eventEmitter.emit(SaveEvents.ALL_SAVES_CLEARED, { success: false, error });
            return false;
        }
    }

    /**
     * Vrátí používané úložiště.
     *
     * @returns Úložiště používané tímto SaveManagerem.
     */
    public getStorage(): SaveStorage {
        return this.storage;
    }

    /**
     * Nastaví nové úložiště.
     * Může být užitečné pro přepínání mezi různými typy úložišť během běhu aplikace.
     *
     * @param storage Nové úložiště.
     */
    public setStorage(storage: SaveStorage): void {
        this.storage = storage;
        console.log("SaveManager: Storage changed.");
        this.eventEmitter.emit(SaveEvents.STORAGE_CHANGED, { storage });
    }

    /**
     * Vrátí aktuální verzi formátu dat uložení (SaveData format).
     * Toto je verze struktury kontejneru uložených dat (metadata, pole state string).
     * @returns Verze formátu dat uložení.
     */
    public getSaveDataFormatVersion(): number {
        return this.saveDataFormatVersion;
    }

    /**
     * Vrátí aktuální verzi formátu stavu, jak ji spravuje StateMigrationService.
     * Toto je verze struktury serializovaného stavu (obsahující variables, visitedScenes atd.).
     * @returns Verze formátu stavu.
     */
    public getStateFormatVersion(): number {
        return this.stateMigrationService.getCurrentStateFormatVersion();
    }
}