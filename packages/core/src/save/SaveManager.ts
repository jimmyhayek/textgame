import {
    SaveData,
    SaveMetadata,
    SaveOptions,
    SaveStorage,
    AutoSaveOptions,
    SaveEvents
} from './types';
import { GameEngine } from '../engine/GameEngine';
import { EventEmitter } from '../event/EventEmitter';
import { SceneKey } from '../scene/types';

// Aktuální verze formátu uložených her
const CURRENT_SAVE_VERSION = 1;

/**
 * Správce ukládání a načítání her
 *
 * Koordinuje proces ukládání a načítání her, včetně správy metadat,
 * verzování a automatického ukládání.
 */
export class SaveManager {
    /**
     * Event emitter pro události SaveManageru
     */
    private eventEmitter: EventEmitter;

    /**
     * Reference na herní engine
     */
    private engine: GameEngine;

    /**
     * Úložiště pro uložené hry
     */
    private storage: SaveStorage;

    /**
     * Aktuální verze enginu
     * Použije se pro metadata uložených her
     */
    private readonly engineVersion: string;

    /**
     * Časovač pro automatické ukládání
     */
    private autoSaveTimer: number | null = null;

    /**
     * Nastavení pro automatické ukládání
     */
    private autoSaveOptions: AutoSaveOptions | null = null;

    /**
     * Počítadlo automatických uložení
     */
    private autoSaveCounter: number = 0;

    /**
     * Čas startu hry pro sledování času hraní
     */
    private gameStartTime: number;

    /**
     * Celkový čas hraní v milisekundách
     */
    private totalPlayTime: number = 0;

    /**
     * ID rychlého uložení
     */
    private readonly quickSaveId: string = 'quicksave';

    /**
     * Vytvoří novou instanci SaveManager
     *
     * @param engine Reference na herní engine
     * @param options Možnosti konfigurace
     */
    constructor(engine: GameEngine, options: {
        storage: SaveStorage;
        engineVersion?: string;
        eventEmitter?: EventEmitter;
    }) {
        this.engine = engine;
        this.storage = options.storage;
        this.engineVersion = options.engineVersion || '0.1.0';
        this.eventEmitter = options.eventEmitter || engine.getEventEmitter();
        this.gameStartTime = Date.now();

        // Sledování událostí enginu
        this.setupEventListeners();
    }

    /**
     * Nastaví event listenery pro sledování herních událostí
     */
    private setupEventListeners(): void {
        // Sledování začátku hry pro reset času
        this.eventEmitter.on('gameStarted', () => {
            this.gameStartTime = Date.now();
        });

        // Zde můžeme přidat další event listenery pro sledování herních událostí
    }

    /**
     * Uloží aktuální stav hry
     *
     * @param saveId Identifikátor uložené hry
     * @param options Další možnosti pro uložení
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné
     */
    public async save(saveId: string, options: SaveOptions = {}): Promise<boolean> {
        // Aktualizace času hraní
        this.updatePlayTime();

        // Vytvoření metadat
        const metadata: SaveMetadata = {
            id: saveId,
            name: options.name || this.generateDefaultSaveName(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            playTime: this.totalPlayTime,
            engineVersion: this.engineVersion,
            saveVersion: CURRENT_SAVE_VERSION,
            currentSceneKey: this.engine.getCurrentSceneKey(),
            ...options
        };

        // Serializace herního stavu
        const state = this.engine.getStateManager().serialize();

        // Vytvoření dat uložené hry
        const saveData: SaveData = {
            metadata,
            state
        };

        // Uložení dat
        const success = await this.storage.save(saveId, saveData);

        if (success) {
            this.eventEmitter.emit(SaveEvents.GAME_SAVED, { saveId, metadata });
        }

        return success;
    }

    /**
     * Načte uloženou hru
     *
     * @param saveId Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud bylo načtení úspěšné
     */
    public async load(saveId: string): Promise<boolean> {
        // Načtení dat
        const saveData = await this.storage.load(saveId);
        if (!saveData) {
            console.error(`Save with id '${saveId}' not found.`);
            return false;
        }

        try {
            // Kontrola verze a případná migrace
            const migratedData = this.migrateIfNeeded(saveData);

            // Deserializace herního stavu
            this.engine.getStateManager().deserialize(migratedData.state);

            // Nastavení času hraní
            this.totalPlayTime = migratedData.metadata.playTime || 0;
            this.gameStartTime = Date.now();

            // Přechod na uloženou scénu
            const currentSceneKey = migratedData.metadata.currentSceneKey;
            if (currentSceneKey) {
                await this.engine.transitionToScene(currentSceneKey as SceneKey);
            }

            this.eventEmitter.emit(SaveEvents.GAME_LOADED, { saveId, metadata: migratedData.metadata });
            return true;
        } catch (error) {
            console.error(`Failed to load game with id '${saveId}':`, error);
            return false;
        }
    }

    /**
     * Vrátí seznam všech uložených her
     *
     * @returns Promise rozhodnutý na objekt mapující ID na metadata
     */
    public async getSaves(): Promise<Record<string, SaveMetadata>> {
        return await this.storage.list();
    }

    /**
     * Smaže uloženou hru
     *
     * @param saveId Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud bylo smazání úspěšné
     */
    public async deleteSave(saveId: string): Promise<boolean> {
        const success = await this.storage.delete(saveId);

        if (success) {
            this.eventEmitter.emit(SaveEvents.GAME_DELETED, { saveId });
        }

        return success;
    }

    /**
     * Provede rychlé uložení
     *
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné
     */
    public async quickSave(): Promise<boolean> {
        return await this.save(this.quickSaveId, {
            name: 'Rychlé uložení'
        });
    }

    /**
     * Načte rychlé uložení
     *
     * @returns Promise rozhodnutý na true, pokud bylo načtení úspěšné
     */
    public async quickLoad(): Promise<boolean> {
        const exists = await this.storage.exists(this.quickSaveId);
        if (!exists) {
            console.warn('No quicksave found.');
            return false;
        }

        return await this.load(this.quickSaveId);
    }

    /**
     * Aktivuje automatické ukládání
     *
     * @param options Nastavení pro automatické ukládání
     */
    public enableAutoSave(options: AutoSaveOptions = {}): void {
        // Deaktivace existujícího automatického ukládání
        this.disableAutoSave();

        // Výchozí hodnoty
        this.autoSaveOptions = {
            interval: options.interval || 5 * 60 * 1000, // 5 minut
            slots: options.slots || 3,
            prefix: options.prefix || 'auto',
            beforeSave: options.beforeSave,
            afterSave: options.afterSave
        };

        // Spuštění časovače
        this.autoSaveTimer = window.setInterval(() => {
            this.performAutoSave();
        }, this.autoSaveOptions.interval);

        this.eventEmitter.emit(SaveEvents.AUTO_SAVE_ENABLED, { options: this.autoSaveOptions });
    }

    /**
     * Deaktivuje automatické ukládání
     */
    public disableAutoSave(): void {
        if (this.autoSaveTimer !== null) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            this.autoSaveOptions = null;
            this.eventEmitter.emit(SaveEvents.AUTO_SAVE_DISABLED, {});
        }
    }

