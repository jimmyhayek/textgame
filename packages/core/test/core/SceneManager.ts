// test/core/SceneManager.test.ts
import { SceneManager } from '../../src/core/SceneManager';
import { ContentLoader } from '../../src/core/ContentLoader';
import { Scene, Choice, GameState } from '../../src/types';

// Mock ContentLoader
jest.mock('../../src/core/ContentLoader');

describe('SceneManager', () => {
    let sceneManager: SceneManager;
    let contentLoader: ContentLoader;
    let mockEngine: any;
    let gameState: GameState;

    beforeEach(() => {
        contentLoader = new ContentLoader() as jest.Mocked<ContentLoader>;
        mockEngine = { id: 'mockEngine' };
        sceneManager = new SceneManager(contentLoader);
        gameState = { visitedScenes: new Set<string>(), variables: {} };
    });

    test('should transition to scene', async () => {
        const testScene: Scene = {
            id: 'testScene',
            title: 'Test Scene',
            content: 'Test content',
            choices: [],
            onEnter: jest.fn()
        };

        (contentLoader.loadScene as jest.Mock).mockResolvedValue(testScene);

        const result = await sceneManager.transitionToScene('testScene', gameState, mockEngine);

        expect(result).toBe(true);
        expect(contentLoader.loadScene).toHaveBeenCalledWith('testScene');
        expect(testScene.onEnter).toHaveBeenCalledWith(gameState, mockEngine);
        expect(gameState.visitedScenes.has('testScene')).toBe(true);
        expect(sceneManager.getCurrentSceneId()).toBe('testScene');
        expect(sceneManager.getCurrentScene()).toBe(testScene);
    });

    test('should call onExit when transitioning from scene', async () => {
        const initialScene: Scene = {
            id: 'initialScene',
            title: 'Initial Scene',
            content: 'Initial content',
            choices: [],
            onExit: jest.fn()
        };

        const nextScene: Scene = {
            id: 'nextScene',
            title: 'Next Scene',
            content: 'Next content',
            choices: []
        };

        (contentLoader.loadScene as jest.Mock)
            .mockResolvedValueOnce(initialScene)
            .mockResolvedValueOnce(nextScene);

        await sceneManager.transitionToScene('initialScene', gameState, mockEngine);
        await sceneManager.transitionToScene('nextScene', gameState, mockEngine);

        expect(initialScene.onExit).toHaveBeenCalledWith(gameState, mockEngine);
    });

    test('should return false when scene load fails', async () => {
        (contentLoader.loadScene as jest.Mock).mockRejectedValue(new Error('Scene load failed'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await sceneManager.transitionToScene('failScene', gameState, mockEngine);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    test('should filter available choices based on conditions', async () => {
        const choices: Choice[] = [
            { id: 'always', text: 'Always Available', nextScene: 'next1' },
            {
                id: 'conditional',
                text: 'Conditional',
                nextScene: 'next2',
                condition: (state) => state.variables.flag === true
            }
        ];

        const testScene: Scene = {
            id: 'choiceScene',
            title: 'Choice Scene',
            content: 'Test choices',
            choices
        };

        (contentLoader.loadScene as jest.Mock).mockResolvedValue(testScene);
        await sceneManager.transitionToScene('choiceScene', gameState, mockEngine);

        // Without flag
        let availableChoices = sceneManager.getAvailableChoices(gameState);
        expect(availableChoices).toHaveLength(1);
        expect(availableChoices[0].id).toBe('always');

        // With flag set to true
        gameState.variables.flag = true;
        availableChoices = sceneManager.getAvailableChoices(gameState);
        expect(availableChoices).toHaveLength(2);

        // With flag set to false
        gameState.variables.flag = false;
        availableChoices = sceneManager.getAvailableChoices(gameState);
        expect(availableChoices).toHaveLength(1);
    });

    test('should return empty array when no current scene', () => {
        const choices = sceneManager.getAvailableChoices(gameState);
        expect(choices).toEqual([]);
    });

    // test/core/SceneManager.test.ts - doplňte testy pro tyto scénáře
    test('should handle errors when scene does not exist', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await sceneManager.transitionToScene('non-existent-scene', gameState, mockEngine);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('should return empty array when no current scene is set', () => {
        // Zajistit, že není nastaven žádný current scene
        // Využít getCurrentSceneId() k ověření null

        const choices = sceneManager.getAvailableChoices(gameState);

        expect(choices).toEqual([]);
    });
});