import { ContentLoader } from '../../../src/core/ContentLoader';
import { Scene, SceneId } from '../../../src/types';

describe('ContentLoader', () => {
    let contentLoader: ContentLoader;

    beforeEach(() => {
        contentLoader = new ContentLoader();
    });

    test('should register and load static scenes', async () => {
        const testScene: Scene = {
            id: 'test-scene',
            title: 'Test Scene',
            content: 'Test content',
            choices: []
        };

        contentLoader.registerScenes({
            'test-scene': testScene
        });

        const loadedScene = await contentLoader.loadScene('test-scene');
        expect(loadedScene).toEqual(testScene);
    });

    test('should load scenes via dynamic import', async () => {
        const testScene: Scene = {
            id: 'dynamic-scene',
            title: 'Dynamic Scene',
            content: 'Dynamically loaded content',
            choices: []
        };

        // Mock dynamický import
        const dynamicLoader = jest.fn().mockResolvedValue({ default: testScene });

        contentLoader.registerScenes({
            'dynamic-scene': dynamicLoader
        });

        const loadedScene = await contentLoader.loadScene('dynamic-scene');
        expect(dynamicLoader).toHaveBeenCalled();
        expect(loadedScene).toEqual(testScene);
    });

    test('should throw error for non-existent scene', async () => {
        await expect(contentLoader.loadScene('non-existent')).rejects.toThrow();
    });

    test('should return cached scene on subsequent loads', async () => {
        const testScene: Scene = {
            id: 'cached-scene',
            title: 'Cached Scene',
            content: 'This scene should be cached',
            choices: []
        };

        contentLoader.registerScenes({
            'cached-scene': testScene
        });

        const firstLoad = await contentLoader.loadScene('cached-scene');
        const secondLoad = await contentLoader.loadScene('cached-scene');

        expect(firstLoad).toBe(secondLoad); // Strict equality - same object
    });

    test('should get all scene IDs', () => {
        contentLoader.registerScenes({
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content 1', choices: [] },
            'scene2': { id: 'scene2', title: 'Scene 2', content: 'Content 2', choices: [] }
        });

        const sceneIds = contentLoader.getSceneIds();
        expect(sceneIds).toContain('scene1');
        expect(sceneIds).toContain('scene2');
        expect(sceneIds.length).toBe(2);
    });

    test('should check if scene exists', () => {
        contentLoader.registerScenes({
            'existing-scene': { id: 'existing-scene', title: 'Exists', content: 'Content', choices: [] }
        });

        expect(contentLoader.hasScene('existing-scene')).toBe(true);
        expect(contentLoader.hasScene('non-existing-scene')).toBe(false);
    });

    test('should preload multiple scenes', async () => {
        contentLoader.registerScenes({
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content 1', choices: [] },
            'scene2': { id: 'scene2', title: 'Scene 2', content: 'Content 2', choices: [] },
            'scene3': { id: 'scene3', title: 'Scene 3', content: 'Content 3', choices: [] }
        });

        await contentLoader.preloadScenes(['scene1', 'scene2']);

        // Po preloadingu by měly být scény v cache
        const loadedScene1 = await contentLoader.loadScene('scene1');
        const loadedScene2 = await contentLoader.loadScene('scene2');

        expect(loadedScene1).toBeDefined();
        expect(loadedScene2).toBeDefined();
    });

    test('should handle concurrent load requests efficiently', async () => {
        // Vytvoření mockované funkce, která bude simulovat pomalé načítání
        const slowLoader = jest.fn().mockImplementation(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        default: {
                            id: 'slow-scene',
                            title: 'Slow Scene',
                            content: 'This scene loads slowly',
                            choices: []
                        }
                    });
                }, 100);
            });
        });

        // Registrace scény s pomalým loaderem
        contentLoader.registerScenes({
            'slow-scene': slowLoader
        });

        // Spuštění dvou paralelních načítání
        const promise1 = contentLoader.loadScene('slow-scene');
        const promise2 = contentLoader.loadScene('slow-scene');

        // I když promise objekty mohou být různé, měly by odkazovat na stejné načítání
        // Tuto optimalizaci testujeme tak, že ověříme, že loader byl volán pouze jednou

        // Pro úplnost počkáme na dokončení a ověříme výsledek
        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(result1).toEqual(result2);
        expect(result1.id).toBe('slow-scene');

        // Loader by měl být volán pouze jednou i když jsme požadovali načtení dvakrát
        expect(slowLoader).toHaveBeenCalledTimes(1);
    });

    test('should handle module with direct export (without default property)', async () => {
        // Vytvoření scény, která nemá default export
        const sceneDefinition: Scene = {
            id: 'direct-scene',
            title: 'Direct Scene',
            content: 'Scene with direct export',
            choices: []
        };

        // Funkce, která vrací přímo scénu, ne objekt s default property
        const directLoader = jest.fn().mockResolvedValue(sceneDefinition);

        contentLoader.registerScenes({
            'direct-scene': directLoader
        });

        const loadedScene = await contentLoader.loadScene('direct-scene');

        expect(directLoader).toHaveBeenCalled();
        expect(loadedScene).toBe(sceneDefinition);
        expect(loadedScene.id).toBe('direct-scene');
    });

    test('should preload all registered scenes when no ids specified', async () => {
        // Registrujeme několik scén
        const mockScenes = {
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content 1', choices: [] },
            'scene2': { id: 'scene2', title: 'Scene 2', content: 'Content 2', choices: [] },
            'scene3': { id: 'scene3', title: 'Scene 3', content: 'Content 3', choices: [] }
        };

        contentLoader.registerScenes(mockScenes);

        // Mockujeme loadScene metodu, abychom mohli sledovat její volání
        const loadSceneSpy = jest.spyOn(contentLoader, 'loadScene');

        // Zavoláme preloadScenes bez specifikace scén
        await contentLoader.preloadScenes();

        // Ověříme, že loadScene byla volána pro všechny registrované scény
        expect(loadSceneSpy).toHaveBeenCalledTimes(3);
        expect(loadSceneSpy).toHaveBeenCalledWith('scene1');
        expect(loadSceneSpy).toHaveBeenCalledWith('scene2');
        expect(loadSceneSpy).toHaveBeenCalledWith('scene3');

        // Vyčistíme spy
        loadSceneSpy.mockRestore();
    });
});