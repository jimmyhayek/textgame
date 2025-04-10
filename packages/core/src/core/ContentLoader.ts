import { Scene, SceneKey, ScenesRegistry } from '../types';

type SceneModule = { default: Scene } | Scene;

export class ContentLoader {
  private loadedScenes: Map<SceneKey, Scene> = new Map();
  private loadingPromises: Map<SceneKey, Promise<Scene>> = new Map();
  private sceneRegistry: ScenesRegistry = {};

  public registerScenes(registry: ScenesRegistry): void {
    this.sceneRegistry = { ...this.sceneRegistry, ...registry };
  }

  public async loadScene(sceneKey: SceneKey): Promise<Scene> {
    if (this.loadedScenes.has(sceneKey)) {
      return this.loadedScenes.get(sceneKey)!;
    }

    if (this.loadingPromises.has(sceneKey)) {
      return this.loadingPromises.get(sceneKey)!;
    }

    const sceneDefOrImport = this.sceneRegistry[sceneKey];

    if (!sceneDefOrImport) {
      throw new Error(`Scene with key "${sceneKey}" not found in registry`);
    }

    let loadPromise: Promise<Scene>;

    if (typeof sceneDefOrImport === 'function') {
      loadPromise = sceneDefOrImport().then((module: SceneModule): Scene => {
        const scene: Scene = 'default' in module ? module.default : module;
        // Přidáme _key do scény pro lepší práci s identifikátory
        const enhancedScene = { ...scene, _key: sceneKey };
        this.loadedScenes.set(sceneKey, enhancedScene);
        return enhancedScene;
      });
    } else {
      // Přidáme _key do scény
      const enhancedScene = { ...sceneDefOrImport, _key: sceneKey };
      loadPromise = Promise.resolve(enhancedScene);
      this.loadedScenes.set(sceneKey, enhancedScene);
    }

    this.loadingPromises.set(sceneKey, loadPromise);
    return loadPromise;
  }

  public hasScene(sceneKey: SceneKey): boolean {
    return sceneKey in this.sceneRegistry;
  }

  public getSceneKeys(): SceneKey[] {
    return Object.keys(this.sceneRegistry);
  }

  public async preloadScenes(sceneKeys?: SceneKey[]): Promise<void> {
    const keysToLoad: string[] = sceneKeys || this.getSceneKeys();
    await Promise.all(keysToLoad.map(key => this.loadScene(key)));
  }
}