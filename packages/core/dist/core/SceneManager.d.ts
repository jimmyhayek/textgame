import { Scene, GameState, Choice } from '../types';
import { GameEngine } from './GameEngine';
export declare class SceneManager {
    private scenes;
    private currentSceneId;
    constructor(scenes?: Scene[]);
    registerScenes(scenes: Scene[]): void;
    getScene(sceneId: string): Scene | undefined;
    getCurrentScene(): Scene | null;
    transitionToScene(sceneId: string, state: GameState, engine: GameEngine): boolean;
    getAvailableChoices(state: GameState): Choice[];
}
