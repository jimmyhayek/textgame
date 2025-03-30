import { ref, computed } from 'vue';
import { GameEngine, Scene, Choice, GameState, Effect } from '@textgame/core';

interface UseGameEngineOptions {
    scenes: Scene[];
    initialState?: Partial<GameState>;
}

export function useGameEngine(options: UseGameEngineOptions) {
    const { scenes, initialState = {} } = options;

    // Create game instance
    const gameEngine = new GameEngine({
        scenes,
        initialState
    });

    // Reactive state
    const currentScene = ref<Scene | null>(null);
    const gameState = ref<GameState>(gameEngine.getState());
    const availableChoices = ref<Choice[]>([]);

    // Initialize listeners
    gameEngine.on('sceneChanged', (scene) => {
        currentScene.value = scene;
        availableChoices.value = gameEngine.getAvailableChoices();
    });

    gameEngine.on('stateChanged', (state) => {
        gameState.value = state;
        availableChoices.value = gameEngine.getAvailableChoices();
    });

    // Expose the game instance to the window for e2e testing
    if (typeof window !== 'undefined') {
        (window as any).gameInstance = gameEngine;
    }

    // Process content that may be a function
    const processedContent = computed(() => {
        if (!currentScene.value) return '';

        const content = currentScene.value.content;
        if (typeof content === 'function') {
            return content(gameState.value);
        }
        return content;
    });

    // Start the game
    const start = (sceneId: string) => {
        gameEngine.start(sceneId);
    };

    // Handle choice selection
    const selectChoice = (choiceId: string) => {
        gameEngine.selectChoice(choiceId);
    };

    // Apply a custom effect
    const applyEffect = (effect: Effect) => {
        gameEngine.getEffectManager().applyEffect(effect, gameState.value);
        gameEngine.emit('stateChanged', gameState.value);
    };

    // Register a custom effect processor
    const registerEffectProcessor = (
        effectType: string,
        processor: (effect: Effect, state: GameState) => void
    ) => {
        gameEngine.registerEffectProcessor(effectType, processor);
    };

    return {
        gameEngine,
        currentScene,
        gameState,
        availableChoices,
        processedContent,
        start,
        selectChoice,
        applyEffect,
        registerEffectProcessor
    };
}