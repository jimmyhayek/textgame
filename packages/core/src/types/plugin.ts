import { GameEngine } from '../core';

export interface Plugin {
    name: string;
    initialize: (engine: GameEngine) => void;
    destroy?: () => void;
}