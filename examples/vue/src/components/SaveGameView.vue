<template>
  <div class="save-system">
    <div class="save-buttons">
      <button
        data-testid="save-button"
        class="action-button"
        @click="toggleSaveMenu"
      >
        {{ showSaveMenu ? 'Close' : 'Save Game' }}
      </button>
      <button
        data-testid="load-button"
        class="action-button"
        @click="toggleLoadMenu"
      >
        {{ showLoadMenu ? 'Close' : 'Load Game' }}
      </button>
    </div>

    <div v-if="saveMessage" class="save-message" data-testid="save-message">
      {{ saveMessage }}
    </div>

    <!-- Save Game Menu -->
    <div v-if="showSaveMenu" class="save-menu">
      <h3>Save Game</h3>

      <div class="save-slots">
        <div
          v-for="(slot, index) in availableSaveSlots"
          :key="`save-${index+1}`"
          class="save-slot"
          :data-testid="`save-slot-${index+1}`"
          @click="saveGame(index+1)"
        >
          <div class="slot-number">Slot {{ index+1 }}</div>
          <div v-if="slot" class="slot-info">
            <div class="slot-name">{{ slot.data.name }}</div>
            <div class="slot-meta">
              {{ formatDate(slot.data.timestamp) }}
              <span class="slot-playtime">{{ formatPlaytime(slot.data.playtime) }}</span>
            </div>
          </div>
          <div v-else class="slot-empty">Empty</div>
        </div>

        <!-- Auto-save slot -->
        <div
          class="save-slot auto-save"
          data-testid="auto-save-slot"
          @click="saveGame('auto')"
        >
          <div class="slot-number">Auto-save</div>
          <div v-if="autoSaveSlot" class="slot-info">
            <div class="slot-name">{{ autoSaveSlot.data.name }}</div>
            <div class="slot-meta">
              {{ formatDate(autoSaveSlot.data.timestamp) }}
              <span class="slot-playtime">{{ formatPlaytime(autoSaveSlot.data.playtime) }}</span>
            </div>
          </div>
          <div v-else class="slot-empty">No auto-save yet</div>
        </div>
      </div>
    </div>

    <!-- Load Game Menu -->
    <div v-if="showLoadMenu" class="save-menu">
      <h3>Load Game</h3>

      <div class="save-slots">
        <div
          v-for="slot in saveSlots"
          :key="`load-${slot.slot}`"
          class="save-slot"
          :data-testid="`save-slot-${slot.slot}`"
          @click="loadGame(slot.slot)"
        >
          <div class="slot-number">
            {{ slot.slot === 'auto' ? 'Auto-save' : `Slot ${slot.slot}` }}
          </div>
          <div class="slot-info">
            <div class="slot-name">{{ slot.data.name }}</div>
            <div class="slot-meta">
              {{ formatDate(slot.data.timestamp) }}
              <span class="slot-playtime">{{ formatPlaytime(slot.data.playtime) }}</span>
            </div>
          </div>

          <button
            class="delete-button"
            @click.stop="deleteSlot(slot.slot)"
          >
            ×
          </button>
        </div>

        <div v-if="saveSlots.length === 0" class="no-saves">
          No saved games found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { SaveSystemPlugin, SaveData } from '../plugins/SaveSystemPlugin';

interface Props {
  saveSystem: SaveSystemPlugin;
}

const props = defineProps<Props>();

// UI state
const showSaveMenu = ref(false);
const showLoadMenu = ref(false);
const saveMessage = ref('');
const saveSlots = ref<{ slot: string; data: SaveData }[]>([]);

// Number of save slots to show
const numSaveSlots = 5;

// Load save slots on mount
onMounted(() => {
  refreshSaveSlots();
});

// Computed properties for available save slots
const availableSaveSlots = computed(() => {
  const slots = Array(numSaveSlots).fill(null);

  // Fill in existing saves
  saveSlots.value.forEach(save => {
    if (save.slot !== 'auto' && !isNaN(parseInt(save.slot))) {
      const slotIndex = parseInt(save.slot) - 1;
      if (slotIndex >= 0 && slotIndex < numSaveSlots) {
        slots[slotIndex] = save;
      }
    }
  });

  return slots;
});

// Get auto-save slot if exists
const autoSaveSlot = computed(() => {
  return saveSlots.value.find(slot => slot.slot === 'auto');
});

// Toggle save menu
const toggleSaveMenu = () => {
  showSaveMenu.value = !showSaveMenu.value;
  if (showSaveMenu.value) {
    showLoadMenu.value = false;
    refreshSaveSlots();
  }
};

// Toggle load menu
const toggleLoadMenu = () => {
  showLoadMenu.value = !showLoadMenu.value;
  if (showLoadMenu.value) {
    showSaveMenu.value = false;
    refreshSaveSlots();
  }
};

// Refresh save slots
const refreshSaveSlots = () => {
  saveSlots.value = props.saveSystem.getSaveSlots();
};

// Save game to slot
const saveGame = (slotId: number | string) => {
  const success = props.saveSystem.saveGame(
    slotId.toString(),
    `Save ${slotId === 'auto' ? '(Auto)' : slotId}`
  );

  if (success) {
    saveMessage.value = 'Game saved successfully';
    refreshSaveSlots();

    // Clear message after a delay
    setTimeout(() => {
      saveMessage.value = '';
    }, 3000);
  } else {
    saveMessage.value = 'Failed to save game';
  }
};

// Load game from slot
const loadGame = (slotId: string) => {
  const success = props.saveSystem.loadGame(slotId);

  if (success) {
    saveMessage.value = 'Game loaded successfully';
    showLoadMenu.value = false;

    // Clear message after a delay
    setTimeout(() => {
      saveMessage.value = '';
    }, 3000);
  } else {
    saveMessage.value = 'Failed to load game';
  }
};

// Delete a save slot
const deleteSlot = (slotId: string) => {
  if (confirm('Are you sure you want to delete this save?')) {
    const success = props.saveSystem.deleteSaveSlot(slotId);

    if (success) {
      saveMessage.value = 'Save deleted';
      refreshSaveSlots();

      // Clear message after a delay
      setTimeout(() => {
        saveMessage.value = '';
      }, 3000);
    } else {
      saveMessage.value = 'Failed to delete save';
    }
  }
};

// Format date for display
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format playtime for display
const formatPlaytime = (seconds: number): string => {
  return props.saveSystem.formatPlaytime(seconds);
};
</script>

<style scoped>
.save-system {
  margin-top: 2rem;
}

.save-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.action-button {
  padding: 0.6rem 1.2rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.action-button:hover {
  background-color: #2980b9;
}

.save-message {
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  background-color: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  border-left: 4px solid #2e7d32;
}

.save-menu {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: #2c3e50;
}

.save-slots {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.save-slot {
  padding: 0.8rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background-color: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.save-slot:hover {
  background-color: #f0f0f0;
}

.save-slot.auto-save {
  border-left: 4px solid #3498db;
}

.slot-number {
  font-weight: bold;
  min-width: 80px;
}

.slot-info {
  flex: 1;
  overflow: hidden;
}

.slot-name {
  font-weight: bold;
  margin-bottom: 0.2rem;
}

.slot-meta {
  font-size: 0.8rem;
  color: #666;
  display: flex;
  justify-content: space-between;
}

.slot-playtime {
  color: #3498db;
}

.slot-empty {
  color: #999;
  font-style: italic;
}

.no-saves {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

.delete-button {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #e74c3c;
  color: white;
  border: none;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  margin-left: 0.5rem;
}

.delete-button:hover {
  background-color: #c0392b;
}

/* Auto-save indicator */
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
</style>