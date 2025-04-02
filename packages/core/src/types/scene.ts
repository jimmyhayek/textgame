import { GameState } from './state';
import { Effect } from './effect';

export type SceneId = string;

export interface Choice {
    id: string;
    text: string | ((state: GameState) => string);
    nextScene: string | ((state: GameState) => string);
    condition?: (state: GameState) => boolean;
    effects?: Effect[];
    metadata?: Record<string, any>;
}

export interface Scene {
    id: SceneId;
    title: string;
    content: string | ((state: GameState) => string);
    choices: Choice[];
    onEnter?: (state: GameState, engine: any) => void;
    onExit?: (state: GameState, engine: any) => void;
    metadata?: Record<string, any>;
}

export type SceneLoader = () => Promise<{ default: Scene } | Scene>;
export type SceneDefinition = Scene | SceneLoader;
export type ScenesRegistry = Record<SceneId, SceneDefinition>;