export interface GameState {
    visitedScenes: Set<string>;
    variables: Record<string, any>;
    [key: string]: any;
}

export interface Choice {
    id: string;
    text: string | ((state: GameState) => string);
    nextScene: string | ((state: GameState) => string);
    condition?: (state: GameState) => boolean;
    effects?: Effect[];
    metadata?: Record<string, any>;
}

export interface Scene {
    id: string;
    title: string;
    content: string | ((state: GameState) => string);
    choices: Choice[];
    onEnter?: (state: GameState, engine: GameEngine) => void;
    onExit?: (state: GameState, engine: GameEngine) => void;
    metadata?: Record<string, any>;
}

export interface Effect {
    type: string;
    [key: string]: any;
}

export type GameEventType =
    | 'sceneChanged'
    | 'stateChanged'
    | 'choiceSelected'
    | 'gameStarted'
    | 'gameEnded'
    | string;

export type EventListener = (data: any) => void;

export interface Plugin {
    name: string;
    initialize: (engine: GameEngine) => void;
    destroy?: () => void;
}

import { GameEngine } from '../core/GameEngine';