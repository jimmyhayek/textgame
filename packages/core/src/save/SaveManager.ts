import {
  SaveData,
  SaveMetadata,
  SaveOptions,
  SaveStorage,
  AutoSaveOptions,
  SaveEvents,
  SaveEventMap, // Import mapy událostí
  GameSavedEventData,
  GameLoadedEventData,
  GameDeletedEventData,
  AllSavesClearedEventData,
  StorageChangedEventData,
  AutoSaveEnabledEventData,
  AutoSaveDisabledEventData,
} from './types';
import { GameEngine } from '../engine/GameEngine';
// EventEmitter a TypedEventEmitter už by neměly být potřeba přímo zde
// import { EventEmitter } from '../event/EventEmitter';
// import { TypedEventEmitter } from '../event/TypedEventEmmitter';
import { SceneKey } from '../scene/types';
import { GameStateManager } from '../state/GameStateManager';
import { StateConverter } from '../state/persistence/StateConverter';
import { StateMigrationService } from '../state/persistence/StateMigrationService';
import { PersistedState, StateManagerPersistenceEvents } from '../state/persistence/types';

const CURRENT_SAVE_DATA_FORMAT_VERSION = 1;

/**
 * Správce ukládání a načítání her
 * @template T Typ proměnných ve stavu hry
 */
export class SaveManager<T extends Record<string, unknown> = Record<string, unknown>> {
  private engine: GameEngine;
  private storage: SaveStorage;
  private readonly saveDataFormatVersion: number;
  private readonly engineVersion: string;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null; // Použij správný typ
  private autoSaveOptions: AutoSaveOptions | null = null;
  private autoSaveCounter: number = 0;
  private gameStartTime: number;
  private totalPlayTime: number = 0;
  private readonly quickSaveId: string = 'quicksave';
  private stateConverter: typeof StateConverter; // Statické reference
  private stateMigrationService: typeof StateMigrationService; // Statické reference

  constructor(
    engine: GameEngine,
    options: {
      storage: SaveStorage;
      engineVersion?: string;
      saveDataFormatVersion?: number;
      // eventEmitter?: EventEmitter; // Už není potřeba předávat emitter
      stateConverter?: typeof StateConverter;
      stateMigrationService?: typeof StateMigrationService;
    }
  ) {
    this.engine = engine;
    this.storage = options.storage;
    this.engineVersion =
      options.engineVersion ||
      (typeof engine.getVersion === 'function' ? engine.getVersion() : '0.1.0');
    this.saveDataFormatVersion = options.saveDataFormatVersion || CURRENT_SAVE_DATA_FORMAT_VERSION;
    this.gameStartTime = Date.now();
    this.stateConverter = options.stateConverter || StateConverter;
    this.stateMigrationService = options.stateMigrationService || StateMigrationService;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Naslouchání na core události z enginu
    this.engine.getCoreEventEmitter().on('gameStarted', () => {
      console.log('SaveManager: Game started event received. Resetting play time.');
      this.gameStartTime = Date.now();
      this.totalPlayTime = 0;
    });

    // Naslouchání na save události (emitované SaveManagerem samotným přes engine)
    this.engine.getSaveEventEmitter().on(SaveEvents.GAME_LOADED, data => {
      // Typ dat je z SaveEventMap
      if (data.success) {
        console.log(
          'SaveManager: Game loaded event received. Setting play time from metadata and resetting start time.'
        );
        this.gameStartTime = Date.now();
      }
    });
  }

  public async save(saveId: string, options: SaveOptions = {}): Promise<boolean> {
    // Odstraněna kontrola `typeof saveId !== 'string'`
    if (!saveId) {
      console.error('SaveManager: Invalid save ID provided (empty string).', saveId);
      const errorData: GameSavedEventData = { saveId, success: false, error: 'invalid id' };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_SAVED, errorData);
      return false;
    }

    this.updatePlayTime();
    const gameStateManager = this.engine.getStateManager<T>();
    const currentState = gameStateManager.getState();
    const persistentKeys = gameStateManager.getPersistentKeys();

