import { GameEngine } from '../../src/core/GameEngine';
import { Scene, Choice, GameState } from '../../src/types';
import { defineScene, defineScenes, createSceneLoader } from '../../src/utils/defineContent';

describe('GameEngine Integration', () => {
    let engine: GameEngine;

    // Definujeme testovací scény pomocí nového API
    const forestIntroScene = defineScene({
        title: 'Vstup do lesa',
        content: 'Stojíš na okraji hlubokého lesa.',
        choices: [
            {
                content: 'Prozkoumat les',
                scene: 'forest/clearing'
            },
            {
                content: 'Jít do vesnice',
                scene: 'village/square',
                // Podmínka pro dostupnost volby
                condition: (state: GameState) => state.variables.hasMap === true
            }
        ]
    });

    const forestClearingScene = defineScene({
        title: 'Lesní mýtina',
        content: 'Nacházíš se na malé mýtině uprostřed lesa.',
        choices: [
            {
                content: 'Prohledat mýtinu',
                // Bez scene property - pouze efekt
                effects: [
                    { type: 'SET_VARIABLE', variable: 'hasMap', value: true }
                ]
            },
            {
                content: 'Vrátit se na okraj lesa',
                scene: 'forest/intro'
            }
        ],
        onEnter: jest.fn()
    });

    const villageSquareScene = defineScene({
        title: 'Vesnické náměstí',
        content: 'Stojíš na malém náměstí obklopeném dřevěnými domy.',
        choices: [
            {
                content: 'Vrátit se do lesa',
                scene: 'forest/intro'
            }
        ],
        onEnter: jest.fn()
    });

    beforeEach(() => {
        // Resetujeme všechny mock funkce
        jest.clearAllMocks();

        // Definice scén pomocí nových helper funkcí
        const scenes = defineScenes({
            'forest/intro': forestIntroScene,
            'forest/clearing': forestClearingScene,
            'village/square': villageSquareScene
        });

        // Vytvoření loaderu pomocí nového helper
        const sceneLoader = createSceneLoader(scenes);

        // Vytvoření nové instance enginu s loaderem
        engine = new GameEngine({
            sceneLoader,
            initialState: {
                visitedScenes: new Set<string>(),
                variables: {
                    hasMap: false
                }
            }
        });
    });

    test('should handle game flow with new API', async () => {
        // Sledování událostí
        const eventSpy = jest.fn();
        engine.on('sceneChanged', eventSpy);

        // Start hry s klíčem scény místo ID
        await engine.start('forest/intro');
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Vstup do lesa' }));

        // Kontrola aktuální scény
        expect(engine.getCurrentScene()).toBeTruthy();
        expect(engine.getCurrentScene()?.title).toBe('Vstup do lesa');

        // Kontrola klíče scény - nově používáme getCurrentSceneKey
        expect(engine.getCurrentSceneKey()).toBe('forest/intro');

        // Zkontrolujeme dostupné volby - měla by být jen jedna
        let choices = engine.getAvailableChoices();
        expect(choices.length).toBe(1);
        expect(choices[0].content).toBe('Prozkoumat les');

        // Výběr volby pomocí indexu, ne ID
        await engine.selectChoice(0);
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lesní mýtina' }));
        expect(forestClearingScene.onEnter).toHaveBeenCalled();

        // Prohledání mýtiny - volba bez přechodu, pouze s efektem
        await engine.selectChoice(0);
        expect(engine.getState().variables.hasMap).toBe(true);

        // Měli bychom zůstat na stejné scéně
        expect(engine.getCurrentSceneKey()).toBe('forest/clearing');

        // Vrátíme se zpět na okraj lesa
        await engine.selectChoice(1);
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Vstup do lesa' }));

        // Teď by měly být dostupné obě volby
        choices = engine.getAvailableChoices();
        expect(choices.length).toBe(2);

        // Kontrola obsahu voleb
        expect(choices[0].content).toBe('Prozkoumat les');
        expect(choices[1].content).toBe('Jít do vesnice');

        // Jdeme do vesnice, která byla dříve nedostupná
        await engine.selectChoice(1);
        expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Vesnické náměstí' }));
        expect(villageSquareScene.onEnter).toHaveBeenCalled();

        // Kontrola stavu
        const state = engine.getState();
        // Kontrola, že scény jsou sledovány podle klíče, ne ID
        expect(state.visitedScenes.size).toBe(3);
        expect(state.visitedScenes.has('forest/intro')).toBe(true);
        expect(state.visitedScenes.has('forest/clearing')).toBe(true);
        expect(state.visitedScenes.has('village/square')).toBe(true);
    });

    test('should handle choices without scene transition', async () => {
        await engine.start('forest/clearing');

        // Zaznamenáme počet volání sceneChanged
        const sceneChangedSpy = jest.fn();
        engine.on('sceneChanged', sceneChangedSpy);

        // Volíme možnost, která pouze mění stav bez přechodu
        await engine.selectChoice(0);

        // Kontrola, že stav byl změněn
        expect(engine.getState().variables.hasMap).toBe(true);

        // Kontrola, že žádný přechod scény nenastal
        expect(sceneChangedSpy).not.toHaveBeenCalled();
        expect(engine.getCurrentSceneKey()).toBe('forest/clearing');
    });

    test('should handle serialization and deserialization with new keys', async () => {
        await engine.start('forest/intro');
        await engine.selectChoice(0); // Jít do lesa
        await engine.selectChoice(0); // Prohledat mýtinu - nastavujeme hasMap na true

        // Serializujeme stav
        const serializedState = engine.getStateManager().serialize();

        // Vytvoříme novou instanci enginu
        const scenes = defineScenes({
            'forest/intro': forestIntroScene,
            'forest/clearing': forestClearingScene,
            'village/square': villageSquareScene
        });
        const newSceneLoader = createSceneLoader(scenes);
        const newEngine = new GameEngine({
            sceneLoader: newSceneLoader
        });

        // Nastavíme deserializovaný stav
        newEngine.getStateManager().deserialize(serializedState);

        // Zkontrolujeme, že stav byl správně obnoven
        const state = newEngine.getState();
        expect(state.variables.hasMap).toBe(true);
        expect(state.visitedScenes.has('forest/clearing')).toBe(true);

        // Měli bychom být schopni pokračovat ve hře
        await newEngine.start('forest/intro'); // Přejde do poslední známé scény

        // Nyní by měla být dostupná volba jít do vesnice
        const choices = newEngine.getAvailableChoices();
        expect(choices.length).toBe(2);
        expect(choices.some(c => c.content === 'Jít do vesnice')).toBe(true);
    });
});