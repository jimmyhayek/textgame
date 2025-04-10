import { GameEngine } from '../core/GameEngine';
import { Plugin, ContentDefinition, GameState, Scene, SceneId } from '../types';
import { GenericContentLoader } from '../loaders/GenericContentLoader';

/**
 * Options for creating a game engine
 */
interface CreateGameEngineOptions {
  /** Content definitions to register */
  content?: ContentDefinition<any>[];
  /** Plugins to register */
  plugins?: Plugin[];
  /** Initial game state */
  initialState?: Partial<GameState>;
  /** Custom content loaders to use */
  loaders?: {
    [key: string]: GenericContentLoader<any>;
  };
}

/**
 * Creates a new game engine with the specified options
 *
 * @param options Options for creating the game engine
 * @returns New game engine instance
 */
export function createGameEngine(options: CreateGameEngineOptions = {}): GameEngine {
  const {
    content = [],
    plugins = [],
    initialState = {},
    loaders = {}
  } = options;

  // Prepare final loaders map
  const finalLoaders: Record<string, GenericContentLoader<any, any>> = {};

  // Create default scene loader if not provided
  if (!loaders.scenes) {
    finalLoaders.scenes = new GenericContentLoader<Scene>();
  }

  // Add all custom loaders
  Object.entries(loaders).forEach(([type, loader]) => {
    finalLoaders[type] = loader;
  });

  // Create the engine with loaders
  const engine = new GameEngine({
    initialState,
    loaders: finalLoaders
  });

  // Register content with appropriate loaders
  for (const contentDef of content) {
    engine.registerContent(contentDef);
  }

  // Register plugins
  for (const plugin of plugins) {
    engine.registerPlugin(plugin);
  }

  return engine;
}