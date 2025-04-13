import { SaveData, SaveMetadata, SaveStorage } from '../types/save';

/**
 * Možnosti pro konfiguraci MemorySaveStorage
 */
export interface MemorySaveStorageOptions {
    /**
     * Výchozí data k načtení při inicializaci
     */
    initialData?: Record<string, SaveData>;
}

/**
 * Implementace SaveStorage využívající paměť
 *
 * Tato třída poskytuje základní implementaci ukládání a načítání
 * uložených her v paměti. Vhodné pro testování a jednoduché aplikace,
 * ale data se ztratí při obnovení stránky nebo restartu aplikace.
 */
export class MemorySaveStorage implements SaveStorage {
    /**
     * Mapa uložených her
     */
    private saves: Map<string, SaveData> = new Map();

    /**
     * Vytvoří novou instanci MemorySaveStorage
     *
     * @param options Možnosti konfigurace
     */
    constructor(options: MemorySaveStorageOptions = {}) {
        // Načtení výchozích dat, pokud existují
        if (options.initialData) {
            for (const [id, data] of Object.entries(options.initialData)) {
                this.saves.set(id, data);
            }
        }
    }

    /**
     * Uloží data do paměti
     *
     * @param id Identifikátor uložené hry
     * @param data Data k uložení
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné
     */
    public async save(id: string, data: SaveData): Promise<boolean> {
        try {
            // Vytvoření kopie dat pro zabránění vzájemným referencím
            const saveData: SaveData = JSON.parse(JSON.stringify(data));
            this.saves.set(id, saveData);
            return true;
        } catch (error) {
            console.error(`Failed to save game with id '${id}':`, error);
            return false;
        }
    }

    /**
     * Načte data z paměti
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na data, nebo null pokud uložená hra neexistuje
     */
    public async load(id: string): Promise<SaveData | null> {
        try {
            const data = this.saves.get(id);
            if (!data) {
                return null;
            }

            // Vytvoření kopie dat pro zabránění vzájemným referencím
            return JSON.parse(JSON.stringify(data));
        } catch (error) {
            console.error(`Failed to load game with id '${id}':`, error);
            return null;
        }
    }

    /**
     * Vrátí seznam všech uložených her
     *
     * @returns Promise rozhodnutý na objekt mapující ID na metadata
     */
    public async list(): Promise<Record<string, SaveMetadata>> {
        try {
            const result: Record<string, SaveMetadata> = {};

            for (const [id, data] of this.saves.entries()) {
                result[id] = data.metadata;
            }

            return result;
        } catch (error) {
            console.error('Failed to list saved games:', error);
            return {};
        }
    }

    /**
     * Smaže uloženou hru
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud bylo smazání úspěšné
     */
    public async delete(id: string): Promise<boolean> {
        return this.saves.delete(id);
    }

    /**
     * Zkontroluje, zda existuje uložená hra s daným ID
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud uložená hra existuje
     */
    public async exists(id: string): Promise<boolean> {
        return this.saves.has(id);
    }

    /**
     * Vyčistí všechna uložení
     *
     * @returns Promise rozhodnutý na true
     */
    public async clear(): Promise<boolean> {
        this.saves.clear();
        return true;
    }

    /**
     * Vrátí počet uložených her
     *
     * @returns Počet uložených her
     */
    public getCount(): number {
        return this.saves.size;
    }

    /**
     * Exportuje všechna uložení jako objekt
     *
     * @returns Všechna uložení jako objekt
     */
    public export(): Record<string, SaveData> {
        const result: Record<string, SaveData> = {};

        for (const [id, data] of this.saves.entries()) {
            result[id] = JSON.parse(JSON.stringify(data));
        }

        return result;
    }

    /**
     * Importuje uložení z objektu
     *
     * @param data Uložení k importu
     * @param merge Zda sloučit s existujícími uloženími (výchozí: false - přepíše existující)
     * @returns Promise rozhodnutý na true, pokud byl import úspěšný
     */
    public async import(data: Record<string, SaveData>, merge: boolean = false): Promise<boolean> {
        try {
            if (!merge) {
                this.saves.clear();
            }

            for (const [id, saveData] of Object.entries(data)) {
                this.saves.set(id, JSON.parse(JSON.stringify(saveData)));
            }

            return true;
        } catch (error) {
            console.error('Failed to import saved games:', error);
            return false;
        }
    }
}