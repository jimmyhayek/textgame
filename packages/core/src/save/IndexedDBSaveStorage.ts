import { SaveData, SaveMetadata, SaveStorage } from '../types/save';

/**
 * Možnosti pro konfiguraci IndexedDBSaveStorage
 */
export interface IndexedDBSaveStorageOptions {
    /**
     * Název databáze
     * Výchozí: 'pabitel_saves'
     */
    databaseName?: string;

    /**
     * Verze databáze
     * Výchozí: 1
     */
    databaseVersion?: number;

    /**
     * Název store pro uložené hry
     * Výchozí: 'saves'
     */
    storeName?: string;

    /**
     * Název store pro metadata
     * Výchozí: 'metadata'
     */
    metadataStoreName?: string;

    /**
     * Prefix pro klíče uložených her
     * Výchozí: ''
     */
    prefix?: string;

    /**
     * Callback volaný při upgradu databáze
     */
    onUpgradeNeeded?: (event: IDBVersionChangeEvent, db: IDBDatabase) => void;

    /**
     * Callback pro chyby
     */
    onError?: (error: Error, operation: string) => void;

    /**
     * Timeout pro operace v milisekundách
     * Výchozí: 5000
     */
    timeout?: number;
}

/**
 * Implementace SaveStorage využívající IndexedDB
 *
 * Tato třída poskytuje implementaci pro ukládání a načítání
 * uložených her s využitím IndexedDB, což umožňuje ukládat větší
 * množství dat než do localStorage.
 */
export class IndexedDBSaveStorage implements SaveStorage {
    /**
     * Název databáze
     */
    private readonly databaseName: string;

    /**
     * Verze databáze
     */
    private readonly databaseVersion: number;

    /**
     * Název store pro uložené hry
     */
    private readonly storeName: string;

    /**
     * Název store pro metadata
     */
    private readonly metadataStoreName: string;

    /**
     * Prefix pro klíče uložených her
     */
    private readonly prefix: string;

    /**
     * Callback volaný při upgradu databáze
     */
    private readonly onUpgradeNeeded?: (event: IDBVersionChangeEvent, db: IDBDatabase) => void;

    /**
     * Callback pro chyby
     */
    private readonly onError?: (error: Error, operation: string) => void;

    /**
     * Timeout pro operace
     */
    private readonly timeout: number;

    /**
     * Cache databáze - uchovává otevřené spojení pro opakované použití
     */
    private dbCache: IDBDatabase | null = null;

    /**
     * Příznak, zda jsou metody asynchronně inicializovány
     */
    private initialized: boolean = false;

    /**
     * Promise pro čekání na dokončení inicializace
     */
    private initPromise: Promise<boolean> | null = null;

    /**
     * Vytvoří novou instanci IndexedDBSaveStorage
     *
     * @param options Možnosti konfigurace
     */
    constructor(options: IndexedDBSaveStorageOptions = {}) {
        this.databaseName = options.databaseName || 'pabitel_saves';
        this.databaseVersion = options.databaseVersion || 1;
        this.storeName = options.storeName || 'saves';
        this.metadataStoreName = options.metadataStoreName || 'metadata';
        this.prefix = options.prefix || '';
        this.onUpgradeNeeded = options.onUpgradeNeeded;
        this.onError = options.onError || ((error, operation) => {
            console.error(`[IndexedDBSaveStorage] Error during ${operation}:`, error);
        });
        this.timeout = options.timeout || 5000;

        // Inicializace databáze při vytvoření instance
        this.initPromise = this.initializeDatabase();
    }