    const metadata: SaveMetadata = {
      id: saveId, // ID by mělo být nastaveno zde, ne přepsáno z options níže
      name: options.name || this.generateDefaultSaveName(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playTime: this.totalPlayTime,
      engineVersion: this.engineVersion,
      // Opravené názvy verzí podle SaveMetadata
      saveDataFormatVersion: this.saveDataFormatVersion,
      stateFormatVersion: this.stateMigrationService.getCurrentStateFormatVersion(),
      currentSceneKey: this.engine.getCurrentSceneKey(),
      // Zkopírujeme POUZE bezpečné vlastnosti z options
      thumbnail: options.thumbnail,
      // Můžete přidat další povolené klíče z options
      ...(options.customData && { customData: options.customData }), // Příklad pro vlastní data
    };

    let serializedState: string;
    try {
      // Získání typovaného emitteru pro persistenci z enginu
      const persistenceEmitter = this.engine.getPersistenceEventEmitter<T>();
      serializedState = this.stateConverter.serialize(
        currentState,
        persistentKeys,
        { includeMetadata: true, replacer: options.replacer },
        gameStateManager.getOnBeforeSerializeCallback(),
        persistenceEmitter // <-- Předání bez přetypování
      );
    } catch (error) {
      console.error(`SaveManager: Failed to serialize game state for save id '${saveId}':`, error);
      const errorData: GameSavedEventData = { saveId, metadata, success: false, error };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_SAVED, errorData);
      return false;
    }

    const saveData: SaveData = { metadata, state: serializedState };

