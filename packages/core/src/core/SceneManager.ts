import { Scene, Choice, SceneId, GameState } from '../types';
import { GenericContentLoader } from '../loaders/GenericContentLoader';

/**
 * Manages scenes and transitions between them
 *
 * SceneManager is responsible for loading and caching scenes,
 * handling scene transitions, and providing access to the current scene.
 * It works with immutable state to ensure predictable scene transitions.
 */
export class SceneManager {
  /** ID of the current scene */
  private currentSceneId: SceneId | null = null;

  /** Reference to the current scene object */
  private currentScene: Scene | null = null;

  /** Content loader for scenes */
  private sceneLoader: GenericContentLoader<Scene>;

  /**
   * Creates a new SceneManager instance
   *
   * @param sceneLoader The loader to use for loading scenes
   */
  constructor(sceneLoader: GenericContentLoader<Scene>) {
    this.sceneLoader = sceneLoader;
  }

  /**
   * Transitions to a new scene
   *
   * @param sceneId ID of the scene to transition to
   * @param state Current game state
   * @param engine Game engine instance or mock object for testing
   * @returns Promise that resolves to true if transition was successful, false otherwise
   */
  public async transitionToScene(
      sceneId: SceneId,
      state: GameState,
      engine: any
  ): Promise<boolean> {
    try {
      const targetScene: Scene = await this.sceneLoader.loadContent(sceneId);

      if (!targetScene) {
        console.error(`Scene with ID '${sceneId}' not found.`);
        return false;
      }

      // If there's a current scene, call its onExit method
      if (this.currentScene && this.currentScene.onExit) {
        this.currentScene.onExit(state, engine);
      }

      // Update current scene
      this.currentSceneId = sceneId;
      this.currentScene = targetScene;

      // Update state to track visited scenes
      if (engine.getStateManager && typeof engine.getStateManager === 'function') {
        // For real usage with GameEngine - safe immutable modification
        engine.getStateManager().updateState((draftState: GameState) => {
          draftState.visitedScenes.add(sceneId);
        });
      } else {
        // For tests - direct state modification
        state.visitedScenes.add(sceneId);
      }

      // Call onEnter method of the new scene
      if (targetScene.onEnter) {
        targetScene.onEnter(state, engine);
      }

      return true;
    } catch (error) {
      console.error(`Error transitioning to scene '${sceneId}':`, error);
      return false;
    }
  }

  /**
   * Gets the current scene
   *
   * @returns The current scene or null if no scene is active
   */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Gets the ID of the current scene
   *
   * @returns The current scene ID or null if no scene is active
   */
  public getCurrentSceneId(): SceneId | null {
    return this.currentSceneId;
  }

  /**
   * Gets available choices for the current scene, filtered by conditions
   *
   * @param state Current game state
   * @returns Array of available choices
   */
  public getAvailableChoices(state: GameState): Choice[] {
    if (!this.currentScene) return [];

    return this.currentScene.choices.filter(choice => {
      if (choice.condition) {
        return choice.condition(state);
      }
      return true;
    });
  }

  /**
   * Preloads scenes by IDs
   *
   * @param sceneIds Optional array of scene IDs to preload, preloads all scenes if omitted
   * @returns Promise that resolves when all scenes are loaded
   */
  public async preloadScenes(sceneIds?: SceneId[]): Promise<void> {
    return this.sceneLoader.preloadContent(sceneIds);
  }


  /**
   * Gets the loader used by this manager
   *
   * @returns The content loader for scenes
   */
  public getSceneLoader(): GenericContentLoader<Scene> {
    return this.sceneLoader;
  }
}