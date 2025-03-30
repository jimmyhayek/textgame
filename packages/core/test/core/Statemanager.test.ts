import { StateManager } from '../../../src/core/StateManager';

describe('StateManager', () => {
    test('should create default state on initialization', () => {
        const manager = new StateManager();
        const state = manager.getState();

        expect(state.visitedScenes).toBeInstanceOf(Set);
        expect(state.visitedScenes.size).toBe(0);
        expect(state.variables).toEqual({});
    });

    test('should update state', () => {
        const manager = new StateManager();

        manager.updateState(state => {
            state.variables.testVar = 'test';
            state.visitedScenes.add('scene1');
        });

        const state = manager.getState();
        expect(state.variables.testVar).toBe('test');
        expect(state.visitedScenes.has('scene1')).toBe(true);
    });

    test('should serialize and deserialize state', () => {
        const manager = new StateManager();

        manager.updateState(state => {
            state.variables.testVar = 'test';
            state.visitedScenes.add('scene1');
            state.visitedScenes.add('scene2');
        });

        const serialized = manager.serialize();

        // Create new instance and deserialize
        const newManager = new StateManager();
        newManager.deserialize(serialized);

        const newState = newManager.getState();
        expect(newState.variables.testVar).toBe('test');
        expect(newState.visitedScenes.has('scene1')).toBe(true);
        expect(newState.visitedScenes.has('scene2')).toBe(true);
    });
});