import { SaveData, SaveMetadata, SaveStorage } from './types';

/**
 * In-memory implementace SaveStorage
 * Používá se hlavně pro testování nebo pro dočasné ukládání
 */
export class MemoryStorage implements SaveStorage {
    /**
     * Mapa uložených her (ID -> data)
     */
    private saves: Map<string, SaveData> = new Map();

    /**
     * Uloží data do paměti
     *
     * @param id Identifikátor uložené hry
     * @param data Data k uložení
     * @returns Promise rozhodnutý na true
     */
    public async save(id: string, data: SaveData): Promise<boolean> {
        this.saves.set(id, { ...data });
        return true;
    }

    /**
     * Načte data z paměti
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na data, nebo null pokud neexistují
     */
    public async load(id: string): Promise<SaveData | null> {
        const save = this.saves.get(id);
        return save ? { ...save } : null;
    }

    /**
     * Vrátí seznam všech uložených her
     *
     * @returns Promise rozhodnutý na objekt mapující ID na metadata
     */
    public async list(): Promise<Record<string, SaveMetadata>> {
        const result: Record<string, SaveMetadata> = {};
        for (const [id, data] of this.saves.entries()) {
            result[id] = { ...data.metadata };
        }
        return result;
    }

    /**
     * Smaže uloženou hru
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud byla hra smazána
     */
    public async delete(id: string): Promise<boolean> {
        return this.saves.delete(id);
    }

    /**
     * Zkontroluje, zda existuje uložená hra
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud hra existuje
     */
    public async exists(id: string): Promise<boolean> {
        return this.saves.has(id);
    }

    /**
     * Vymaže všechna uložení
     *
     * @returns Promise rozhodnutý na true
     */
    public async clearAll(): Promise<boolean> {
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
}