// test/utils/createGameEngine.test.ts
import { createGameEngine } from '../../../src/utils/createGameEngine';
import { GameEngine } from '../../../src/core/GameEngine';
import { defineScenes } from '../../../src/utils/defineContent';
import { Plugin } from '../../../src/types';
import { GenericContentLoader } from '../../../src/loaders/GenericContentLoader';

// Mock GameEngine class
jest.mock('../../../src/core/GameEngine');

describe('createGameEngine', () => {
    let mockGameEngineInstance: any;
    let mockRegisterPlugin: jest.Mock;
    let mockRegisterContent: jest.Mock;
    let mockGetLoader: jest.Mock;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock functions
        mockRegisterPlugin = jest.fn();
        mockRegisterContent = jest.fn();
        mockGetLoader = jest.fn();

        // Create mock instance that will be returned by GameEngine constructor
        mockGameEngineInstance = {
            registerPlugin: mockRegisterPlugin,
            registerContent: mockRegisterContent,
            getLoader: mockGetLoader,
        };

        // Configure GameEngine mock to return our instance
        (GameEngine as jest.Mock).mockImplementation(() => mockGameEngineInstance);
    });

    test('should create engine with default options', () => {
        createGameEngine();

        // Should have created GameEngine with default options
        expect(GameEngine).toHaveBeenCalled();

        // GameEngine constructor should receive an object with initialState and loaders
        const constructorArgs = (GameEngine as jest.Mock).mock.calls[0][0];
        expect(constructorArgs).toHaveProperty('initialState');
        expect(constructorArgs).toHaveProperty('loaders');
        expect(constructorArgs.loaders).toHaveProperty('scenes');
    });

    test('should register plugins', () => {
        // Mock getLoader to return a mock loader
        const mockLoader = { registerContent: jest.fn() };
        mockGetLoader.mockReturnValue(mockLoader);

        // Create test plugins
        const plugin1: Plugin = { name: 'plugin1', initialize: jest.fn() };
        const plugin2: Plugin = { name: 'plugin2', initialize: jest.fn() };

        // Call function under test
        createGameEngine({ plugins: [plugin1, plugin2] });

        // Verify plugins were registered
        expect(mockRegisterPlugin).toHaveBeenCalledTimes(2);
        expect(mockRegisterPlugin).toHaveBeenCalledWith(plugin1);
        expect(mockRegisterPlugin).toHaveBeenCalledWith(plugin2);
    });

    test('should register content', () => {
        // Mock getLoader to return a mock loader
        const mockLoader = { registerContent: jest.fn() };
        mockGetLoader.mockReturnValue(mockLoader);

        // Create test content
        const scenes = defineScenes({
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content', choices: [] }
        });

        // Call function under test
        createGameEngine({ content: [scenes] });

        // Verify content was registered
        expect(mockRegisterContent).toHaveBeenCalledWith(scenes);
    });

    test('should set initial state', () => {
        const initialState = {
            variables: {
                score: 0,
                playerName: 'Test'
            }
        };

        createGameEngine({ initialState });

        // Check that initialState was passed to GameEngine constructor
        const constructorArgs = (GameEngine as jest.Mock).mock.calls[0][0];
        expect(constructorArgs.initialState).toBe(initialState);
    });

    test('should use custom loaders if provided', () => {
        const customSceneLoader = new GenericContentLoader();
        const customItemLoader = new GenericContentLoader();

        const loaders = {
            scenes: customSceneLoader,
            items: customItemLoader
        };

        createGameEngine({ loaders });

        // Check that loaders were passed to GameEngine constructor
        const constructorArgs = (GameEngine as jest.Mock).mock.calls[0][0];
        expect(constructorArgs.loaders.scenes).toBe(customSceneLoader);
        expect(constructorArgs.loaders.items).toBe(customItemLoader);
    });
});