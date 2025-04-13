import { SaveManager } from '../../src/save/SaveManager';
import { GameEngine } from '../../src/core/GameEngine';
import { SaveStorage, SaveData, SaveMetadata } from '../../src/types/save';
import { Scene, GameState, SceneKey } from '../../src/types';
import { GenericContentLoader } from '../../src/loaders/GenericContentLoader';

// Mock pro SaveStorage
class MockSaveStorage implements SaveStorage {
    private storage: Record<string, SaveData> = {};

    public async save(id: string, data: SaveData): Promise<boolean> {
        this.storage[id] = { ...data };
        return true;
    }

    public async load(id: string): Promise<SaveData | null> {
        return this.storage[id] || null;
    }

    public async list(): Promise<Record<string, SaveMetadata>> {
        const result: Record<string, SaveMetadata> = {};
        for (const [id, data] of Object.entries(this.storage)) {
            result[id] = data.metadata;
        }
        return result;
    }

    public async delete(id: string): Promise<boolean> {
        if (id in this.storage) {
            delete this.storage[id];
            return true;
        }
        return false;
    }

    public async exists(id: string): Promise<boolean> {
        return id in this.storage;
    }

    // Pomocná metoda pro testy
    public getStorage(): Record<string, SaveData> {
        return { ...this.storage };
    }
}

describe('SaveManager', () => {
    let saveManager: SaveManager;
    let engine: GameEngine;
    let mockStorage: MockSaveStorage;
    let sceneLoader: GenericContentLoader<Scene>;

    // Definujeme testovací scény
    const startScene: Scene = {
        title: 'Start',
        content: 'This is the start scene',
        choices: [
            {
                content: 'Go to the forest',
                scene: 'forest'
            }
        ]
    };

    const forestScene: Scene = {
        title: 'Forest',
        content: 'You are in a forest',
        choices: [
            {
                content: 'Go back to start',
                scene: 'start'
            }
        ]
    };

    beforeEach(() => {
        // Vytvoření content loaderu se scénami
        sceneLoader = new GenericContentLoader<Scene>();
        sceneLoader.registerContent({
            'start': startScene,
            'forest': forestScene
        });

        // Vytvoření enginu
        engine = new GameEngine({
            sceneLoader
        });

        // Vytvoření mock úložiště
        mockStorage = new MockSaveStorage();

        // Vytvoření SaveManageru
        saveManager = new SaveManager(engine, {
            storage: mockStorage,
            engineVersion: '0.1.0'
        });
    });

    test('should save and load a game', async () => {
        // Spustíme hru a přejdeme do lesa
        await engine.start('start');
        await engine.selectChoice(0); // Go to the forest

        // Uložíme hru
        const saveId = 'test-save';
        const success = await saveManager.save(saveId, { name: 'Test Save' });
        expect(success).toBe(true);

        // Kontrola, že byla hra uložena
        const savedGames = await saveManager.getSaves();
        expect(Object.keys(savedGames)).toContain(saveId);
        expect(savedGames[saveId].name).toBe('Test Save');
        expect(savedGames[saveId].currentSceneKey).toBe('forest');

        // Přejdeme zpět na start
        await engine.selectChoice(0); // Go back to start
        expect(engine.getCurrentSceneKey()).toBe('start');

        // Načteme uloženou hru
        const loadSuccess = await saveManager.load(saveId);
        expect(loadSuccess).toBe(true);

        // Kontrola, že jsme zpět v lese
        expect(engine.getCurrentSceneKey()).toBe('forest');
    });

    test('should handle quickSave and quickLoad', async () => {
        // Spustíme hru
        await engine.start('start');

        // Provedeme rychlé uložení
        const success = await saveManager.quickSave();
        expect(success).toBe(true);

        // Zkontrolujeme, že quicksave existuje
        const saves = await saveManager.getSaves();
        expect('quicksave' in saves).toBe(true);

        // Přejdeme do lesa
        await engine.selectChoice(0);
        expect(engine.getCurrentSceneKey()).toBe('forest');

        // Načteme rychlé uložení
        const loadSuccess = await saveManager.quickLoad();
        expect(loadSuccess).toBe(true);

        // Zkontrolujeme, že jsme zpět na startu
        expect(engine.getCurrentSceneKey()).toBe('start');
    });

    test('should handle save deletion', async () => {
        // Spustíme hru
        await engine.start('start');

        // Uložíme hru
        const saveId = 'delete-test';
        await saveManager.save(saveId);

        // Zkontrolujeme, že uložení existuje
        expect(await mockStorage.exists(saveId)).toBe(true);

        // Smažeme uložení
        const deleteSuccess = await saveManager.deleteSave(saveId);
        expect(deleteSuccess).toBe(true);

        // Zkontrolujeme, že uložení bylo smazáno
        expect(await mockStorage.exists(saveId)).toBe(false);
    });

    test('should track play time', async () => {
        // Spustíme hru
        await engine.start('start');

        // Počkáme 100ms
        await new Promise(resolve => setTimeout(resolve, 100));

        // Uložíme hru
        const saveId = 'playtime-test';
        await saveManager.save(saveId);

        // Načteme metadata uložené hry
        const saves = await saveManager.getSaves();
        const metadata = saves[saveId];

        // Zkontrolujeme, že čas hraní byl zaznamenán
        expect(metadata.playTime).toBeGreaterThan(0);

        // Zkontrolujeme, že formátování času funguje
        const formattedTime = saveManager.formatPlayTime(metadata.playTime);
        expect(formattedTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    // Další testy podle potřeby...
});