    /**
     * Inicializuje databázi
     *
     * @returns Promise rozhodnutý na true, pokud byla inicializace úspěšná
     * @private
     */
    private async initializeDatabase(): Promise<boolean> {
        if (this.initialized) {
            return true;
        }

        if (!window.indexedDB) {
            this.handleError(new Error('IndexedDB is not supported in this browser'), 'initialize');
            return false;
        }

        try {
            const db = await this.openDatabase();
            this.dbCache = db;
            this.initialized = true;
            return true;
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'initialize');
            return false;
        }
    }

    /**
     * Otevře databázi
     *
     * @returns Promise rozhodnutý na IDBDatabase
     * @private
     */
    private openDatabase(): Promise<IDBDatabase> {
        return new Promise<IDBDatabase>((resolve, reject) => {
            // Použití cache, pokud je k dispozici
            if (this.dbCache) {
                return resolve(this.dbCache);
            }

            // Timeout pro operaci
            const timeoutId = setTimeout(() => {
                reject(new Error('Database open operation timed out'));
            }, this.timeout);

            try {
                const request = window.indexedDB.open(this.databaseName, this.databaseVersion);

                // Vytvoření nebo upgrade databáze
                request.onupgradeneeded = (event) => {
                    const db = request.result;

                    // Vytvoření store pro uložené hry, pokud neexistuje
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }

                    // Vytvoření store pro metadata, pokud neexistuje
                    if (!db.objectStoreNames.contains(this.metadataStoreName)) {
                        const metadataStore = db.createObjectStore(this.metadataStoreName);
                        // Vytvoření indexu pro rychlejší vyhledávání podle gameId
                        metadataStore.createIndex('gameId', 'gameId', { unique: false });
                    }

                    // Volání vlastního callbacku, pokud existuje
                    if (this.onUpgradeNeeded) {
                        this.onUpgradeNeeded(event, db);
                    }
                };

                // Handler pro úspěšné otevření
                request.onsuccess = () => {
                    clearTimeout(timeoutId);
                    this.dbCache = request.result;
                    resolve(request.result);
                };

                // Handler pro chyby
                request.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(request.error);
                };
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Získá objekt store pro čtení
     *
     * @param storeName Název store
     * @returns Promise rozhodnutý na IDBObjectStore
     * @private
     */
    private async getReadStore(storeName: string): Promise<IDBObjectStore> {
        await this.ensureInitialized();
        const db = await this.openDatabase();
        const transaction = db.transaction(storeName, 'readonly');
        return transaction.objectStore(storeName);
    }

    /**
     * Získá objekt store pro zápis
     *
     * @param storeName Název store
     * @returns Promise rozhodnutý na IDBObjectStore
     * @private
     */
    private async getWriteStore(storeName: string): Promise<IDBObjectStore> {
        await this.ensureInitialized();
        const db = await this.openDatabase();
        const transaction = db.transaction(storeName, 'readwrite');
        return transaction.objectStore(storeName);
    }

    /**
     * Zajistí, že databáze je inicializována
     *
     * @returns Promise rozhodnutý, když je databáze inicializována
     * @private
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            if (this.initPromise) {
                await this.initPromise;
            } else {
                this.initPromise = this.initializeDatabase();
                await this.initPromise;
            }
        }
    }

    /**
     * Vytvoří kompletní klíč s prefixem
     *
     * @param key Základní klíč
     * @returns Klíč s prefixem
     * @private
     */
    private getFullKey(key: string): string {
        return this.prefix ? `${this.prefix}_${key}` : key;
    }

    /**
     * Zpracuje operaci nad store
     *
     * @param store ObjectStore pro operaci
     * @param operation Název operace pro logování
     * @param action Funkce provádějící operaci
     * @returns Promise rozhodnutý na výsledek operace
     * @private
     */
    private processStoreOperation<T>(
        store: IDBObjectStore,
        operation: string,
        action: (store: IDBObjectStore) => IDBRequest<T>
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation ${operation} timed out`));
            }, this.timeout);

            try {
                const request = action(store);

                request.onsuccess = () => {
                    clearTimeout(timeoutId);
                    resolve(request.result);
                };

                request.onerror = () => {
                    clearTimeout(timeoutId);
                    this.handleError(request.error || new Error('Unknown error'), operation);
                    reject(request.error);
                };
            } catch (error) {
                clearTimeout(timeoutId);
                this.handleError(error instanceof Error ? error : new Error(String(error)), operation);
                reject(error);
            }
        });
    }

    /**
     * Zpracuje chybu
     *
     * @param error Chyba
     * @param operation Název operace, při které došlo k chybě
     * @private
     */
    private handleError(error: Error, operation: string): void {
        if (this.onError) {
            this.onError(error, operation);
        }
    }

    /**
     * Uloží data do databáze
     *
     * @param id Identifikátor uložené hry
     * @param data Data k uložení
     * @returns Promise rozhodnutý na true, pokud bylo uložení úspěšné
     */
    public async save(id: string, data: SaveData): Promise<boolean> {
        try {
            const fullKey = this.getFullKey(id);

            // Uložení kompletních dat
            const saveStore = await this.getWriteStore(this.storeName);
            await this.processStoreOperation(
                saveStore,
                'save',
                (store) => store.put(data, fullKey)
            );

            // Uložení metadat pro rychlejší přístup
            const metadataStore = await this.getWriteStore(this.metadataStoreName);
            await this.processStoreOperation(
                metadataStore,
                'save_metadata',
                (store) => store.put(data.metadata, fullKey)
            );

            return true;
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'save');
            return false;
        }
    }

    /**
     * Načte data z databáze
     *
     * @param id Identifikátor uložené hry
     * @returns Promise rozhodnutý na data, nebo null pokud uložená hra neexistuje
     */
    public async load(id: string): Promise<SaveData | null> {
        try {
            const fullKey = this.getFullKey(id);
            const store = await this.getReadStore(this.storeName);

            const result = await this.processStoreOperation<SaveData | undefined>(
                store,
                'load',
                (store) => store.get(fullKey)
            );

            return result || null;
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'load');
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
            const store = await this.getReadStore(this.metadataStoreName);

            return new Promise<Record<string, SaveMetadata>>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('List operation timed out'));
                }, this.timeout);

                try {
                    const result: Record<string, SaveMetadata> = {};
                    const request = store.openCursor();

                    request.onsuccess = () => {
                        const cursor = request.result;
                        if (cursor) {
                            const key = cursor.key.toString();
                            // Odstranění prefixu z klíče, pokud existuje
                            const id = this.prefix && key.startsWith(this.prefix + '_')
                                ? key.substring(this.prefix.length + 1)
                                : key;

                            result[id] = cursor.value as SaveMetadata;
                            cursor.continue();
                        } else {
                            clearTimeout(timeoutId);
                            resolve(result);
                        }
                    };

                    request.onerror = () => {
                        clearTimeout(timeoutId);
                        this.handleError(request.error || new Error('Unknown error'), 'list');
                        reject(request.error);
                    };
                } catch (error) {
                    clearTimeout(timeoutId);
                    this.handleError(error instanceof Error ? error : new Error(String(error)), 'list');
                    reject(error);
                }
            });
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'list');
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
        try {
            const fullKey = this.getFullKey(id);

            // Smazání kompletních dat
            const saveStore = await this.getWriteStore(this.storeName);
            await this.processStoreOperation(
                saveStore,
                'delete',
                (store) => store.delete(fullKey)
            );

            // Smazání metadat
            const metadataStore = await this.getWriteStore(this.metadataStoreName);
            await this.processStoreOperation(
                metadataStore,
                'delete_metadata',
                (store) => store.delete(fullKey)
            );

            return true;
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'delete');
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
        try {
            const fullKey = this.getFullKey(id);
            const store = await this.getReadStore(this.metadataStoreName);

            const result = await this.processStoreOperation<SaveMetadata | undefined>(
                store,
                'exists',
                (store) => store.get(fullKey)
            );

            return !!result;
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'exists');
            return false;
        }
    }

    /**
     * Vyčistí celou databázi
     *
     * @returns Promise rozhodnutý na true, pokud bylo vyčištění úspěšné
     */
    public async clear(): Promise<boolean> {
        try {
            // Vyčištění uložených her
            const saveStore = await this.getWriteStore(this.storeName);
            await this.processStoreOperation(
                saveStore,
                'clear_saves',
                (store) => store.clear()
            );

            // Vyčištění metadat
            const metadataStore = await this.getWriteStore(this.metadataStoreName);
            await this.processStoreOperation(
                metadataStore,
                'clear_metadata',
                (store) => store.clear()
            );

            return true;
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'clear');
            return false;
        }
    }

    /**
     * Vrátí všechna uložení jako pole
     * Užitečné pro export/zálohu
     *
     * @returns Promise rozhodnutý na pole všech uložených her
     */
    public async getAllSaves(): Promise<SaveData[]> {
        try {
            const store = await this.getReadStore(this.storeName);

            return new Promise<SaveData[]>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('GetAll operation timed out'));
                }, this.timeout);

                try {
                    const request = store.getAll();

                    request.onsuccess = () => {
                        clearTimeout(timeoutId);
                        resolve(request.result);
                    };

                    request.onerror = () => {
                        clearTimeout(timeoutId);
                        this.handleError(request.error || new Error('Unknown error'), 'getAllSaves');
                        reject(request.error);
                    };
                } catch (error) {
                    clearTimeout(timeoutId);
                    this.handleError(error instanceof Error ? error : new Error(String(error)), 'getAllSaves');
                    reject(error);
                }
            });
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), 'getAllSaves');
            return [];
        }
    }

    /**
     * Importuje uložené hry
     *
     * @param saves Pole uložených her k importu
     * @returns Promise rozhodnutý na počet úspěšně importovaných her
     */
    public async importSaves(saves: SaveData[]): Promise<number> {
        let successCount = 0;

        for (const save of saves) {
            if (save.metadata && save.metadata.id) {
                const success = await this.save(save.metadata.id, save);
                if (success) {
                    successCount++;
                }
            }
        }

        return successCount;
    }

    /**
     * Zavře databázi a uvolní prostředky
     *
     * @returns Promise rozhodnutý, když je databáze zavřena
     */
    public async close(): Promise<void> {
        if (this.dbCache) {
            this.dbCache.close();
            this.dbCache = null;
            this.initialized = false;
        }
    }
}