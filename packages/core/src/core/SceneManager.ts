import { Scene, GameState, Choice } from '../types';
import { GameEngine } from './GameEngine';

export class SceneManager {
    private scenes: Map<string, Scene> = new Map();
    private currentSceneId: string | null = null;

    constructor(scenes: Scene[] = []) {
        this.registerScenes(scenes);
    }

    public registerScenes(scenes: Scene[]): void {
        for (const scene of scenes) {
            this.scenes.set(scene.id, scene);
        }
    }

    public getScene(sceneId: string): Scene | undefined {
        return this.scenes.get(sceneId);
    }

    public getCurrentScene(): Scene | null {
        if (!this.currentSceneId) return null;
        return this.scenes.get(this.currentSceneId) || null;
    }

    public transitionToScene(sceneId: string, state: GameState, engine: GameEngine): boolean {
        const targetScene = this.scenes.get(sceneId);
        if (!targetScene) {
            console.error(`Scene with ID '${sceneId}' not found.`);
            return false;
        }

        const currentScene = this.getCurrentScene();
        if (currentScene && currentScene.onExit) {
            currentScene.onExit(state, engine);
        }

        this.currentSceneId = sceneId;

        state.visitedScenes.add(sceneId);

        if (targetScene.onEnter) {
            targetScene.onEnter(state, engine);
        }

        return true;
    }

    public getAvailableChoices(state: GameState): Choice[] {
        const currentScene = this.getCurrentScene();
        if (!currentScene) return [];

        return currentScene.choices.filter(choice => {
            if (choice.condition) {
                return choice.condition(state);
            }
            return true;
        });
    }
}