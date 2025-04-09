import { GameEngine } from '../../src/core/GameEngine';
import { Scene, Choice, GameState } from '../../src/types';

// Skutečná instance, ne mock
describe('GameEngine Integration', () => {
    let engine: GameEngine;

    // Definujeme testovací scény
    const scenes = {
        'start': {
            id: 'start',
            title: 'Start Scene',
            content: 'You are at the beginning of your journey.',
            choices: [
                {
                    id: 'goToForest',
                    text: 'Go to the forest',
                    nextScene: 'forest'
                },
                {
                    id: 'goToVillage',
                    text: 'Go to the village',
                    nextScene: 'village',
                    // Zde přidáváme typovou anotaci pro parametr state
                    condition: (state: GameState) => state.variables.hasMap === true
                }
            ]
        },
        'forest': {
            id: 'forest',
            title: 'Forest',
            content: 'You are in a dense forest.',
            choices: [
                {
                    id: 'findMap',
                    text: 'Search for a map',
                    nextScene: 'forest',
                    effects: [
                        { type: 'SET_VARIABLE', variable: 'hasMap', value: true }
                    ]
                },
                {
                    id: 'goBackStart',
                    text: 'Go back to start',
                    nextScene: 'start'
                }
            ],
            onEnter: jest.fn()
        },
        'village': {
            id: 'village',
            title: 'Village',
            content: 'You reached a small village.',
            choices: [
                {
                    id: 'goBackStart',
                    text: 'Go back to start',
                    nextScene: 'start'
                }
            ],
            onEnter: jest.fn()
        }
    };

    beforeEach(() => {
        // Resetujeme všechny mock funkce
        jest.clearAllMocks();

        // Vytvoříme novou instanci enginu pro každý test
        engine = new GameEngine();
        engine.getContentLoader().registerScenes(scenes);
    });

    test('should handle game flow correctly', async () => {
        // Sledování událostí
        const eventSpy = jest.fn();
        engine.on('sceneChanged', eventSpy);

        // Start hry
        await engine.start('start');
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'start' }));

        // Zkontrolujeme dostupné volby - měla by být jen jedna
        let choices = engine.getAvailableChoices();
        expect(choices.length).toBe(1);
        expect(choices[0].id).toBe('goToForest');

        // Jdeme do lesa
        await engine.selectChoice('goToForest');
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'forest' }));
        expect(scenes.forest.onEnter).toHaveBeenCalled();

        // Najdeme mapu
        await engine.selectChoice('findMap');
        expect(engine.getState().variables.hasMap).toBe(true);

        // Vrátíme se zpět na start
        await engine.selectChoice('goBackStart');
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'start' }));

        // Teď by měly být dostupné obě volby
        choices = engine.getAvailableChoices();
        expect(choices.length).toBe(2);

        // Jdeme do vesnice, která byla dříve nedostupná
        await engine.selectChoice('goToVillage');
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'village' }));
        expect(scenes.village.onEnter).toHaveBeenCalled();

        // Kontrola stavu
        const state = engine.getState();
        expect(state.visitedScenes.size).toBe(3); // start, forest, village
        expect(state.visitedScenes.has('forest')).toBe(true);
        expect(state.visitedScenes.has('village')).toBe(true);
    });

    test('should handle serialization and deserialization', async () => {
        await engine.start('start');
        await engine.selectChoice('goToForest');
        await engine.selectChoice('findMap');

        // Serializujeme stav
        const serializedState = engine.getStateManager().serialize();

        // Vytvoříme novou instanci enginu
        const newEngine = new GameEngine();
        newEngine.getContentLoader().registerScenes(scenes);

        // Nastavíme deserializovaný stav
        newEngine.getStateManager().deserialize(serializedState);

        // Zkontrolujeme, že stav byl správně obnoven
        const state = newEngine.getState();
        expect(state.variables.hasMap).toBe(true);
        expect(state.visitedScenes.has('forest')).toBe(true);

        // Měli bychom být schopni pokračovat ve hře
        await newEngine.start('start'); // Přejde do poslední známé scény

        // Nyní by měla být dostupná volba jít do vesnice
        const choices = newEngine.getAvailableChoices();
        expect(choices.length).toBe(2);
        expect(choices.some(c => c.id === 'goToVillage')).toBe(true);
    });
});