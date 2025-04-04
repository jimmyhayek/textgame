// test/utils/createGameEngine.test.ts
import { createGameEngine } from '../../src/utils/createGameEngine';
import { GameEngine } from '../../src/core/GameEngine';
import { defineScenes } from '../../src/utils/defineContent';
import { Plugin } from '../../src/types';

jest.mock('../../src/core/GameEngine');

describe('createGameEngine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should create engine with default options', () => {
        const engine = createGameEngine();

        expect(GameEngine).toHaveBeenCalledWith({ initialState: {} });
    });

    test('should create engine with scenes', () => {
        const mockRegisterScenes = jest.fn();
        const mockGetContentLoader = jest.fn().mockReturnValue({
            registerScenes: mockRegisterScenes
        });

        (GameEngine as jest.Mock).mockImplementation(() => ({
            getContentLoader: mockGetContentLoader
        }));

        const scenes = defineScenes({
            'scene1': { id: 'scene1', title: 'Scene 1', content: 'Content', choices: [] }
        });

        createGameEngine({ scenes });

        expect(mockRegisterScenes).toHaveBeenCalledWith(scenes.content);
    });

    test('should register plugins', () => {
        const mockRegisterPlugin = jest.fn();

        (GameEngine as jest.Mock).mockImplementation(() => ({
            getContentLoader: jest.fn().mockReturnValue({ registerScenes: jest.fn() }),
            registerPlugin: mockRegisterPlugin
        }));

        const plugin1: Plugin = { name: 'plugin1', initialize: jest.fn() };
        const plugin2: Plugin = { name: 'plugin2', initialize: jest.fn() };

        createGameEngine({ plugins: [plugin1, plugin2] });

        expect(mockRegisterPlugin).toHaveBeenCalledWith(plugin1);
        expect(mockRegisterPlugin).toHaveBeenCalledWith(plugin2);
    });

    test('should set initial state', () => {
        const initialState = {
            variables: {
                score: 0,
                playerName: 'Test'
            }
        };

        createGameEngine({ initialState });

        expect(GameEngine).toHaveBeenCalledWith({ initialState });
    });
});