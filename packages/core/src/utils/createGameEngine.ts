import { GameEngine } from '../core';
import { Plugin, ScenesDefinition, GameState } from '../types';

interface GameEngineOptions {
  scenes?: ScenesDefinition;
  plugins?: Plugin[];
  initialState?: Partial<GameState>;
}

export function createGameEngine(options: GameEngineOptions = {}): GameEngine {
  const { scenes, plugins = [], initialState = {} } = options;

  const engine = new GameEngine({
    initialState,
  });

  if (scenes) {
    engine.getContentLoader().registerScenes(scenes.content);
  }

  for (const plugin of plugins) {
    engine.registerPlugin(plugin);
  }

  return engine;
}