    /**
     * Provede automatické uložení
     *
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné
     * @private
     */
    private async performAutoSave(): Promise<boolean> {
        if (!this.autoSaveOptions) return false;

        // Kontrola podmínky před uložením
        if (this.autoSaveOptions.beforeSave) {
            const shouldSave = await Promise.resolve(this.autoSaveOptions.beforeSave());
            if (!shouldSave) return false;
        }

        // Výpočet ID pro auto-save
        const autoSaveSlot = this.autoSaveCounter % (this.autoSaveOptions.slots || 1);
        this.autoSaveCounter++;

        const saveId = `${this.autoSaveOptions.prefix}_${autoSaveSlot}`;
        const success = await this.save(saveId, {
            name: `Automatické uložení ${autoSaveSlot + 1}`
        });

        // Callback po uložení
        if (success && this.autoSaveOptions.afterSave) {
            await Promise.resolve(this.autoSaveOptions.afterSave(saveId));
        }

        return success;
    }

    /**
     * Generuje výchozí název pro uloženou hru
     *
     * @returns Výchozí název založený na aktuálním datu a čase
     * @private
     */
    private generateDefaultSaveName(): string {
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();
        const sceneName = this.engine.getCurrentScene()?.title || 'Neznámá scéna';

        return `${sceneName} - ${dateStr} ${timeStr}`;
    }

    /**
     * Aktualizuje celkový čas hraní
     *
     * @private
     */
    private updatePlayTime(): void {
        const now = Date.now();
        this.totalPlayTime += now - this.gameStartTime;
        this.gameStartTime = now;
    }

    /**
     * Zkontroluje, zda je potřeba migrace uložené hry a případně ji provede
     *
     * @param saveData Data uložené hry
     * @returns Migrovaná data
     * @private
     */
    private migrateIfNeeded(saveData: SaveData): SaveData {
        // Aktuálně pouze kontrolujeme, že save existuje
        if (!saveData.metadata.saveVersion) {
            // Pro starší verze bez specifikované verze nastavíme verzi 1
            saveData.metadata.saveVersion = 1;
        }

        // V budoucnu zde mohou být migrace mezi verzemi
        // if (saveData.metadata.saveVersion < CURRENT_SAVE_VERSION) {
        //   // Migrace mezi verzemi
        // }

        return saveData;
    }

    /**
     * Vrátí aktuální čas hraní v milisekundách
     *
     * @returns Aktuální čas hraní v milisekundách
     */
    public getPlayTime(): number {
        return this.totalPlayTime + (Date.now() - this.gameStartTime);
    }

    /**
     * Naformátuje čas hraní do čitelné podoby
     *
     * @param timeMs Čas v milisekundách
     * @returns Naformátovaný čas ve formátu "HH:MM:SS"
     */
    public formatPlayTime(timeMs?: number): string {
        const time = timeMs !== undefined ? timeMs : this.getPlayTime();

        const seconds = Math.floor((time / 1000) % 60);
        const minutes = Math.floor((time / (1000 * 60)) % 60);
        const hours = Math.floor(time / (1000 * 60 * 60));

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }

    /**
     * Vymaže všechna uložení
     *
     * @returns Promise rozhodnutý na true, pokud bylo smazání úspěšné
     */
    public async clearAllSaves(): Promise<boolean> {
        const saves = await this.getSaves();
        const results = await Promise.all(
            Object.keys(saves).map(id => this.deleteSave(id))
        );

        const allSuccessful = results.every(result => result);

        if (allSuccessful) {
            this.eventEmitter.emit(SaveEvents.ALL_SAVES_CLEARED, {});
        }

        return allSuccessful;
    }

    /**
     * Vrátí používané úložiště
     *
     * @returns Úložiště používané tímto SaveManagerem
     */
    public getStorage(): SaveStorage {
        return this.storage;
    }

    /**
     * Nastaví nové úložiště
     *
     * @param storage Nové úložiště
     */
    public setStorage(storage: SaveStorage): void {
        this.storage = storage;
        this.eventEmitter.emit(SaveEvents.STORAGE_CHANGED, { storage });
    }
}