// test/core/GameEngine.test.ts
import { GameEngine } from '../../../src/core/GameEngine';
import { Scene, Choice, Plugin, GameState } from '../../../src/types';

describe('GameEngine', () => {
    let engine: GameEngine;

    beforeEach(() => {
        jest.clearAllMocks();
        engine = new GameEngine();
    });

    test('should initialize with default options', () => {
        expect(engine).toBeDefined();
        expect(engine.isGameRunning()).toBe(false);
    });

    test('should start game with initial scene', async () => {
        const initialSceneId = 'startScene';

        // Příprava testovací scény
        const testScene: Scene = {
            id: initialSceneId,
            title: 'Test Scene',
            content: 'Test content',
            choices: []
        };

        // Registrace scény do content loaderu
        engine.getContentLoader().registerScenes({
            [initialSceneId]: testScene
        });

        // Mockování emit metody na eventEmitteru
        const emitSpy = jest.spyOn(engine.getEventEmitter(), 'emit');

        // Spuštění hry
        await engine.start(initialSceneId);

        // Ověření, že se hra spustila správně
        expect(engine.isGameRunning()).toBe(true);
        expect(emitSpy).toHaveBeenCalledWith('gameStarted', { sceneId: initialSceneId });
        expect(emitSpy).toHaveBeenCalledWith('sceneChanged', expect.anything());
    });

    test('should select choice and transition to next scene', async () => {
        // Příprava testovacích scén
        const currentSceneId = 'currentScene';
        const nextSceneId = 'nextScene';

        const testScenes = {
            [currentSceneId]: {
                id: currentSceneId,
                title: 'Current Scene',
                content: 'Test content',
                choices: [
                    {
                        id: 'choice1',
                        text: 'Test Choice',
                        nextScene: nextSceneId
                    }
                ]
            },
            [nextSceneId]: {
                id: nextSceneId,
                title: 'Next Scene',
                content: 'Next content',
                choices: []
            }
        };

        // Registrace scén
        engine.getContentLoader().registerScenes(testScenes);

        // Mockování emit metody
        const emitSpy = jest.spyOn(engine.getEventEmitter(), 'emit');

        // Spuštění hry a výběr volby
        await engine.start(currentSceneId);
        await engine.selectChoice('choice1');

        // Ověření, že přechod proběhl správně
        expect(engine.getCurrentScene()?.id).toBe(nextSceneId);
        expect(emitSpy).toHaveBeenCalledWith('choiceSelected', expect.anything());
        expect(emitSpy).toHaveBeenCalledWith('sceneChanged', expect.anything());
    });

    test('should handle choice with effects', async () => {
        // Příprava testovací scény s efekty
        const sceneWithEffects = {
            id: 'effectScene',
            title: 'Effect Scene',
            content: 'Test effects',
            choices: [
                {
                    id: 'effectChoice',
                    text: 'Choice with Effects',
                    nextScene: 'effectScene', // Přechod na stejnou scénu pro jednoduchost
                    effects: [
                        { type: 'SET_VARIABLE', variable: 'testVar', value: 'testValue' }
                    ]
                }
            ]
        };

        // Registrace scény
        engine.getContentLoader().registerScenes({
            'effectScene': sceneWithEffects
        });

        // Spuštění hry a výběr volby s efektem
        await engine.start('effectScene');
        await engine.selectChoice('effectChoice');

        // Ověření, že efekt byl aplikován
        const state = engine.getState();
        expect(state.variables.testVar).toBe('testValue');
    });

    test('should register and retrieve plugin', () => {
        const testPlugin: Plugin = {
            name: 'testPlugin',
            initialize: jest.fn()
        };

        // Registrace pluginu
        engine.registerPlugin(testPlugin);

        // Získání pluginu
        const retrievedPlugin = engine.getPlugin<Plugin>('testPlugin');

        // Ověření
        expect(retrievedPlugin).toBe(testPlugin);
        expect(testPlugin.initialize).toHaveBeenCalledWith(engine);
    });

    test('should unregister plugin with destroy method', () => {
        const mockDestroy = jest.fn();
        const testPlugin: Plugin = {
            name: 'destroyPlugin',
            initialize: jest.fn(),
            destroy: mockDestroy
        };

        // Registrace a poté odregistrace pluginu
        engine.registerPlugin(testPlugin);
        engine.unregisterPlugin('destroyPlugin');

        // Ověření, že destroy metoda byla zavolána
        expect(mockDestroy).toHaveBeenCalled();
        expect(engine.getPlugin('destroyPlugin')).toBeUndefined();
    });

    test('should register and use custom effect processor', async () => {
        // Vytvoření vlastního effect processoru
        const customProcessor = jest.fn((effect, state) => {
            state.variables.processed = true;
        });

        // Registrace processoru
        engine.registerEffectProcessor('CUSTOM_EFFECT', customProcessor);

        // Příprava scény s vlastním efektem
        const sceneWithCustomEffect = {
            id: 'customEffectScene',
            title: 'Custom Effect Scene',
            content: 'Test custom effects',
            choices: [
                {
                    id: 'customChoice',
                    text: 'Custom Effect Choice',
                    nextScene: 'customEffectScene',
                    effects: [
                        { type: 'CUSTOM_EFFECT', someParam: 'value' }
                    ]
                }
            ]
        };

        // Registrace scény
        engine.getContentLoader().registerScenes({
            'customEffectScene': sceneWithCustomEffect
        });

        // Spuštění hry a výběr volby
        await engine.start('customEffectScene');
        await engine.selectChoice('customChoice');

        // Ověření, že custom processor byl zavolán a efekt aplikován
        expect(customProcessor).toHaveBeenCalled();
        expect(engine.getState().variables.processed).toBe(true);
    });

    // test/core/GameEngine.test.ts - opravené verze testů

    test('should handle failed choice selection when choice condition not met', async () => {
        // Připravit scénu s podmíněnou volbou
        const testScene = {
            id: 'conditionScene',
            title: 'Condition Scene',
            content: 'Test Conditions',
            choices: [
                {
                    id: 'conditionalChoice',
                    text: 'Conditional',
                    nextScene: 'next',
                    condition: (state: GameState) => state.variables.flag === true
                }
            ]
        };

        engine.getContentLoader().registerScenes({
            'conditionScene': testScene
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        await engine.start('conditionScene');
        // Nezměníme stav, takže podmínka nebude splněna
        await engine.selectChoice('conditionalChoice');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('should handle functional nextScene definition', async () => {
        // Scéna s funkcí pro výběr následující scény
        const scenes = {
            'dynamicScene': {
                id: 'dynamicScene',
                title: 'Dynamic Routing',
                content: 'Test dynamic routing',
                choices: [
                    {
                        id: 'dynamicChoice',
                        text: 'Dynamic route',
                        // Funkce, která vrací ID další scény na základě stavu
                        nextScene: (state: GameState) => state.variables.route || 'fallbackScene'
                    }
                ]
            },
            'targetScene': {
                id: 'targetScene',
                title: 'Target Scene',
                content: 'Reached target',
                choices: []
            },
            'fallbackScene': {
                id: 'fallbackScene',
                title: 'Fallback Scene',
                content: 'Reached fallback',
                choices: []
            }
        };

        engine.getContentLoader().registerScenes(scenes);

        // Test s nastavenou proměnnou route
        await engine.start('dynamicScene');
        engine.getStateManager().updateState(state => {
            state.variables.route = 'targetScene';
        });

        await engine.selectChoice('dynamicChoice');
        expect(engine.getCurrentScene()?.id).toBe('targetScene');

        // Test s nenastavenou proměnnou (měl by použít fallback)
        await engine.start('dynamicScene');
        engine.getStateManager().updateState(state => {
            delete state.variables.route;
        });

        await engine.selectChoice('dynamicChoice');
        expect(engine.getCurrentScene()?.id).toBe('fallbackScene');
    });

    // test/core/GameEngine.test.ts - doplněk k existujícím testům

    test('should handle errors in start method', async () => {
        // Mock sceneManager.transitionToScene aby vrátil false (simuluje chybu)
        const mockTransitionToScene = jest.fn().mockResolvedValue(false);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Vytvoření instance s mockovaným sceneManagerem
        engine = new GameEngine();
        const sceneManager = engine.getSceneManager();

        // Nahrazení transitionToScene metodou, která vrací false
        sceneManager.transitionToScene = mockTransitionToScene;

        // Volání start, což by mělo aktivovat else větev
        await engine.start('nonExistentScene');

        // Kontrola, že chybová hláška byla vyvolána
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to start game at scene'));
        expect(engine.isGameRunning()).toBe(false);

        // Cleanup
        consoleSpy.mockRestore();
    });

    test('should unregister event listener using off method', () => {
        const engine = new GameEngine();
        const mockListener = jest.fn();
        const eventEmitterSpy = jest.spyOn(engine.getEventEmitter(), 'off');

        // Nejprve registrujeme, pak odregistrujeme
        engine.on('testEvent', mockListener);
        engine.off('testEvent', mockListener);

        // Kontrola, že off metoda byla volána
        expect(eventEmitterSpy).toHaveBeenCalledWith('testEvent', mockListener);

        // Cleanup
        eventEmitterSpy.mockRestore();
    });

    test('should emit events using emit method', () => {
        const engine = new GameEngine();
        const eventEmitterSpy = jest.spyOn(engine.getEventEmitter(), 'emit');
        const testData = { test: 'data' };

        // Volání emit metody
        engine.emit('testEvent', testData);

        // Kontrola, že emit metoda byla volána
        expect(eventEmitterSpy).toHaveBeenCalledWith('testEvent', testData);

        // Cleanup
        eventEmitterSpy.mockRestore();
    });

    test('should return managers through getter methods', () => {
        const engine = new GameEngine();

        // Test všech getter metod pro managery
        const sceneManager = engine.getSceneManager();
        const effectManager = engine.getEffectManager();
        const pluginManager = engine.getPluginManager();

        // Kontrola, že gettery fungují
        expect(sceneManager).toBeDefined();
        expect(effectManager).toBeDefined();
        expect(pluginManager).toBeDefined();
    });

    test('should handle missing choice in selectChoice method', async () => {
        // Příprava enginu s platnou scénou, ale bez volby
        const engine = new GameEngine();
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Registrace testovací scény
        engine.getContentLoader().registerScenes({
            'testScene': {
                id: 'testScene',
                title: 'Test Scene',
                content: 'Content',
                choices: [] // Žádné volby
            }
        });

        // Spuštění hry
        await engine.start('testScene');

        // Volání selectChoice s neexistující volbou
        await engine.selectChoice('nonExistentChoice');

        // Kontrola, že chybová hláška byla vyvolána
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Choice with ID \'nonExistentChoice\' not found')
        );

        // Cleanup
        consoleSpy.mockRestore();
    });

    test('should handle selectChoice when no scene is active', async () => {
        const engine = new GameEngine();
        // Nezavoláme start(), takže není aktivní scéna

        // Kontrola, že selectChoice nefailne
        await engine.selectChoice('anyChoice');

        // Není potřeba kontrolovat výsledek, jen že metoda nezhavaruje
    });

    test('should handle choice with condition that evaluates to false', async () => {
        const engine = new GameEngine();
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Scéna s podmíněnou volbou, která nikdy není platná
        engine.getContentLoader().registerScenes({
            'conditionScene': {
                id: 'conditionScene',
                title: 'Condition Scene',
                content: 'Test',
                choices: [{
                    id: 'conditionalChoice',
                    text: 'Conditional',
                    nextScene: 'nowhere',
                    condition: () => false
                }]
            }
        });

        await engine.start('conditionScene');
        await engine.selectChoice('conditionalChoice');

        // Kontrola, že byla zobrazena warning hláška
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Choice with ID \'conditionalChoice\' is not available')
        );

        // Cleanup
        consoleSpy.mockRestore();
    });
});