import { Scene, SceneId, ScenesRegistry } from '../types';

type SceneModule = { default: Scene } | Scene;

export class ContentLoader {
  private loadedScenes: Map<SceneId, Scene> = new Map();
  private loadingPromises: Map<SceneId, Promise<Scene>> = new Map();
  private sceneRegistry: ScenesRegistry = {};

  public registerScenes(registry: ScenesRegistry): void {
    this.sceneRegistry = { ...this.sceneRegistry, ...registry };
  }

  public async loadScene(sceneId: SceneId): Promise<Scene> {
    if (this.loadedScenes.has(sceneId)) {
      return this.loadedScenes.get(sceneId)!;
    }

    if (this.loadingPromises.has(sceneId)) {
      return this.loadingPromises.get(sceneId)!;
    }

    const sceneDefOrImport = this.sceneRegistry[sceneId];

    if (!sceneDefOrImport) {
      throw new Error(`Scene with ID "${sceneId}" not found in registry`);
    }

    let loadPromise: Promise<Scene>;

    if (typeof sceneDefOrImport === 'function') {
      loadPromise = sceneDefOrImport().then((module: SceneModule): Scene => {
        const scene: Scene = 'default' in module ? module.default : module;
        this.loadedScenes.set(sceneId, scene);
        return scene;
      });
    } else {
      loadPromise = Promise.resolve(sceneDefOrImport as Scene);
      this.loadedScenes.set(sceneId, sceneDefOrImport as Scene);
    }

    this.loadingPromises.set(sceneId, loadPromise);
    return loadPromise;
  }

  public hasScene(sceneId: SceneId): boolean {
    return sceneId in this.sceneRegistry;
  }

  public getSceneIds(): SceneId[] {
    return Object.keys(this.sceneRegistry);
  }

  public async preloadScenes(sceneIds?: SceneId[]): Promise<void> {
    const idsToLoad: string[] = sceneIds || this.getSceneIds();
    await Promise.all(idsToLoad.map(id => this.loadScene(id)));
  }
}
