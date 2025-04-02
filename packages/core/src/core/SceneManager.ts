import { Scene, Choice, SceneId, GameState } from '../types';
import { ContentLoader } from './ContentLoader';
import { GameEngine } from './GameEngine';

export class SceneManager {
  private currentSceneId: SceneId | null = null;
  private contentLoader: ContentLoader;
  private currentScene: Scene | null = null;

  constructor(contentLoader: ContentLoader) {
    this.contentLoader = contentLoader;
  }

  public async transitionToScene(
    sceneId: SceneId,
    state: GameState,
    engine: GameEngine
  ): Promise<boolean> {
    try {
      const targetScene: Scene = await this.contentLoader.loadScene(sceneId);

      if (!targetScene) {
        console.error(`Scene with ID '${sceneId}' not found.`);
        return false;
      }

      if (this.currentScene && this.currentScene.onExit) {
        this.currentScene.onExit(state, engine);
      }

      this.currentSceneId = sceneId;
      this.currentScene = targetScene;

      state.visitedScenes.add(sceneId);

      if (targetScene.onEnter) {
        targetScene.onEnter(state, engine);
      }

      return true;
    } catch (error) {
      console.error(`Error transitioning to scene '${sceneId}':`, error);
      return false;
    }
  }

  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  public getCurrentSceneId(): SceneId | null {
    return this.currentSceneId;
  }

  public getAvailableChoices(state: GameState): Choice[] {
    if (!this.currentScene) return [];

    return this.currentScene.choices.filter(choice => {
      if (choice.condition) {
        return choice.condition(state);
      }
      return true;
    });
  }
}
