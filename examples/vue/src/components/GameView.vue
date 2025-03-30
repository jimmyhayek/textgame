<template>
  <div class="game-view">
    <h1>{{ currentScene?.title }}</h1>
    <div class="scene-content" v-html="processedContent"></div>

    <div class="choices-container">
      <button
        v-for="choice in availableChoices"
        :key="choice.id"
        @click="selectChoice(choice.id)"
        class="choice-button"
      >
        {{ typeof choice.text === 'function' ? choice.text(gameState) : choice.text }}
      </button>
    </div>

    <div class="game-status" data-testid="status">
      Visited scenes: {{ gameState.visitedScenes.size }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { GameEngine, Scene, Choice, GameState } from '@textgame/core';
import { gameScenes } from '../game/scenes';

// Create game instance
const gameEngine = new GameEngine({
  scenes: gameScenes,
  initialState: {
    variables: {
      playerName: 'Adventurer',
      hasMap: false
    }
  }
});

// Reactive state
const currentScene = ref<Scene | null>(null);
const gameState = ref<GameState>(gameEngine.getState());
const availableChoices = ref<Choice[]>([]);

// Expose the game instance to the window for e2e testing
if (typeof window !== 'undefined') {
  (window as any).gameInstance = gameEngine;
}

// Initialize game
onMounted(() => {
  // Listen for scene changes
  gameEngine.on('sceneChanged', (scene) => {
    currentScene.value = scene;
    availableChoices.value = gameEngine.getAvailableChoices();
  });

  // Listen for state changes
  gameEngine.on('stateChanged', (state) => {
    gameState.value = state;
    availableChoices.value = gameEngine.getAvailableChoices();
  });

  // Start the game
  gameEngine.start('start');
});

// Process content that may be a function
const processedContent = computed(() => {
  if (!currentScene.value) return '';

  const content = currentScene.value.content;
  if (typeof content === 'function') {
    return content(gameState.value);
  }
  return content;
});

// Handle choice selection
const selectChoice = (choiceId: string) => {
  gameEngine.selectChoice(choiceId);
};
</script>

<style scoped>
.game-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.scene-content {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.choice-button {
  padding: 0.8rem 1.2rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.choice-button:hover {
  background-color: #2980b9;
}

.game-status {
  margin-top: 2rem;
  font-size: 0.9rem;
  color: #7f8c8d;
  border-top: 1px solid #ecf0f1;
  padding-top: 1rem;
}
</style>