    try {
      const success = await this.storage.save(saveId, saveData);
      const eventData: GameSavedEventData = {
        saveId,
        metadata,
        success,
        error: success ? undefined : 'storage failed',
      };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_SAVED, eventData);
      return success;
    } catch (error) {
      console.error(`SaveManager: Failed to save game to storage for id '${saveId}':`, error);
      const errorData: GameSavedEventData = { saveId, metadata, success: false, error };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_SAVED, errorData);
      return false;
    }
  }

  public async load(saveId: string): Promise<boolean> {
    if (!saveId) {
      // Pouze kontrola na prázdný řetězec
      console.error('SaveManager: Invalid save ID provided for loading.', saveId);
      const errorData: GameLoadedEventData = { saveId, success: false, error: 'invalid id' };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_LOADED, errorData);
      return false;
    }

    let saveData: SaveData | null;
    try {
      saveData = await this.storage.load(saveId);
    } catch (error) {
      console.error(`SaveManager: Failed to load data from storage for id '${saveId}':`, error);
      const errorData: GameLoadedEventData = { saveId, success: false, error };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_LOADED, errorData);
      return false;
    }

    if (!saveData) {
      console.error(`SaveManager: Save with id '${saveId}' not found in storage.`);
      const errorData: GameLoadedEventData = { saveId, success: false, error: 'not found' };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_LOADED, errorData);
      return false;
    }

    // Validace a migrace SaveData formátu
    let migratedSaveData = this.migrateSaveDataFormatIfNeeded(saveData);
    if (!migratedSaveData) {
      console.error(`SaveManager: Failed to migrate SaveData format for id '${saveId}'.`);
      const errorData: GameLoadedEventData = {
        saveId,
        success: false,
        error: 'SaveData format migration failed',
      };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_LOADED, errorData);
      return false;
    }
    saveData = migratedSaveData;

    try {
      const gameStateManager = this.engine.getStateManager<T>();
      // Získání typovaného emitteru pro persistenci z enginu
      const persistenceEmitter = this.engine.getPersistenceEventEmitter<T>();

      const migratedPersistedState = this.stateConverter.deserialize<T>(
        saveData.state,
        {},
        undefined, // Callback se volá v GameStateManageru
        persistenceEmitter // <-- Předání bez přetypování
      );

      // GameStateManager.applyPersistentState nyní volá onAfterDeserialize callback
      gameStateManager.applyPersistentState(migratedPersistedState, 'loadGame');

      this.totalPlayTime = saveData.metadata.playTime || 0;
      // this.gameStartTime = Date.now(); // Toto se děje v listeneru

      const currentSceneKey = saveData.metadata.currentSceneKey;
      if (currentSceneKey) {
        // Použijeme engine pro přechod, ne voláme metodu SceneManageru přímo
        await this.engine.transitionToScene(currentSceneKey as SceneKey, {
          // data: saveData.metadata.customData // Příklad předání custom dat
        });
      } else {
        console.warn(
          `SaveManager: Save data for id '${saveId}' does not contain current scene key.`
        );
      }

      console.log(`SaveManager: Game loaded successfully with id '${saveId}'.`);
      const eventData: GameLoadedEventData = { saveId, metadata: saveData.metadata, success: true };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_LOADED, eventData);
      return true;
    } catch (error) {
      console.error(
        `SaveManager: Failed to process and apply loaded state for id '${saveId}':`,
        error
      );
      const errorData: GameLoadedEventData = { saveId, success: false, error };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_LOADED, errorData);
      return false;
    }
  }

  public async getSaves(): Promise<Record<string, SaveMetadata>> {
    try {
      return await this.storage.list();
    } catch (error) {
      console.error('SaveManager: Failed to list saves from storage:', error);
      return {};
    }
  }

  public async deleteSave(saveId: string): Promise<boolean> {
    if (!saveId) {
      console.error('SaveManager: Invalid save ID provided for deletion.', saveId);
      const errorData: GameDeletedEventData = { saveId, success: false, error: 'invalid id' };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_DELETED, errorData);
      return false;
    }
    try {
      const success = await this.storage.delete(saveId);
      const eventData: GameDeletedEventData = {
        saveId,
        success,
        error: success ? undefined : 'storage failed or not found',
      };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_DELETED, eventData);
      return success;
    } catch (error) {
      console.error(`SaveManager: Failed to delete game with id '${saveId}' from storage:`, error);
      const errorData: GameDeletedEventData = { saveId, success: false, error };
      this.engine.getSaveEventEmitter().emit(SaveEvents.GAME_DELETED, errorData);
      return false;
    }
  }

  public async quickSave(): Promise<boolean> {
    console.log('SaveManager: Performing quick save...');
    return await this.save(this.quickSaveId, {
      name: 'Rychlé uložení',
      isQuickSave: true, // Příklad custom data v metadatech
    });
  }

  public async quickLoad(): Promise<boolean> {
    console.log('SaveManager: Attempting quick load...');
    try {
      const exists = await this.storage.exists(this.quickSaveId);
      if (!exists) {
        console.warn('SaveManager: No quicksave found to load.');
        // Neemitujeme GAME_LOADED error zde, load() to udělá, pokud je voláno
        return false;
      }
      return await this.load(this.quickSaveId);
    } catch (error) {
      console.error('SaveManager: Failed to check existence or load quicksave:', error);
      // Emit error? load() by měl emitovat chybu, pokud selže
      return false;
    }
  }

  public enableAutoSave(options: AutoSaveOptions = {}): void {
    this.disableAutoSave();
    const interval = options.interval || 5 * 60 * 1000;
    const slots = options.slots || 3;
    if (interval <= 0 || slots <= 0 || !Number.isInteger(slots)) {
      console.error('SaveManager: Invalid auto-save interval or slots.');
      return;
    }

    this.autoSaveOptions = {
      interval,
      slots,
      prefix: options.prefix || 'auto',
      beforeSave: options.beforeSave,
      afterSave: options.afterSave,
    };

    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave().catch(error => {
        console.error('SaveManager: Uncaught error during auto-save execution:', error);
      });
    }, this.autoSaveOptions.interval);

    console.log(`SaveManager: Auto-save enabled with interval ${interval}ms and ${slots} slots.`);
    const eventData: AutoSaveEnabledEventData = { options: this.autoSaveOptions };
    this.engine.getSaveEventEmitter().emit(SaveEvents.AUTO_SAVE_ENABLED, eventData);
  }

  public disableAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.autoSaveOptions = null;
      this.autoSaveCounter = 0;
      console.log('SaveManager: Auto-save disabled.');
      const eventData: AutoSaveDisabledEventData = {};
      this.engine.getSaveEventEmitter().emit(SaveEvents.AUTO_SAVE_DISABLED, eventData);
    }
  }

  private async performAutoSave(): Promise<boolean> {
    if (!this.autoSaveOptions || this.autoSaveTimer === null) return false;

    if (this.autoSaveOptions.beforeSave) {
      try {
        const shouldSave = await Promise.resolve(this.autoSaveOptions.beforeSave());
        if (!shouldSave) {
          console.log('SaveManager: Auto-save skipped by beforeSave callback.');
          return false;
        }
      } catch (error) {
        console.error('SaveManager: Error in auto-save beforeSave callback:', error);
        return false;
      }
    }

    const autoSaveSlotIndex = this.autoSaveCounter % this.autoSaveOptions.slots;
    this.autoSaveCounter++;
    const saveId = `${this.autoSaveOptions.prefix}_${autoSaveSlotIndex}`;
    const saveName = `Automatické uložení ${autoSaveSlotIndex + 1}`;

    console.log(
      `SaveManager: Performing auto-save to slot ${autoSaveSlotIndex + 1} (id: ${saveId}).`
    );
    const success = await this.save(saveId, {
      name: saveName,
      isAutoSave: true, // Příklad custom data
      autoSaveSlot: autoSaveSlotIndex + 1, // Příklad custom data
    });

    if (success && this.autoSaveOptions.afterSave) {
      try {
        await Promise.resolve(this.autoSaveOptions.afterSave(saveId));
      } catch (error) {
        console.error('SaveManager: Error in auto-save afterSave callback:', error);
      }
    }
    return success;
  }

  private generateDefaultSaveName(): string {
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    const dateStr = now.toLocaleDateString(undefined, dateOptions);
    const timeStr = now.toLocaleTimeString(undefined, timeOptions);
    const sceneTitle = this.engine.getCurrentScene()?.title || 'Neznámá scéna';
    return `${sceneTitle} - ${dateStr} ${timeStr}`;
  }

  private updatePlayTime(): void {
    const now = Date.now();
    if (this.gameStartTime) {
      // Přidána kontrola pro jistotu
      this.totalPlayTime += now - this.gameStartTime;
    }
    this.gameStartTime = now;
  }

  /**
   * Migruje formát SaveData objektu (metadata atd.), NE formát stavu.
   * @param saveData Data k migraci.
   * @returns Migrovaná data nebo null při selhání.
   */
  private migrateSaveDataFormatIfNeeded(saveData: SaveData): SaveData | null {
    let currentSaveData = { ...saveData }; // Pracujeme s kopií

    if (!currentSaveData.metadata) {
      console.error('SaveManager: Cannot migrate SaveData missing metadata.');
      return null;
    }

    // Získání nebo inicializace verze SaveData formátu
    let currentFormatVersion =
      typeof currentSaveData.metadata.saveDataFormatVersion === 'number'
        ? currentSaveData.metadata.saveDataFormatVersion
        : 0; // Předpokládáme verzi 0, pokud chybí

    // Pokud je verze nižší než aktuální cílová verze SaveData formátu
    if (currentFormatVersion < this.saveDataFormatVersion) {
      console.log(
        `SaveManager: Migrating SaveData format for id '${currentSaveData.metadata.id}' from version ${currentFormatVersion} to ${this.saveDataFormatVersion}.`
      );

      // Migrace z 0 na 1 (Příklad: přejmenování saveVersion na stateFormatVersion, přidání saveDataFormatVersion)
      if (currentFormatVersion === 0 && this.saveDataFormatVersion >= 1) {
        // Přejmenování/přesun 'saveVersion' (pokud existovala a znamenala verzi stavu) na 'stateFormatVersion'
        if (
          typeof (currentSaveData.metadata as any).saveVersion === 'number' &&
          typeof currentSaveData.metadata.stateFormatVersion !== 'number'
        ) {
          currentSaveData.metadata.stateFormatVersion = (
            currentSaveData.metadata as any
          ).saveVersion;
          console.log(
            `SaveManager: Migrated old 'saveVersion' field to 'stateFormatVersion' in SaveData metadata.`
          );
        }
        delete (currentSaveData.metadata as any).saveVersion; // Odstranění starého pole

        // Nastavení saveDataFormatVersion na 1
        currentSaveData.metadata.saveDataFormatVersion = 1;
        currentFormatVersion = 1; // Aktualizace pro další případné migrace
        console.log(`SaveManager: Applied SaveData format migration from 0 to 1.`);
      }

      // Zde přidat další migrační kroky pro SaveData formát (např. 1 -> 2)
      // if (currentFormatVersion === 1 && this.saveDataFormatVersion >= 2) {
      //     // ... logika migrace SaveData formátu 1 -> 2 ...
      //     currentSaveData.metadata.saveDataFormatVersion = 2;
      //     currentFormatVersion = 2;
      //     console.log(`SaveManager: Applied SaveData format migration from 1 to 2.`);
      // }

      // Kontrola, zda migrace dosáhla cílové verze
      if (currentFormatVersion !== this.saveDataFormatVersion) {
        console.warn(
          `SaveManager: Could not fully migrate SaveData format to target version ${this.saveDataFormatVersion}. Current version after migration: ${currentFormatVersion}.`
        );
        // Můžete se rozhodnout vrátit null nebo částečně migrovaná data
      }
    }

    // Zajistíme, že stateFormatVersion existuje (pro stará uložení bez něj)
    if (typeof currentSaveData.metadata.stateFormatVersion !== 'number') {
      console.warn(
        `SaveManager: SaveData metadata for id '${currentSaveData.metadata.id}' missing 'stateFormatVersion'. Assuming version 0.`
      );
      currentSaveData.metadata.stateFormatVersion = 0;
    }

    return currentSaveData;
  }

  public getPlayTime(): number {
    return this.totalPlayTime + (Date.now() - (this.gameStartTime || Date.now())); // Přidána fallback hodnota pro gameStartTime
  }

  public formatPlayTime(timeMs?: number): string {
    // Použijeme utilitu z utils
    const time = timeMs !== undefined ? timeMs : this.getPlayTime();
    // return formatPlayTimeUtil(time); // Předpokládá existenci formatPlayTimeUtil v utils
    // Dočasná implementace:
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor(time / (1000 * 60 * 60));
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');
  }

  public async clearAllSaves(): Promise<boolean> {
    console.log('SaveManager: Attempting to clear all saves...');
    try {
      let success = false;
      if (typeof this.storage.clearAll === 'function') {
        success = await this.storage.clearAll();
      } else {
        console.warn(
          'SaveManager: Storage does not implement clearAll. Deleting saves individually.'
        );
        const saves = await this.getSaves();
        const saveIds = Object.keys(saves);
        if (saveIds.length === 0) {
          success = true; // Nic ke smazání
        } else {
          const results = await Promise.all(saveIds.map(id => this.deleteSave(id)));
          success = results.every(result => result);
        }
      }

      console.log(`SaveManager: Clear all saves ${success ? 'successful' : 'failed'}.`);
      const eventData: AllSavesClearedEventData = {
        success,
        error: success ? undefined : 'clear failed',
      };
      this.engine.getSaveEventEmitter().emit(SaveEvents.ALL_SAVES_CLEARED, eventData);
      return success;
    } catch (error) {
      console.error('SaveManager: Failed to clear all saves:', error);
      const eventData: AllSavesClearedEventData = { success: false, error };
      this.engine.getSaveEventEmitter().emit(SaveEvents.ALL_SAVES_CLEARED, eventData);
      return false;
    }
  }

  public getStorage(): SaveStorage {
    return this.storage;
  }

  public setStorage(storage: SaveStorage): void {
    this.storage = storage;
    console.log('SaveManager: Storage changed.');
    const eventData: StorageChangedEventData = { storage };
    this.engine.getSaveEventEmitter().emit(SaveEvents.STORAGE_CHANGED, eventData);
  }

  public getSaveDataFormatVersion(): number {
    return this.saveDataFormatVersion;
  }

  public getStateFormatVersion(): number {
    return this.stateMigrationService.getCurrentStateFormatVersion();
  }
}
