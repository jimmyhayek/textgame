import { SaveData, SaveMetadata, SaveStorage } from '@pabitel/core';

/**
 * Možnosti pro konfiguraci LocalStorageSaveStorage
 */
export interface LocalStorageSaveStorageOptions {
    /**
     * Prefix pro klíče v localStorage
     * Používá se k oddělení uložených her od ostatních dat
     * Výchozí: 'pabitel_save_'
     */
    prefix?: string;
}

/**
 * Implementace SaveStorage využívající localStorage
 *
 * Tato třída poskytuje implementaci pro ukládání a načítání
 * uložených her s využitím localStorage prohlížeče.
 */
export class LocalStorageSaveStorage implements SaveStorage {
    /**
     * Prefix pro klíče v localStorage
     * Používá se k oddělení uložených her od ostatních dat
     */
    private readonly prefix: string;

    /**
     * Klíč pro metadata o všech uložených hrách
     */
    private readonly metadataKey: string;

    /**
     * Vytvoří novou instanci LocalStorageSaveStorage
     *
     * @param options Možnosti konfigurace
     */
    constructor(options: LocalStorageSaveStorageOptions = {}) {
        this.prefix = options.prefix || 'pabitel_save_';
        this.metadataKey = `${this.prefix}metadata`;
    }

    /**
     * Uloží data do localStorage
     *
     * @param id Identifikátor uložené hry
     * @param data Data k uložení
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné
     */
    public async save(id: string, data: SaveData): Promise<boolean> {
        try {
            // Uložení dat
            localStorage.setItem(this.getKey(id), JSON.stringify(data));

            // Aktualizace metadat
            const metadataMap = await this.getMetadataMap();
            metadataMap[id] = data.metadata;
            localStorage.setItem(this.metadataKey, JSON.stringify(metadataMap));

            return true;
        } catch (error) {
            console.error(`Failed to save game with id '${id}':`, error);
            return false;
        }
    }

    /**
     * Načte data z localStorage
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na data, nebo null pokud uložená hra neexistuje
     */
    public async load(id: string): Promise<SaveData | null> {
        try {
            const dataStr = localStorage.getItem(this.getKey(id));
            if (!dataStr) {
                return null;
            }

            return JSON.parse(dataStr) as SaveData;
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
        return await this.getMetadataMap();
    }

    /**
     * Smaže uloženou hru
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud bylo smazání úspěšné
     */
    public async delete(id: string): Promise<boolean> {
        try {
            // Odstranění dat
            localStorage.removeItem(this.getKey(id));

            // Aktualizace metadat
            const metadataMap = await this.getMetadataMap();
            delete metadataMap[id];
            localStorage.setItem(this.metadataKey, JSON.stringify(metadataMap));

            return true;
        } catch (error) {
            console.error(`Failed to delete game with id '${id}':`, error);
            return false;
        }
    }

    /**
     * Zkontroluje, zda existuje uložená hra s daným ID
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na true, pokud uložená hra existuje
     */
    public async exists(id: string): Promise<boolean> {
        return localStorage.getItem(this.getKey(id)) !== null;
    }

    /**
     * Vrátí kompletní klíč pro localStorage
     *
     * @param id Identifikátor uložené hry
     * @returns Kompletní klíč pro localStorage
     * @private
     */
    private getKey(id: string): string {
        return `${this.prefix}${id}`;
    }

    /**
     * Získá mapu všech metadat
     *
     * @returns Mapa ID na metadata
     * @private
     */
    private async getMetadataMap(): Promise<Record<string, SaveMetadata>> {
        const metadataStr = localStorage.getItem(this.metadataKey);
        if (!metadataStr) {
            return {};
        }

        try {
            return JSON.parse(metadataStr) as Record<string, SaveMetadata>;
        } catch (error) {
            console.error('Failed to parse metadata:', error);
            return {};
        }
    }

    /**
     * Vyčistí všechna uložení s daným prefixem
     *
     * @returns Promise rozhodnutý na true, pokud bylo vyčištění úspěšné
     */
    public async clearAll(): Promise<boolean> {
        try {
            const metadataMap = await this.getMetadataMap();

            // Odstranění všech uložených her
            for (const id of Object.keys(metadataMap)) {
                localStorage.removeItem(this.getKey(id));
            }

            // Odstranění metadat
            localStorage.removeItem(this.metadataKey);

            return true;
        } catch (error) {
            console.error('Failed to clear all saves:', error);
            return false;
        }
    }

    /**
     * Vrátí všechny klíče v localStorage, které mají daný prefix
     *
     * @returns Pole klíčů
     */
    public getAllKeys(): string[] {
        const keys: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                // Odstranění prefixu z klíče
                keys.push(key.substring(this.prefix.length));
            }
        }

        return keys;
    }

    /**
     * Vrátí celkovou velikost uložených dat v bajtech
     *
     * @returns Velikost v bajtech
     */
    public getTotalSize(): number {
        let totalSize = 0;

        // Velikost metadat
        const metadataStr = localStorage.getItem(this.metadataKey);
        if (metadataStr) {
            totalSize += metadataStr.length * 2; // 2 bajty na znak
        }

        // Velikost jednotlivých uložení
        for (const id of this.getAllKeys()) {
            const saveStr = localStorage.getItem(this.getKey(id));
            if (saveStr) {
                totalSize += saveStr.length * 2; // 2 bajty na znak
            }
        }

        return totalSize;
    }
}