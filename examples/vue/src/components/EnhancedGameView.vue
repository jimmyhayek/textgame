<template>
  <div class="game-container">
    <div class="game-header">
      <h1>{{ currentScene?.title }}</h1>
    </div>

    <div class="game-content">
      <div class="main-content">
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

        <!-- Auto-save indicator that shows briefly when auto-save happens -->
        <div
          v-if="showAutoSaveIndicator"
          class="auto-save-indicator"
          data-testid="auto-save-indicator"
        >
          Game auto-saved
        </div>
      </div>

      <div class="side-panel">
        <div class="game-status" data-testid="status">
          Visited Scenes: {{ gameState.visitedScenes.size }}
        </div>

        <div class="playtime">
          Playtime: {{ formattedPlaytime }}
        </div>

        <InventoryView
          v-if="inventoryPlugin"
          :gameState="gameState"
          :onUseItem="handleUseItem"
          :onCombineItems="handleCombineItems"
        />

        <SaveGameView
          v-if="saveSystemPlugin"
          :saveSystem="saveSystemPlugin"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { GameEngine, Scene, Choice, GameState } from '@textgame/core';
import { useGameEngine } from '../composables/useGameEngine';
import { gameScenes } from '../game/scenes';
import { InventoryPlugin, InventoryItem, INVENTORY_EFFECTS } from '../plugins/InventoryPlugin';
import { SaveSystemPlugin } from '../plugins/SaveSystemPlugin';
import InventoryView from './InventoryView.vue';
import SaveGameView from './SaveGameView.vue';

// Initialize plugins
const inventoryPlugin = new InventoryPlugin();
const saveSystemPlugin = new SaveSystemPlugin();

// Create game instance with the useGameEngine composable
const {
  gameEngine,
  currentScene,
  gameState,
  availableChoices,
  processedContent,
  selectChoice
} = useGameEngine({
  scenes: gameScenes,
  initialState: {
    variables: {
      playerName: 'Adventurer',
      hasMap: false
    }
  }
});

// Register plugins
gameEngine.registerPlugin(inventoryPlugin);
gameEngine.registerPlugin(saveSystemPlugin);

// Auto-save indicator state
const showAutoSaveIndicator = ref(false);

// Start the game
onMounted(() => {
  // Listen for auto-save events
  gameEngine.on('gameSaved', (data) => {
    if (data.slot === 'auto') {
      showAutoSaveIndicator.value = true;
      setTimeout(() => {
        showAutoSaveIndicator.value = false;
      }, 3000);
    }
  });

  // Start the game
  gameEngine.start('start');
});

// Computed property for formatted playtime
const formattedPlaytime = computed(() => {
  const playtime = gameState.value.saveSystem?.currentPlaytime || 0;
  return saveSystemPlugin.formatPlaytime(playtime);
});

// Handle inventory item use
const handleUseItem = (itemId: string) => {
  const item = inventoryPlugin.getItem(gameState.value, itemId);
  if (!item) return;

  // Apply an effect to use the item
  // This is a simple implementation - in a real game, you'd have more logic
  gameEngine.getStateManager().updateState(state => {
    const effect = {
      type: INVENTORY_EFFECTS.USE_ITEM,
      itemId,
      target: currentScene.value?.id,
      consume: false
    };
    inventoryPlugin.useItemEffect(effect, state);
  });

  // Update game state
  gameEngine.emit('stateChanged', gameEngine.getState());

  // Provide feedback to the player
  // This would typically be handled through proper game mechanics
  // For example, updating the scene content or unlocking new choices
  console.log(`Used item: ${item.name}`);
};

// Handle combining items
const handleCombineItems = (itemId1: string, itemId2: string) => {
  const item1 = inventoryPlugin.getItem(gameState.value, itemId1);
  const item2 = inventoryPlugin.getItem(gameState.value, itemId2);

  if (!item1 || !item2) return;

  // In a real game, you'd have logic to determine valid combinations
  // This is a simple example where we create a combined item
  const resultItem: InventoryItem = {
    id: `combined_${itemId1}_${itemId2}`,
    name: `Combined Item`,
    description: `A combination of ${item1.name} and ${item2.name}`,
    usable: true
  };

  // Apply combine effect
  gameEngine.getStateManager().updateState(state => {
    const effect = {
      type: INVENTORY_EFFECTS.COMBINE_ITEMS,
      itemId1,
      itemId2,
      resultItem
    };
    inventoryPlugin.combineItemsEffect(effect, state);
  });

  // Update game state
  gameEngine.emit('stateChanged', gameEngine.getState());
};
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.game-header {
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.game-content {
  display: flex;
  gap: 2rem;
}

.main-content {
  flex: 2;
  position: relative;
}

.side-panel {
  flex: 1;
}

.scene-content {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1.5rem;
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

.game-status, .playtime {
  margin-bottom: 1rem;
  padding: 0.8rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #6c757d;
  border-left: 3px solid #3498db;
}

.auto-save-indicator {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background-color: rgba(52, 152, 219, 0.8);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  animation: fadeOut 2s forwards;
  animation-delay: 2s;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; visibility: hidden; }
}

/* Responsive design for mobile */
@media (max-width: 768px) {
  .game-content {
    flex-direction: column;
  }

  .side-panel {
    margin-top: 2rem;
  }
}
</style>