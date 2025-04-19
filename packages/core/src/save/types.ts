/**
 * Metadata uložené hry
 * Obsahuje informace o uložené hře bez herního stavu samotného
 */
export interface SaveMetadata {
    /** Unikátní identifikátor uložené hry */
    id: string;
    /** Název nebo popis uložené hry */
    name: string;
    /** Časové razítko vytvoření uložené hry */
    createdAt: number;
    /** Časové razítko poslední aktualizace uložené hry */
    updatedAt: number;
    /** Celkový čas strávený hrou v milisekundách */
    playTime: number;
    /** Verze enginu, ve které byla hra uložena */
    engineVersion: string;

    /** Verze formátu struktury uložených dat (SaveData). */
    saveDataFormatVersion: number; // <--- Přidáno/Přejmenováno

    /** Verze formátu herního stavu (pro migraci stavu). */
    stateFormatVersion: number; // <--- Přidáno/Přejmenováno

    /** Klíč aktuální scény v době uložení */
    currentSceneKey: string | null;
    /** Thumbnail nebo obrázek reprezentující uloženou hru (volitelné) */
    thumbnail?: string;
    /** Další vlastnosti specifické pro konkrétní hru nebo implementaci úložiště */
    [key: string]: any;
}

/**
 * Reprezentace uložené hry včetně herního stavu
 */
export interface SaveData {
    /** Metadata o uložené hře */
    metadata: SaveMetadata;
    /** Serializovaný herní stav */
    state: string;
    /** Volitelné dodatečné údaje specifické pro implementaci úložiště */
    [key: string]: any;
}

/**
 * Možnosti pro vytvoření nové uložené hry
 */
export interface SaveOptions {
    /** Název nebo popis uložené hry (volitelné) */
    name?: string;
    /** Thumbnail nebo obrázek reprezentující uloženou hru (volitelné) */
    thumbnail?: string;
    /** Další možnosti specifické pro implementaci úložiště */
    [key: string]: any;
}

/**
 * Nastavení pro automatické ukládání
 */
export interface AutoSaveOptions {
    /** Interval v milisekundách mezi automatickými uloženími */
    interval?: number;
    /** Maximální počet automatických uložení */
    slots?: number;
    /** Prefix pro názvy automatických uložení */
    prefix?: string;
    /** Callback volaný před automatickým uložením */
    beforeSave?: () => boolean | Promise<boolean>;
    /** Callback volaný po automatickém uložení */
    afterSave?: (saveId: string) => void | Promise<void>;
    /** Další možnosti specifické pro implementaci úložiště */
    [key: string]: any;
}

/**
 * Metody pro práci s úložištěm uložených her
 */
export interface SaveStorage {
    /** Uloží data do úložiště */
    save(id: string, data: SaveData): Promise<boolean>;
    /** Načte data z úložiště */
    load(id: string): Promise<SaveData | null>;
    /** Vrátí seznam všech uložených her */
    list(): Promise<Record<string, SaveMetadata>>;
    /** Smaže uloženou hru */
    delete(id: string): Promise<boolean>;
    /** Zkontroluje, zda existuje uložená hra s daným ID */
    exists(id: string): Promise<boolean>;
    /** (Volitelné) Vymaže všechna uložení */
    clearAll?: () => Promise<boolean>;
}

/**
 * Typy událostí emitovaných SaveManager
 */
export enum SaveEvents {
    GAME_SAVED = 'save:gameSaved',
    GAME_LOADED = 'save:gameLoaded',
    GAME_DELETED = 'save:gameDeleted',
    AUTO_SAVE_ENABLED = 'save:autoSaveEnabled',
    AUTO_SAVE_DISABLED = 'save:autoSaveDisabled',
    ALL_SAVES_CLEARED = 'save:allSavesCleared',
    STORAGE_CHANGED = 'save:storageChanged'
}

// Přidání typů pro data událostí SaveManageru (příklad)
export interface GameSavedEventData {
    saveId: string;
    metadata?: SaveMetadata; // Metadata mohou chybět při selhání před jejich vytvořením
    success: boolean;
    error?: any;
}

export interface GameLoadedEventData {
    saveId: string;
    metadata?: SaveMetadata; // Metadata jsou dostupná jen při úspěchu
    success: boolean;
    error?: any;
}

export interface GameDeletedEventData {
    saveId: string;
    success: boolean;
    error?: any;
}

export interface AutoSaveEnabledEventData {
    options: AutoSaveOptions;
}
export interface AutoSaveDisabledEventData {}

export interface AllSavesClearedEventData {
    success: boolean;
    error?: any;
}

export interface StorageChangedEventData {
    storage: SaveStorage;
}

// Mapa událostí pro SaveManager
export type SaveEventMap = {
    [SaveEvents.GAME_SAVED]: GameSavedEventData;
    [SaveEvents.GAME_LOADED]: GameLoadedEventData;
    [SaveEvents.GAME_DELETED]: GameDeletedEventData;
    [SaveEvents.AUTO_SAVE_ENABLED]: AutoSaveEnabledEventData;
    [SaveEvents.AUTO_SAVE_DISABLED]: AutoSaveDisabledEventData;
    [SaveEvents.ALL_SAVES_CLEARED]: AllSavesClearedEventData;
    [SaveEvents.STORAGE_CHANGED]: StorageChangedEventData;
};