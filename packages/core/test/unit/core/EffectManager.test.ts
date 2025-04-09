// test/core/EffectManager.test.ts
import { EffectManager } from '../../../src/core/EffectManager';
import { Effect, GameState } from '../../../src/types';

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

        const newState = effectManager.applyEffect(effect, gameState);

        // Ověření imutability - původní stav by neměl být modifikován
        expect(gameState.variables.testVar).toBeUndefined();

        // Nový stav by měl obsahovat změnu
        expect(newState.variables.testVar).toBe('testValue');

        // Mělo by to být jiný objekt
        expect(newState).not.toBe(gameState);
    });

    test('should increment variable with INCREMENT_VARIABLE effect', () => {
        gameState.variables.counter = 5;

        const effect: Effect = {
            type: 'INCREMENT_VARIABLE',
            variable: 'counter',
            value: 3
        };

        const newState = effectManager.applyEffect(effect, gameState);

        // Původní stav by neměl být modifikován
        expect(gameState.variables.counter).toBe(5);

        // Nový stav by měl obsahovat změnu
        expect(newState.variables.counter).toBe(8);
    });

    test('should initialize variable to 0 when incrementing undefined variable', () => {
        const effect: Effect = {
            type: 'INCREMENT_VARIABLE',
            variable: 'newCounter',
            value: 5
        };

        const newState = effectManager.applyEffect(effect, gameState);

        // Nový stav by měl obsahovat inicializovanou proměnnou
        expect(newState.variables.newCounter).toBe(5);
    });

    test('should decrement variable with DECREMENT_VARIABLE effect', () => {
        gameState.variables.counter = 10;

        const effect: Effect = {
            type: 'DECREMENT_VARIABLE',
            variable: 'counter',
            value: 3
        };

        const newState = effectManager.applyEffect(effect, gameState);

        // Původní stav by neměl být modifikován
        expect(gameState.variables.counter).toBe(10);

        // Nový stav by měl obsahovat změnu
        expect(newState.variables.counter).toBe(7);
    });

    test('should initialize variable to 0 when decrementing undefined variable', () => {
        const effect: Effect = {
            type: 'DECREMENT_VARIABLE',
            variable: 'newCounter',
            value: 5
        };

        const newState = effectManager.applyEffect(effect, gameState);

        expect(newState.variables.newCounter).toBe(-5);
    });

    test('should register and apply custom effect processor', () => {
        effectManager.registerEffectProcessor('CUSTOM_EFFECT', (effect, draftState) => {
            draftState.variables.customProcessed = true;
            draftState.variables.customValue = effect.customParam;
        });

        const customEffect: Effect = {
            type: 'CUSTOM_EFFECT',
            customParam: 'customValue'
        };

        const newState = effectManager.applyEffect(customEffect, gameState);

        expect(newState.variables.customProcessed).toBe(true);
        expect(newState.variables.customValue).toBe('customValue');

        // Původní stav by neměl být modifikován
        expect(gameState.variables.customProcessed).toBeUndefined();
    });

    test('should warn when applying effect with unknown type', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const unknownEffect: Effect = {
            type: 'UNKNOWN_EFFECT',
            someParam: 'value'
        };

        const newState = effectManager.applyEffect(unknownEffect, gameState);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('UNKNOWN_EFFECT'));
        expect(newState).toBe(gameState); // Žádná změna by neměla nastat

        consoleSpy.mockRestore();
    });

    test('should apply multiple effects in sequence', () => {
        const effects: Effect[] = [
            { type: 'SET_VARIABLE', variable: 'var1', value: 10 },
            { type: 'SET_VARIABLE', variable: 'var2', value: 'test' },
            { type: 'INCREMENT_VARIABLE', variable: 'var1', value: 5 }
        ];

        const newState = effectManager.applyEffects(effects, gameState);

        expect(newState.variables.var1).toBe(15);
        expect(newState.variables.var2).toBe('test');

        // Původní stav by neměl být modifikován
        expect(gameState.variables.var1).toBeUndefined();
        expect(gameState.variables.var2).toBeUndefined();
    });

    test('should use default value 1 for INCREMENT_VARIABLE when value not provided', () => {
        gameState.variables.counter = 5;

        const effect: Effect = {
            type: 'INCREMENT_VARIABLE',
            variable: 'counter'
            // Záměrně vynecháme 'value'
        };

        const newState = effectManager.applyEffect(effect, gameState);

        expect(newState.variables.counter).toBe(6); // 5 + 1 (defaultní hodnota)
        expect(gameState.variables.counter).toBe(5); // Původní stav nezměněn
    });

    test('should use default value 1 for DECREMENT_VARIABLE when value not provided', () => {
        gameState.variables.counter = 5;

        const effect: Effect = {
            type: 'DECREMENT_VARIABLE',
            variable: 'counter'
            // Záměrně vynecháme 'value'
        };

        const newState = effectManager.applyEffect(effect, gameState);

        expect(newState.variables.counter).toBe(4); // 5 - 1 (defaultní hodnota)
        expect(gameState.variables.counter).toBe(5); // Původní stav nezměněn
    });

    test('should handle complex nested state changes', () => {
        // Nastavíme výchozí komplexní stav
        gameState.variables = {
            player: {
                stats: {
                    hp: 100,
                    mp: 50,
                    strength: 10
                },
                inventory: ['potion', 'map']
            },
            world: {
                time: 'day',
                weather: 'sunny'
            }
        };

        // Vytvoříme vlastní efekt pro komplexní změny
        effectManager.registerEffectProcessor('COMPLEX_UPDATE', (effect, draftState) => {
            // Zvýšit HP hráče
            draftState.variables.player.stats.hp += effect.hpBonus;

            // Přidat novou položku do inventáře
            draftState.variables.player.inventory.push(effect.newItem);

            // Změnit počasí
            draftState.variables.world.weather = effect.weather;
        });

        const complexEffect: Effect = {
            type: 'COMPLEX_UPDATE',
            hpBonus: 20,
            newItem: 'sword',
            weather: 'rainy'
        };

        const newState = effectManager.applyEffect(complexEffect, gameState);

        // Ověření, že komplexní vnořený stav byl správně aktualizován
        expect(newState.variables.player.stats.hp).toBe(120);
        expect(newState.variables.player.inventory).toContain('sword');
        expect(newState.variables.player.inventory.length).toBe(3);
        expect(newState.variables.world.weather).toBe('rainy');

        // Ověření, že nezměněná data zůstala stejná
        expect(newState.variables.player.stats.mp).toBe(50);
        expect(newState.variables.player.stats.strength).toBe(10);
        expect(newState.variables.world.time).toBe('day');

        // Ověření, že původní stav nebyl změněn
        expect(gameState.variables.player.stats.hp).toBe(100);
        expect(gameState.variables.player.inventory).not.toContain('sword');
        expect(gameState.variables.world.weather).toBe('sunny');
    });
});