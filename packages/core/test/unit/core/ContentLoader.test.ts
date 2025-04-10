import { GenericContentLoader } from '../../../src/loaders/GenericContentLoader';
import { Scene } from '../../../src/types';

describe('GenericContentLoader', () => {
    let contentLoader: GenericContentLoader<Scene>;

    beforeEach(() => {
        contentLoader = new GenericContentLoader<Scene>();
    });

    test('should register and load static content', async () => {
        const testScene: Scene = {
            id: 'test-scene',
            title: 'Test Scene',
            content: 'Test content',
            choices: []
        };

        contentLoader.registerContent({
            'test-scene': testScene
        });

        const loadedScene = await contentLoader.loadContent('test-scene');
        expect(loadedScene).toEqual(testScene);
    });

    test('should load content via dynamic import', async () => {
        const testScene: Scene = {
            id: 'dynamic-scene',
            title: 'Dynamic Scene',
            content: 'Dynamically loaded content',
            choices: []
        };

        // Mock dynamický import
        const dynamicLoader = jest.fn().mockResolvedValue({ default: testScene });

        contentLoader.registerContent({
            'dynamic-scene': dynamicLoader
        });

        const loadedScene = await contentLoader.loadContent('dynamic-scene');
        expect(dynamicLoader).toHaveBeenCalled();
        expect(loadedScene).toEqual(testScene);
    });

    test('should throw error for non-existent content', async () => {
        await expect(contentLoader.loadContent('non-existent')).rejects.toThrow();
    });

    test('should return cached content on subsequent loads', async () => {
        const testScene: Scene = {
            id: 'cached-scene',
            title: 'Cached Scene',
            content: 'This scene should be cached',
            choices: []
        };

        contentLoader.registerContent({
            'cached-scene': testScene
        });

        const firstLoad = await contentLoader.loadContent('cached-scene');
        const secondLoad = await contentLoader.loadContent('cached-scene');

        expect(firstLoad).toBe(secondLoad); // Strict equality - same object
    });

    test('should get all content IDs', () => {
        contentLoader.registerContent({
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content 1', choices: [] },
            'scene2': { id: 'scene2', title: 'Scene 2', content: 'Content 2', choices: [] }
        });

        const contentIds = contentLoader.getContentIds();
        expect(contentIds).toContain('scene1');
        expect(contentIds).toContain('scene2');
        expect(contentIds.length).toBe(2);
    });

    test('should check if content exists', () => {
        contentLoader.registerContent({
            'existing-scene': { id: 'existing-scene', title: 'Exists', content: 'Content', choices: [] }
        });

        expect(contentLoader.hasContent('existing-scene')).toBe(true);
        expect(contentLoader.hasContent('non-existing-scene')).toBe(false);
    });

    test('should preload multiple content items', async () => {
        contentLoader.registerContent({
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content 1', choices: [] },
            'scene2': { id: 'scene2', title: 'Scene 2', content: 'Content 2', choices: [] },
            'scene3': { id: 'scene3', title: 'Scene 3', content: 'Content 3', choices: [] }
        });

        await contentLoader.preloadContent(['scene1', 'scene2']);

        // Po preloadingu by měly být scény v cache
        const loadedScene1 = await contentLoader.loadContent('scene1');
        const loadedScene2 = await contentLoader.loadContent('scene2');

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
        contentLoader.registerContent({
            'slow-scene': slowLoader
        });

        // Spuštění dvou paralelních načítání
        const promise1 = contentLoader.loadContent('slow-scene');
        const promise2 = contentLoader.loadContent('slow-scene');

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

        contentLoader.registerContent({
            'direct-scene': directLoader
        });

        const loadedScene = await contentLoader.loadContent('direct-scene');

        expect(directLoader).toHaveBeenCalled();
        expect(loadedScene).toBe(sceneDefinition);
        expect(loadedScene.id).toBe('direct-scene');
    });

    test('should preload all registered content when no ids specified', async () => {
        // Registrujeme několik scén
        const mockScenes = {
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content 1', choices: [] },
            'scene2': { id: 'scene2', title: 'Scene 2', content: 'Content 2', choices: [] },
            'scene3': { id: 'scene3', title: 'Scene 3', content: 'Content 3', choices: [] }
        };

        contentLoader.registerContent(mockScenes);

        // Mockujeme loadContent metodu, abychom mohli sledovat její volání
        const loadContentSpy = jest.spyOn(contentLoader, 'loadContent');

        // Zavoláme preloadContent bez specifikace scén
        await contentLoader.preloadContent();

        // Ověříme, že loadContent byla volána pro všechny registrované scény
        expect(loadContentSpy).toHaveBeenCalledTimes(3);
        expect(loadContentSpy).toHaveBeenCalledWith('scene1');
        expect(loadContentSpy).toHaveBeenCalledWith('scene2');
        expect(loadContentSpy).toHaveBeenCalledWith('scene3');

        // Vyčistíme spy
        loadContentSpy.mockRestore();
    });
});