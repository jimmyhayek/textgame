// test/core/EffectManager.test.ts
import { EffectManager } from '../../src/core/EffectManager';
import { Effect, GameState } from '../../src/types';

describe('EffectManager', () => {
    let effectManager: EffectManager;
    let gameState: GameState;

    beforeEach(() => {
        effectManager = new EffectManager();
        gameState = {
            visitedScenes: new Set<string>(),
            variables: {}
        };
    });

    test('should set variable with SET_VARIABLE effect', () => {
        const effect: Effect = {
            type: 'SET_VARIABLE',
            variable: 'testVar',
            value: 'testValue'
        };

        effectManager.applyEffect(effect, gameState);
        expect(gameState.variables.testVar).toBe('testValue');
    });

    test('should increment variable with INCREMENT_VARIABLE effect', () => {
        gameState.variables.counter = 5;

        const effect: Effect = {
            type: 'INCREMENT_VARIABLE',
            variable: 'counter',
            value: 3
        };

        effectManager.applyEffect(effect, gameState);
        expect(gameState.variables.counter).toBe(8);
    });

    test('should initialize variable to 0 when incrementing undefined variable', () => {
        const effect: Effect = {
            type: 'INCREMENT_VARIABLE',
            variable: 'newCounter',
            value: 5
        };

        effectManager.applyEffect(effect, gameState);
        expect(gameState.variables.newCounter).toBe(5);
    });

    test('should decrement variable with DECREMENT_VARIABLE effect', () => {
        gameState.variables.counter = 10;

        const effect: Effect = {
            type: 'DECREMENT_VARIABLE',
            variable: 'counter',
            value: 3
        };

        effectManager.applyEffect(effect, gameState);
        expect(gameState.variables.counter).toBe(7);
    });

    test('should initialize variable to 0 when decrementing undefined variable', () => {
        const effect: Effect = {
            type: 'DECREMENT_VARIABLE',
            variable: 'newCounter',
            value: 5
        };

        effectManager.applyEffect(effect, gameState);
        expect(gameState.variables.newCounter).toBe(-5);
    });

    test('should register and apply custom effect processor', () => {
        effectManager.registerEffectProcessor('CUSTOM_EFFECT', (effect, state) => {
            state.variables.customProcessed = true;
            state.variables.customValue = effect.customParam;
        });

        const customEffect: Effect = {
            type: 'CUSTOM_EFFECT',
            customParam: 'customValue'
        };

        effectManager.applyEffect(customEffect, gameState);

        expect(gameState.variables.customProcessed).toBe(true);
        expect(gameState.variables.customValue).toBe('customValue');
    });

    test('should warn when applying effect with unknown type', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const unknownEffect: Effect = {
            type: 'UNKNOWN_EFFECT',
            someParam: 'value'
        };

        effectManager.applyEffect(unknownEffect, gameState);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('UNKNOWN_EFFECT'));
        consoleSpy.mockRestore();
    });

    test('should apply multiple effects in sequence', () => {
        const effects: Effect[] = [
            { type: 'SET_VARIABLE', variable: 'var1', value: 10 },
            { type: 'SET_VARIABLE', variable: 'var2', value: 'test' },
            { type: 'INCREMENT_VARIABLE', variable: 'var1', value: 5 }
        ];

        effectManager.applyEffects(effects, gameState);

        expect(gameState.variables.var1).toBe(15);
        expect(gameState.variables.var2).toBe('test');
    });
});