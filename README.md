# TextGame Engine

A modular, flexible framework for building interactive narrative experiences and text-based adventure games.

## 🎮 Overview

TextGame Engine is a lightweight but powerful framework designed to simplify the creation of text-based games, interactive fiction, and narrative experiences. It provides the core tools necessary for building engaging stories with branching paths, player choices, state management, and a plugin system for extended functionality.

The engine is built with a focus on:

- **Modularity** - Use only what you need
- **Flexibility** - Build experiences from simple CYOA to complex games
- **Developer Experience** - Clear API design and comprehensive documentation
- **Performance** - Small footprint and efficient execution

## 🚀 Key Features

- **Scene-Based Flow** - Organize your narrative as interconnected scenes
- **Choice System** - Present players with meaningful decisions
- **State Management** - Track variables, inventory, character stats, and player decisions
- **Condition System** - Show/hide choices based on player state
- **Effect System** - Trigger changes in game state based on player actions
- **Plugin Architecture** - Extend functionality with official or custom plugins
- **Framework Agnostic** - Core library works anywhere JavaScript runs
- **Framework Adapters** - Dedicated integrations for React, Vue, and Svelte

## 🧩 Packages

The project is structured as a monorepo with multiple packages:

### Core Package
- `@textgame/core` - The foundation with all essential game engine features

### Official Plugins
- `@textgame/plugin-audio` - Sound effects and music management
- `@textgame/plugin-inventory` - Item management system
- `@textgame/plugin-text-input` - Free-form text input processing
- `@textgame/plugin-save-system` - Save/load game functionality
- `@textgame/plugin-stats` - Character statistics and attributes
- `@textgame/plugin-debug` - Development tools for debugging and testing

### Framework Adapters
- `@textgame/react` - React components and hooks
- `@textgame/vue` - Vue components and composables
- `@textgame/svelte` - Svelte components and stores

## 🔧 Technical Architecture

### Core Concepts

The engine is built around several key components that work together:

#### 1. Scene Management
Scenes are the fundamental building blocks of a TextGame. Each scene contains:
- Content (text, description)
- Choices available to the player
- Conditions for displaying the scene
- Effects that trigger when the scene is entered

#### 2. State Management
The state system tracks:
- Variables (flags, counters, etc.)
- Scene history
- Player progress
- Custom state properties

#### 3. Event System
A pub/sub event system allows:
- Components to communicate without tight coupling
- Plugins to hook into game lifecycle events
- Custom events for game-specific functionality

#### 4. Effect System
Effects are actions that change the game state:
- Setting variables
- Modifying inventory
- Changing character stats
- Playing sounds
- Custom effects

#### 5. Plugin System
The plugin architecture:
- Provides a standardized way to extend the engine
- Uses a registration system for new functionality
- Allows plugins to hook into the game lifecycle
- Maintains clean separation of concerns

### Data Flow

```
┌─────────────────┐      ┌────────────────┐      ┌─────────────────┐
│                 │      │                │      │                 │
│  Game Engine    │◄────►│  Scene Manager │◄────►│  State Manager  │
│                 │      │                │      │                 │
└─────────────────┘      └────────────────┘      └─────────────────┘
         ▲                       ▲                        ▲
         │                       │                        │
         ▼                       │                        ▼
┌─────────────────┐              │              ┌─────────────────┐
│                 │              │              │                 │
│  Event Emitter  │◄─────────────┘              │  Effect Manager │
│                 │                             │                 │
└─────────────────┘                             └─────────────────┘
         ▲                                               ▲
         │                                               │
         ▼                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         Plugin System                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Code Organization

The project follows a clean, modular structure:

```
src/
├── core/
│   ├── GameEngine.ts       # Main engine class
│   ├── SceneManager.ts     # Handles scene transitions
│   ├── StateManager.test.ts     # Manages game state
│   ├── EventEmitter.ts     # Pub/sub event system
│   ├── EffectManager.ts    # Processes game effects
│   ├── PluginManager.ts    # Plugin registration and lifecycle
│   └── index.ts            # Public API exports
├── types/
│   ├── Scene.ts            # Scene type definitions
│   ├── State.ts            # State type definitions
│   ├── Effect.ts           # Effect type definitions
│   ├── Plugin.ts           # Plugin interface definitions
│   └── index.ts            # Type exports
├── utils/
│   ├── serialization.ts    # State serialization helpers
│   ├── conditions.ts       # Condition evaluation utilities
│   └── logger.ts           # Logging utilities
└── index.ts                # Main package entry point
```

## 🛠️ Getting Started

### Installation

```bash
# Install the core package
npm install @textgame/core

# Add plugins as needed
npm install @textgame/plugin-inventory @textgame/plugin-save-system

# Install the adapter for your framework
npm install @textgame/vue  # for Vue applications
```

### Basic Usage

```typescript
import { GameEngine, Scene } from '@textgame/core';

// Define your game scenes
const scenes: Scene[] = [
  {
    id: 'start',
    title: 'The Beginning',
    content: 'You wake up in a small room. There is a door to the north and a window to the east.',
    choices: [
      {
        id: 'door',
        text: 'Go through the door',
        nextScene: 'corridor'
      },
      {
        id: 'window',
        text: 'Look through the window',
        nextScene: 'window_view'
      }
    ]
  },
  // Additional scenes...
];

// Create a game instance
const game = new GameEngine({
  scenes,
  initialState: {
    variables: {
      hasKey: false
    }
  }
});

// Start the game
game.start('start');

// Listen for scene changes
game.on('sceneChanged', (scene) => {
  console.log(`Current scene: ${scene.title}`);
});

// Make a choice
game.selectChoice('door');
```

### Using with Vue 3

```typescript
<script setup lang="ts">
import { useGameEngine } from '@textgame/vue';
import { scenes } from './game/scenes';

const { 
  currentScene, 
  choices, 
  selectChoice, 
  gameState 
} = useGameEngine({
  scenes,
  initialState: {
    variables: {
      playerName: '',
      health: 100
    }
  }
});
</script>

<template>
  <div class="game-container">
    <h1>{{ currentScene.title }}</h1>
    <p>{{ currentScene.content }}</p>
    
    <div class="choices">
      <button 
        v-for="choice in choices" 
        :key="choice.id"
        @click="selectChoice(choice.id)"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>
```

## 🧪 Testing

The engine comes with comprehensive testing utilities:

```bash
# Run all tests
npm test

# Run tests for a specific package
npm test --workspace=@textgame/core

# Run e2e tests
npm run test:e2e
```

For end-to-end testing, we use Cypress with custom commands optimized for testing narrative flow and game state.

## 📖 Documentation

Complete documentation is available at [docs website URL].

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please check out our [contribution guidelines](CONTRIBUTING.md) for details.