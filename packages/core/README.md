# @pabitel/core

Core engine for creating modular, flexible, and story-driven text-based games.

## Overview

Pabitel Core is a minimalist yet powerful framework designed for building interactive narratives, text adventures, and choice-based games. With a strong focus on modularity and type safety, it provides the essential building blocks needed to create complex storytelling experiences without dictating how you structure your game content.

## Key Features

- **Minimalist Core** - Small, focused API with only the essentials
- **Modular Design** - Use only what you need, extend with plugins
- **Type Safety** - Built with TypeScript for robust development
- **Declarative Content** - Define game content with simple, declarative syntax
- **Lazy Loading** - Load content on demand for optimal performance
- **Flexible Structure** - Organize your game content however you want
- **Plugin System** - Easily extend the engine with custom functionality

## Installation

```bash
# Using yarn
yarn add @pabitel/core

# Using npm
npm install @pabitel/core
```

## Basic Usage

Here's a simple example that shows how to create a basic game:

```typescript
import { createGameEngine, defineScenes, GenericContentLoader } from '@pabitel/core';

// Define your scenes
const scenes = defineScenes({
  'start': {
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
  'corridor': {
    id: 'corridor',
    title: 'Dark Corridor',
    content: 'You enter a long, dark corridor.',
    choices: [
      {
        id: 'back',
        text: 'Go back to the room',
        nextScene: 'start'
      }
    ]
  },
  'window_view': {
    id: 'window_view',
    title: 'Window View',
    content: 'Through the window, you see a beautiful landscape.',
    choices: [
      {
        id: 'back',
        text: 'Step back from the window',
        nextScene: 'start'
      }
    ]
  }
});

// Create a loader for scenes
const sceneLoader = new GenericContentLoader();
sceneLoader.registerContent(scenes.content);

// Create the game engine
const engine = createGameEngine({
  loaders: {
    scenes: sceneLoader
  }
});

// Start the game
engine.start('start').then(() => {
  console.log('Game started at scene:', engine.getCurrentScene()?.title);
  console.log(engine.getCurrentScene()?.content);
  console.log('Available choices:');
  engine.getAvailableChoices().forEach(choice => {
    console.log(`- ${choice.text}`);
  });
});
```

## Core Concepts

### Scenes and Choices

The basic building blocks of any game created with Pabitel Core are scenes and choices. A scene represents a single "page" or "screen" of your game, while choices are the options available to the player.

```typescript
interface Scene {
  id: string;
  title: string;
  content: string | ((state: GameState) => string);
  choices: Choice[];
  onEnter?: (state: GameState, engine: GameEngine) => void;
  onExit?: (state: GameState, engine: GameEngine) => void;
  metadata?: Record<string, any>;
}

interface Choice {
  id: string;
  text: string | ((state: GameState) => string);
  nextScene: string | ((state: GameState) => string);
  condition?: (state: GameState) => boolean;
  effects?: Effect[];
  metadata?: Record<string, any>;
}
```

### Content Loaders

Pabitel Core uses a generic content loader system that supports lazy loading for any type of game content. This allows you to organize your content however you want and load it on demand.

```typescript
// Create a loader for scenes
const sceneLoader = new GenericContentLoader<Scene>();

// Register content directly
sceneLoader.registerContent({
  'scene1': { /* scene definition */ },
  'scene2': { /* scene definition */ }
});

// Or use lazy loading
sceneLoader.registerContent({
  'heavyScene': () => import('./scenes/heavyScene')
});

// Get content when needed
const scene = await sceneLoader.loadContent('scene1');
```

### Game State

The game state keeps track of everything that happens in your game, including variables, visited scenes, and any other data you want to track.

```typescript
interface GameState {
  visitedScenes: Set<string>;
  variables: Record<string, any>;
  [key: string]: any;
}
```

### Effects

Effects are actions that change the game state. They can be triggered by choices, scenes, or other game events.

```typescript
// Define a choice with effects
{
  id: 'take_sword',
  text: 'Take the sword',
  nextScene: 'cave_entrance',
  effects: [
    { 
      type: 'SET_VARIABLE', 
      variable: 'hasSword', 
      value: true 
    },
    { 
      type: 'INCREMENT_VARIABLE', 
      variable: 'inventory_count', 
      value: 1 
    }
  ]
}
```

### Plugins

The plugin system allows you to extend the engine with custom functionality. Plugins can add new content types, effects, or other features.

```typescript
import { AbstractPlugin } from '@pabitel/core';

// Create a custom plugin
class InventoryPlugin extends AbstractPlugin {
  constructor() {
    super('inventory', {});
  }

  protected override setupLoaders() {
    // Set up content loaders for items
    const itemLoader = new GenericContentLoader();
    this.loaders.set('items', itemLoader);
  }

  protected override registerEffectProcessors() {
    this.engine?.registerEffectProcessor('ADD_ITEM', (effect, state) => {
      if (!state.inventory) {
        state.inventory = [];
      }
      state.inventory.push(effect.item);
    });
  }
}

// Use the plugin
const inventoryPlugin = new InventoryPlugin();
const engine = createGameEngine({
  plugins: [inventoryPlugin]
});
```

## Advanced Usage

For more advanced usage, check out the examples directory and the documentation.

## License

MIT © Jakub Hájek