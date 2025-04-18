import { GameState } from '../state/types';
import { Scene, SceneKey } from './types';
import { GenericContentLoader } from '../content/GenericContentLoader';

/**
 * Spravuje scény a přechody mezi nimi
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
     */
    constructor(sceneLoader: GenericContentLoader<Scene>) {
        this.sceneLoader = sceneLoader;
    }

    /**
     * Přechod na novou scénu
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
                engine.getStateManager().updateState((draftState: GameState) => {
                    draftState.visitedScenes.add(sceneKey);
                });
            } else {
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
     */
    public getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    /**
     * Získá klíč aktuální scény
     */
    public getCurrentSceneKey(): SceneKey | null {
        return this.currentSceneKey;
    }

    /**
     * Předem načte scény podle klíčů
     */
    public async preloadScenes(sceneKeys?: SceneKey[]): Promise<void> {
        return this.sceneLoader.preloadContent(sceneKeys);
    }

    /**
     * Získá loader používaný tímto managerem
     */
    public getSceneLoader(): GenericContentLoader<Scene> {
        return this.sceneLoader;
    }
}