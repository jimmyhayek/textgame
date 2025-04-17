import { GameEngine } from '../core';

export interface Types {
  name: string;
  initialize: (engine: GameEngine) => void;
  destroy?: () => void;
}

export interface PluginOptions {
  /** Optional configuration parameters */
  [key: string]: any;
}
