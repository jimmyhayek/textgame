import { GameEngine } from '../core/GameEngine';
import { SaveManager } from '../save/SaveManager';
import { SaveStorage } from '../types/save';
import { LocalStorageSaveStorage } from '../save/LocalStorageSaveStorage';

/**
 * Možnosti pro vytvoření SaveManageru
 */
export interface CreateSaveManagerOptions {
    /**
     * Úložiště pro uložené hry
     */
    storage?: SaveStorage;

    /**
     * Verze enginu
     */
    engineVersion?: string;

    /**
     * Zda automaticky aktivovat automatické ukládání
     */
    enableAutoSave?: boolean;

    /**
     * Interval automatického ukládání v milisekundách
     */
    autoSaveInterval?: number;

    /**
     * Počet slotů pro automatické ukládání
     */
    autoSaveSlots?: number;
}

/**
 * Vytvoří SaveManager s předkonfigurovaným nastavením
 *
 * @param engine Instance herního enginu
 * @param options Možnosti pro vytvoření SaveManageru
 * @returns Instance SaveManageru
 */
export function createSaveManager(
    engine: GameEngine,
    options: CreateSaveManagerOptions = {}
): SaveManager {
    // Vytvoření úložiště, pokud není specifikováno
    const storage = options.storage || new LocalStorageSaveStorage();

    // Získání verze enginu z package.json, pokud není specifikována
    // V produkčním kódu by bylo lepší to řešit přes importování konstant
    const engineVersion = options.engineVersion || '0.1.0';

    // Vytvoření SaveManageru
    const saveManager = new SaveManager(engine, {
        storage,
        engineVersion
    });

    // Aktivace automatického ukládání, pokud je požadováno
    if (options.enableAutoSave) {
        saveManager.enableAutoSave({
            interval: options.autoSaveInterval,
            slots: options.autoSaveSlots
        });
    }

    return saveManager;
}