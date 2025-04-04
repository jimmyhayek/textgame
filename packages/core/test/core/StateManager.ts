// test/core/StateManager.test.ts
import { StateManager } from '../../src/core/StateManager';
import { GameState } from '../../src/types';

describe('StateManager', () => {
    let stateManager: StateManager;

    beforeEach(() => {
        stateManager = new StateManager();
    });

    test('should create default state on initialization', () => {
        const state = stateManager.getState();

        expect(state.visitedScenes).toBeInstanceOf(Set);
        expect(state.visitedScenes.size).toBe(0);
        expect(state.variables).toEqual({});
    });

    test('should initialize with provided state', () => {
        const initialState = {
            variables: {
                score: 100,
                name: 'Player'
            }
        };

        const customStateManager = new StateManager(initialState);
        const state = customStateManager.getState();

        expect(state.variables.score).toBe(100);
        expect(state.variables.name).toBe('Player');
        expect(state.visitedScenes).toBeInstanceOf(Set);
    });

    test('should update state', () => {
        stateManager.updateState(state => {
            state.variables.testVar = 'test';
            state.visitedScenes.add('scene1');
        });

        const state = stateManager.getState();

        expect(state.variables.testVar).toBe('test');
        expect(state.visitedScenes.has('scene1')).toBe(true);
    });

    test('should set state', () => {
        const newState: GameState = {
            visitedScenes: new Set(['scene1', 'scene2']),
            variables: {
                health: 100,
                inventory: ['sword', 'shield']
            }
        };

        stateManager.setState(newState);
        const state = stateManager.getState();

        expect(state).toBe(newState);
        expect(state.visitedScenes.has('scene1')).toBe(true);
        expect(state.visitedScenes.has('scene2')).toBe(true);
        expect(state.variables.health).toBe(100);
        expect(state.variables.inventory).toEqual(['sword', 'shield']);
    });

    test('should serialize and deserialize state', () => {
        stateManager.updateState(state => {
            state.variables.testVar = 'test';
            state.visitedScenes.add('scene1');
            state.visitedScenes.add('scene2');
        });

        const serialized = stateManager.serialize();

        // Vytvoření nové instance a deserializace
        const newStateManager = new StateManager();
        newStateManager.deserialize(serialized);

        const newState = newStateManager.getState();

        expect(newState.variables.testVar).toBe('test');
        expect(newState.visitedScenes.has('scene1')).toBe(true);
        expect(newState.visitedScenes.has('scene2')).toBe(true);
    });

    test('should handle empty sets when serializing', () => {
        const serialized = stateManager.serialize();
        const parsed = JSON.parse(serialized);

        expect(parsed.visitedScenes).toEqual([]);
    });

    test('should handle custom properties', () => {
        stateManager.updateState(state => {
            (state as any).customProp = {
                nested: {
                    value: 42
                }
            };
        });

        const serialized = stateManager.serialize();
        const newStateManager = new StateManager();
        newStateManager.deserialize(serialized);

        expect((newStateManager.getState() as any).customProp.nested.value).toBe(42);
    });

    test('should set state directly', () => {
        const newState = {
            visitedScenes: new Set(['sceneA', 'sceneB']),
            variables: {
                score: 100,
                health: 50
            }
        };

        stateManager.setState(newState);

        const retrievedState = stateManager.getState();
        expect(retrievedState).toBe(newState); // Test přímé reference (ne jen hodnot)
        expect(retrievedState.variables.score).toBe(100);
        expect(retrievedState.variables.health).toBe(50);
        expect(retrievedState.visitedScenes.has('sceneA')).toBe(true);
        expect(retrievedState.visitedScenes.has('sceneB')).toBe(true);
    });

    // Přidej následující test do test/core/StateManager.test.ts

    test('should set state directly', () => {
        const initialState = stateManager.getState();
        expect(initialState.variables).toEqual({});

        // Vytvořit nový stav, který chceme nastavit
        const newState: GameState = {
            visitedScenes: new Set(['scene1', 'scene2']),
            variables: {
                score: 100,
                name: 'Player'
            }
        };

        // Zavolat testovanou metodu
        stateManager.setState(newState);

        // Zkontrolovat, že stav byl skutečně nastaven
        const resultState = stateManager.getState();

        // Očekáváme, že reference je stejná - stejný objekt
        expect(resultState).toBe(newState);

        // Pro jistotu zkontrolujeme i hodnoty
        expect(resultState.variables.score).toBe(100);
        expect(resultState.variables.name).toBe('Player');
        expect(resultState.visitedScenes.has('scene1')).toBe(true);
        expect(resultState.visitedScenes.has('scene2')).toBe(true);
    });
});