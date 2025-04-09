import { Scene, Choice, SceneId, GameState } from '../types';
import { ContentLoader } from './ContentLoader';
import { produce } from '../utils/immer';

/**
 * Manages scenes and transitions between them
 *
 * SceneManager is responsible for loading and caching scenes,
 * handling scene transitions, and providing access to the current scene.
 * It works with immutable state to ensure predictable scene transitions.
 */
export class SceneManager {
  private currentSceneId: SceneId | null = null;
  private contentLoader: ContentLoader;
  private currentScene: Scene | null = null;

  /**
   * Creates a new SceneManager instance
   *
   * @param contentLoader - The ContentLoader to use for loading scenes
   */
  constructor(contentLoader: ContentLoader) {
    this.contentLoader = contentLoader;
  }

  /**
   * Transitions to a new scene
   *
   * @param sceneId - ID of the scene to transition to
   * @param state - Current game state
   * @param engine - Game engine instance or mock object for testing
   * @returns Promise that resolves to true if transition was successful, false otherwise
   */
  public async transitionToScene(
      sceneId: SceneId,
      state: GameState,
      engine: any // Změněno na 'any' pro podporu testů
  ): Promise<boolean> {
    try {
      const targetScene: Scene = await this.contentLoader.loadScene(sceneId);

      if (!targetScene) {
        console.error(`Scene with ID '${sceneId}' not found.`);
        return false;
      }

      // Pokud existuje aktuální scéna, zavoláme její onExit metodu
      if (this.currentScene && this.currentScene.onExit) {
        this.currentScene.onExit(state, engine);
      }

      // Aktualizujeme aktuální scénu
      this.currentSceneId = sceneId;
      this.currentScene = targetScene;

      // Pro testy: Přímá modifikace state, protože v testech nemusí existovat StateManager
      // V reálném kódu při použití GameEngine bude možné použít StateManager
      if (engine.getStateManager && typeof engine.getStateManager === 'function') {
        // Pro reálné použití s GameEngine - bezpečná imutabilní modifikace
        engine.getStateManager().updateState((draftState: GameState) => {
          draftState.visitedScenes.add(sceneId);
        });
      } else {
        // Pro testy - přímá modifikace state
        state.visitedScenes.add(sceneId);
      }

      // Zavoláme onEnter metodu nové scény
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
   * @param state - Current game state
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
}