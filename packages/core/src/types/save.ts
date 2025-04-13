/**
 * Metadata uložené hry
 * Obsahuje informace o uložené hře bez herního stavu samotného
 */
export interface SaveMetadata {
    /**
     * Unikátní identifikátor uložené hry
     */
    id: string;

    /**
     * Název nebo popis uložené hry
     */
    name: string;

    /**
     * Časové razítko vytvoření uložené hry
     */
    createdAt: number;

    /**
     * Časové razítko poslední aktualizace uložené hry
     */
    updatedAt: number;

    /**
     * Celkový čas strávený hrou v milisekundách
     */
    playTime: number;

    /**
     * Verze enginu, ve které byla hra uložena
     */
    engineVersion: string;

    /**
     * Verze formátu uložené hry
     */
    saveVersion: number;

    /**
     * Klíč aktuální scény v době uložení
     */
    currentSceneKey: string | null;

    /**
     * Thumbnail nebo obrázek reprezentující uloženou hru (volitelné)
     */
    thumbnail?: string;

    /**
     * Další vlastnosti specifické pro konkrétní hru nebo implementaci úložiště
     */
    [key: string]: any;
}

/**
 * Reprezentace uložené hry včetně herního stavu
 */
export interface SaveData {
    /**
     * Metadata o uložené hře
     */
    metadata: SaveMetadata;

    /**
     * Serializovaný herní stav
     */
    state: string;

    /**
     * Volitelné dodatečné údaje specifické pro implementaci úložiště
     */
    [key: string]: any;
}

/**
 * Možnosti pro vytvoření nové uložené hry
 */
export interface SaveOptions {
    /**
     * Název nebo popis uložené hry (volitelné)
     * Pokud není uveden, bude použit aktuální datum a čas
     */
    name?: string;

    /**
     * Thumbnail nebo obrázek reprezentující uloženou hru (volitelné)
     */
    thumbnail?: string;

    /**
     * Další možnosti specifické pro implementaci úložiště
     */
    [key: string]: any;
}

/**
 * Nastavení pro automatické ukládání
 */
export interface AutoSaveOptions {
    /**
     * Interval v milisekundách mezi automatickými uloženími
     * Výchozí hodnota je 5 minut
     */
    interval?: number;

    /**
     * Maximální počet automatických uložení
     * Výchozí hodnota je 3
     */
    slots?: number;

    /**
     * Prefix pro názvy automatických uložení
     * Výchozí hodnota je 'auto'
     */
    prefix?: string;

    /**
     * Callback volaný před automatickým uložením
     * Může být použit k rozhodnutí, zda automatické uložení provést
     */
    beforeSave?: () => boolean | Promise<boolean>;

    /**
     * Callback volaný po automatickém uložení
     */
    afterSave?: (saveId: string) => void | Promise<void>;

    /**
     * Další možnosti specifické pro implementaci úložiště
     */
    [key: string]: any;
}

/**
 * Metody pro práci s úložištěm uložených her
 */
export interface SaveStorage {
    /**
     * Uloží data do úložiště
     *
     * @param id Identifikátor uložené hry
     * @param data Data k uložení
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné
     */
    save(id: string, data: SaveData): Promise<boolean>;

    /**
     * Načte data z úložiště
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na data, nebo null pokud uložená hra neexistuje
     */
    load(id: string): Promise<SaveData | null>;

    /**
     * Vrátí seznam všech uložených her
     *
     * @returns Promise rozhodnutý na objekt mapující ID na metadata
     */
    list(): Promise<Record<string, SaveMetadata>>;

    /**
     * Smaže uloženou hru
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud bylo smazání úspěšné
     */
    delete(id: string): Promise<boolean>;

    /**
     * Zkontroluje, zda existuje uložená hra s daným ID
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud uložená hra existuje
     */
    exists(id: string): Promise<boolean>;
}