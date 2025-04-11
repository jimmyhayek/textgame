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
import { createGameEngine, defineScene, defineScenes, createSceneLoader } from '@pabitel/core';

// Define your scenes
const startScene = defineScene({
    title: 'The Beginning',
    content: 'You wake up in a small room. There is a door to the north and a window to the east.',
    choices: [
        {
            content: 'Go through the door',
            scene: 'corridor'
        },
        {
            content: 'Look through the window',
            scene: 'window-view'
        }
    ]
});

const corridorScene = defineScene({
    title: 'Dark Corridor',
    content: 'You enter a long, dark corridor.',
    choices: [
        {
            content: 'Go back to the room',
            scene: 'start'
        }
    ]
});

const windowViewScene = defineScene({
    title: 'Window View',
    content: 'Through the window, you see a beautiful landscape.',
    choices: [
        {
            content: 'Step back from the window',
            scene: 'start'
        }
    ]
});

// Register scenes
const scenes = defineScenes({
    'start': startScene,
    'corridor': corridorScene,
    'window-view': windowViewScene
});

// Create the game engine
const sceneLoader = createSceneLoader(scenes);
const engine = createGameEngine({
    sceneLoader
});

// Start the game
engine.start('start').then(() => {
    console.log('Game started at scene:', engine.getCurrentScene()?.title);
    console.log(engine.getCurrentScene()?.content);
    console.log('Available choices:');
    engine.getAvailableChoices().forEach((choice, index) => {
        console.log(`${index}. ${choice.content}`);
    });
});
```

## Core Concepts

### Scenes and Choices

The basic building blocks of any game created with Pabitel Core are scenes and choices. A scene represents a single "page" or "screen" of your game, while choices are the options available to the player.

```typescript
interface Scene {
  title: string;
  content: string | ((state: GameState) => string);
  choices: Choice[];
  onEnter?: (state: GameState, engine: GameEngine) => void;
  onExit?: (state: GameState, engine: GameEngine) => void;
  metadata?: Record<string, any>;
}

interface Choice {
  content: string | ((state: GameState) => string);
  scene?: SceneKey | ((state: GameState) => SceneKey);
  condition?: (state: GameState) => boolean;
  effects?: Effect[];
  metadata?: Record<string, any>;
}
```

### Content Loaders and Keys

Pabitel Core uses a path-based key system for content identification, similar to file-based routing in modern web frameworks. This allows for intuitive organization of game content:

```typescript
// Scenes are identified by their keys, which can be path-like
const scenes = defineScenes({
  'forest/entrance': entranceScene,
  'forest/clearing': clearingScene,
  'village/square': squareScene
});
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
  content: 'Take the sword',
  scene: 'cave/entrance',
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

### Choices without scene transitions

Choices don't always need to lead to a new scene. You can create choices that just apply effects while staying on the current scene:

```typescript
const forestScene = defineScene({
  title: 'Forest',
  content: 'You are in a dense forest...',
  choices: [
    {
      content: 'Search the area',
      // No scene property - only effects
      effects: [
        { type: 'SET_VARIABLE', variable: 'foundMap', value: true }
      ]
    },
    {
      content: 'Continue deeper',
      scene: 'forest/clearing'
    }
  ]
});
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
    sceneLoader,
    plugins: [inventoryPlugin]
});
```

## Advanced Usage

For more advanced usage, check out the examples directory and the documentation.

## License

MIT © Jakub Hájek