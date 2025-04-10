// test/core/SceneManager.test.ts
import { SceneManager } from '../../../src/core/SceneManager';
import { GenericContentLoader } from '../../../src/loaders/GenericContentLoader';
import { Scene, Choice, GameState } from '../../../src/types';

// Mock GenericContentLoader
jest.mock('../../../src/loaders/GenericContentLoader');

describe('SceneManager', () => {
    let sceneManager: SceneManager;
    let sceneLoader: GenericContentLoader<Scene>;
    let mockEngine: any;
    let gameState: GameState;

    beforeEach(() => {
        sceneLoader = new GenericContentLoader<Scene>() as jest.Mocked<GenericContentLoader<Scene>>;
        // Vytvoříme mock pro engine s getStateManager metodou
        mockEngine = {
            id: 'mockEngine',
            // Volitelná implementace getStateManager pro testy
            getStateManager: jest.fn().mockReturnValue({
                updateState: jest.fn((updater) => {
                    updater(gameState);
                })
            })
        };
        sceneManager = new SceneManager(sceneLoader);
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

        (sceneLoader.loadContent as jest.Mock).mockResolvedValue(testScene);

        const result = await sceneManager.transitionToScene('testScene', gameState, mockEngine);

        expect(result).toBe(true);
        expect(sceneLoader.loadContent).toHaveBeenCalledWith('testScene');
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

        (sceneLoader.loadContent as jest.Mock)
            .mockResolvedValueOnce(initialScene)
            .mockResolvedValueOnce(nextScene);

        await sceneManager.transitionToScene('initialScene', gameState, mockEngine);
        await sceneManager.transitionToScene('nextScene', gameState, mockEngine);

        expect(initialScene.onExit).toHaveBeenCalledWith(gameState, mockEngine);
    });

    test('should return false when scene load fails', async () => {
        (sceneLoader.loadContent as jest.Mock).mockRejectedValue(new Error('Scene load failed'));

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

        (sceneLoader.loadContent as jest.Mock).mockResolvedValue(testScene);
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

    test('should handle errors when scene does not exist', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        (sceneLoader.loadContent as jest.Mock).mockResolvedValue(null);

        const result = await sceneManager.transitionToScene('non-existent-scene', gameState, mockEngine);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('should handle the case when getStateManager is not available', async () => {
        // Vytvoříme engine bez getStateManager metody
        const simpleEngine = { id: 'simpleEngine' };

        const testScene: Scene = {
            id: 'testScene',
            title: 'Test Scene',
            content: 'Test content',
            choices: []
        };

        (sceneLoader.loadContent as jest.Mock).mockResolvedValue(testScene);

        const result = await sceneManager.transitionToScene('testScene', gameState, simpleEngine);

        expect(result).toBe(true);
        expect(gameState.visitedScenes.has('testScene')).toBe(true);
    });

    test('should return empty array when no current scene is set', () => {
        // Zajistit, že není nastaven žádný current scene
        const choices = sceneManager.getAvailableChoices(gameState);

        expect(choices).toEqual([]);
        expect(sceneManager.getCurrentSceneId()).toBeNull();
    });
});