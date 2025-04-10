import { StateManager } from '../../../src/core/StateManager';
import { GameState } from '../../../src/types';

describe('StateManager', () => {
    let stateManager: StateManager;

    beforeEach(() => {
        stateManager = new StateManager();
    });

    test('should initialize with default empty state', () => {
        const state = stateManager.getState();

        expect(state).toBeDefined();
        expect(state.visitedScenes).toBeInstanceOf(Set);
        expect(state.visitedScenes.size).toBe(0);
        expect(state.variables).toEqual({});
    });

    test('should initialize with provided initial state', () => {
        const initialState: Partial<GameState> = {
            variables: {
                health: 100,
                name: 'Test Player'
            }
        };

        stateManager = new StateManager(initialState);
        const state = stateManager.getState();

        expect(state.variables).toEqual(initialState.variables);
        expect(state.visitedScenes).toBeInstanceOf(Set);
    });

    test('should update state with updateState method', () => {
        stateManager.updateState(state => {
            state.variables.health = 100;
            state.variables.name = 'Player';
        });

        const updatedState = stateManager.getState();

        expect(updatedState.variables.health).toBe(100);
        expect(updatedState.variables.name).toBe('Player');
    });

    test('should set completely new state with setState method', () => {
        const newState: GameState = {
            visitedScenes: new Set(['scene1', 'scene2']),
            variables: {
                score: 200
            }
        };

        stateManager.setState(newState);
        const state = stateManager.getState();

        expect(state).toBe(newState);
        expect(state.visitedScenes.has('scene1')).toBe(true);
        expect(state.visitedScenes.has('scene2')).toBe(true);
        expect(state.variables.score).toBe(200);
    });

    test('should serialize and deserialize state correctly', () => {
        // Set up some state to serialize
        stateManager.updateState(state => {
            state.visitedScenes.add('scene1');
            state.visitedScenes.add('scene2');
            state.variables.health = 75;
            state.variables.inventory = ['sword', 'potion'];
        });

        // Serialize the state
        const serialized = stateManager.serialize();

        // Create a new state manager
        const newStateManager = new StateManager();

        // Deserialize into new state manager
        newStateManager.deserialize(serialized);

        // Check that state was correctly restored
        const restoredState = newStateManager.getState();

        expect(restoredState.visitedScenes.has('scene1')).toBe(true);
        expect(restoredState.visitedScenes.has('scene2')).toBe(true);
        expect(restoredState.variables.health).toBe(75);
        expect(restoredState.variables.inventory).toEqual(['sword', 'potion']);
    });

    test('should handle complex nested objects in state', () => {
        stateManager.updateState(state => {
            state.variables.player = {
                stats: {
                    strength: 10,
                    dexterity: 8,
                    intelligence: 12
                },
                equipment: {
                    weapon: 'sword',
                    armor: 'leather'
                }
            };
        });

        // Perform update on nested properties
        stateManager.updateState(state => {
            state.variables.player.stats.strength += 5;
            state.variables.player.equipment.weapon = 'axe';
        });

        const state = stateManager.getState();

        // Check that nested updates worked correctly
        expect(state.variables.player.stats.strength).toBe(15);
        expect(state.variables.player.equipment.weapon).toBe('axe');
        expect(state.variables.player.stats.intelligence).toBe(12); // Should be unchanged
    });

    test('should serialize and deserialize Set correctly', () => {
        stateManager.updateState(state => {
            state.visitedScenes.add('scene1');
            state.visitedScenes.add('scene2');
        });

        const serialized = stateManager.serialize();
        const newStateManager = new StateManager();
        newStateManager.deserialize(serialized);

        const restored = newStateManager.getState();

        expect(restored.visitedScenes).toBeInstanceOf(Set);
        expect(restored.visitedScenes.has('scene1')).toBe(true);
        expect(restored.visitedScenes.has('scene2')).toBe(true);
    });
});