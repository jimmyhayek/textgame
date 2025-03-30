<template>
  <div class="inventory" data-testid="inventory">
    <h2>Inventory</h2>
    <div v-if="inventoryItems.length === 0" class="empty-inventory">
      Your inventory is empty.
    </div>
    <ul v-else class="inventory-list">
      <li
        v-for="item in inventoryItems"
        :key="item.id"
        :data-testid="`item-${item.id}`"
        class="inventory-item"
        :class="{ selected: selectedItem === item.id }"
        @click="selectItem(item.id)"
      >
        <div class="item-name">{{ item.name }}</div>
        <div class="item-description">{{ item.description }}</div>
      </li>
    </ul>

    <div v-if="showItemActions" class="item-actions">
      <button
        v-if="canUseItem"
        @click="useSelectedItem"
        class="action-button"
      >
        Use Item
      </button>
      <button
        v-if="showCombineOption"
        @click="combineItems"
        class="action-button"
        data-testid="combine-button"
      >
        Combine Items
      </button>
      <button
        @click="clearSelection"
        class="action-button cancel"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { GameState } from '@textgame/core';
import { InventoryItem } from '../plugins/InventoryPlugin';

interface Props {
  gameState: GameState;
  onUseItem?: (itemId: string) => void;
  onCombineItems?: (itemId1: string, itemId2: string) => void;
}

const props = withDefaults(defineProps<Props>(), {
  onUseItem: undefined,
  onCombineItems: undefined
});

// Local state
const selectedItem = ref<string | null>(null);
const secondSelectedItem = ref<string | null>(null);

// Get inventory items from game state
const inventoryItems = computed<InventoryItem[]>(() => {
  return props.gameState.inventory?.items || [];
});

// Item actions visibility
const showItemActions = computed(() => {
  return selectedItem.value !== null;
});

// Check if the selected item can be used
const canUseItem = computed(() => {
  if (!selectedItem.value) return false;

  const item = inventoryItems.value.find(item => item.id === selectedItem.value);
  return item?.usable === true;
});

// Check if we should show combine option
const showCombineOption = computed(() => {
  if (!selectedItem.value) return false;

  const item = inventoryItems.value.find(item => item.id === selectedItem.value);

  // Only show combine if there are at least two combinable items
  if (item?.combinable) {
    const otherCombinableItems = inventoryItems.value.filter(
      i => i.id !== selectedItem.value && i.combinable
    );
    return otherCombinableItems.length > 0;
  }

  return false;
});

// Handle item selection
const selectItem = (itemId: string) => {
  if (selectedItem.value === itemId) {
    // Deselect if clicking the same item
    selectedItem.value = null;
    secondSelectedItem.value = null;
  } else if (selectedItem.value && secondSelectedItem.value === null) {
    // Set as second item if we already have a first selection
    secondSelectedItem.value = itemId;
    // If combine callback exists, trigger it immediately
    if (props.onCombineItems && selectedItem.value) {
      props.onCombineItems(selectedItem.value, itemId);
      clearSelection();
    }
  } else {
    // Set as first selection
    selectedItem.value = itemId;
    secondSelectedItem.value = null;
  }
};

// Use the selected item
const useSelectedItem = () => {
  if (selectedItem.value && props.onUseItem) {
    props.onUseItem(selectedItem.value);
    clearSelection();
  }
};

// Start combining items
const combineItems = () => {
  // We need to select a second item to combine with
  // UI will change to prompt user to select another item
  // The actual combination happens when selecting the second item
};

// Clear all selections
const clearSelection = () => {
  selectedItem.value = null;
  secondSelectedItem.value = null;
};
</script>

<style scoped>
.inventory {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

h2 {
  margin-top: 0;
  font-size: 1.2rem;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.empty-inventory {
  font-style: italic;
  color: #7f8c8d;
  padding: 1rem 0;
}

.inventory-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.inventory-item {
  padding: 0.7rem;
  margin-bottom: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  cursor: pointer;
  background-color: white;
  transition: background-color 0.2s;
}

.inventory-item:hover {
  background-color: #f0f0f0;
}

.inventory-item.selected {
  background-color: #e1f5fe;
  border-color: #81d4fa;
}

.item-name {
  font-weight: bold;
  margin-bottom: 0.3rem;
}

.item-description {
  font-size: 0.9rem;
  color: #666;
}

.item-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.9rem;
}

.action-button:hover {
  background-color: #388e3c;
}

.action-button.cancel {
  background-color: #9e9e9e;
}

.action-button.cancel:hover {
  background-color: #757575;
}