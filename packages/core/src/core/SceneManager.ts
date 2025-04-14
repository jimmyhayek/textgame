import { Scene, Choice, SceneKey, GameState } from '../types';
import { GenericContentLoader } from '../loaders/GenericContentLoader';

/**
 * Spravuje scény a přechody mezi nimi
 *
 * SceneManager je zodpovědný za načítání a cachování scén,
 * zpracování přechodů mezi scénami a poskytování přístupu k aktuální scéně.
 * Pracuje s neměnným stavem pro zajištění předvídatelných přechodů scén.
 */
export class SceneManager {
  /** Klíč aktuální scény */
  private currentSceneKey: SceneKey | null = null;

  /** Reference na objekt aktuální scény */
  private currentScene: Scene | null = null;

  /** Content loader pro scény */
  private sceneLoader: GenericContentLoader<Scene>;

  /**
   * Vytvoří novou instanci SceneManager
   *
   * @param sceneLoader Loader používaný pro načítání scén
   */
  constructor(sceneLoader: GenericContentLoader<Scene>) {
    this.sceneLoader = sceneLoader;
  }

  /**
   * Přechod na novou scénu
   *
   * @param sceneKey Klíč scény, na kterou se má přejít
   * @param state Aktuální herní stav
   * @param engine Instance herního enginu nebo mock objekt pro testování
   * @returns Promise, který se vyřeší na true, pokud byl přechod úspěšný, jinak false
   */
  public async transitionToScene(
      sceneKey: SceneKey,
      state: GameState,
      engine: any
  ): Promise<boolean> {
    try {
      const targetScene: Scene = await this.sceneLoader.loadContent(sceneKey);

      if (!targetScene) {
        console.error(`Scene with key '${sceneKey}' not found.`);
        return false;
      }

      // Pokud existuje aktuální scéna, zavolá se její onExit metoda
      if (this.currentScene && this.currentScene.onExit) {
        this.currentScene.onExit(state, engine);
      }

      // Aktualizace aktuální scény
      this.currentSceneKey = sceneKey;
      this.currentScene = targetScene;

      // Aktualizace stavu pro sledování navštívených scén
      if (engine.getStateManager && typeof engine.getStateManager === 'function') {
        // Pro reálné použití s GameEngine - bezpečná neměnná modifikace
        engine.getStateManager().updateState((draftState: GameState) => {
          draftState.visitedScenes.add(sceneKey);
        });
      } else {
        // Pro testy - přímá modifikace stavu
        state.visitedScenes.add(sceneKey);
      }

      // Zavolání onEnter metody nové scény
      if (targetScene.onEnter) {
        targetScene.onEnter(state, engine);
      }

      return true;
    } catch (error) {
      console.error(`Error transitioning to scene '${sceneKey}':`, error);
      return false;
    }
  }

  /**
   * Získá aktuální scénu
   *
   * @returns Aktuální scéna nebo null, pokud není žádná scéna aktivní
   */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Získá klíč aktuální scény
   *
   * @returns Klíč aktuální scény nebo null, pokud není žádná scéna aktivní
   */
  public getCurrentSceneKey(): SceneKey | null {
    return this.currentSceneKey;
  }

  /**
   * Získá dostupné volby pro aktuální scénu, filtrované podle podmínek
   *
   * @param state Aktuální herní stav
   * @returns Pole dostupných voleb
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
   * Získá text volby ze statického textu nebo dynamické funkce
   *
   * @param choice Volba, pro kterou se získá text
   * @param state Aktuální herní stav
   * @returns Text volby
   */
  public getChoiceLabel(choice: Choice, state: GameState): string {
    if (typeof choice.label === 'function') {
      return choice.label(state);
    }
    return choice.label;
  }

  /**
   * Získá volbu podle její klávesové zkratky
   *
   * @param shortcut Klávesová zkratka
   * @param state Aktuální herní stav pro filtrování podle podmínek
   * @returns Nalezená volba nebo undefined, pokud žádná neodpovídá
   */
  public getChoiceByShortcut(shortcut: string, state: GameState): Choice | undefined {
    if (!this.currentScene) return undefined;

    return this.getAvailableChoices(state).find(choice => choice.shortcut === shortcut);
  }

  /**
   * Předem načte scény podle klíčů
   *
   * @param sceneKeys Volitelné pole klíčů scén k načtení, načte všechny scény pokud neuvedeno
   * @returns Promise, který se vyřeší, když jsou všechny scény načteny
   */
  public async preloadScenes(sceneKeys?: SceneKey[]): Promise<void> {
    return this.sceneLoader.preloadContent(sceneKeys);
  }


  /**
   * Získá loader používaný tímto managerem
   *
   * @returns Content loader pro scény
   */
  public getSceneLoader(): GenericContentLoader<Scene> {
    return this.sceneLoader;
  }
}