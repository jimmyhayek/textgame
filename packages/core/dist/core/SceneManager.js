export class SceneManager {
    constructor(scenes = []) {
        this.scenes = new Map();
        this.currentSceneId = null;
        this.registerScenes(scenes);
    }
    registerScenes(scenes) {
        for (const scene of scenes) {
            this.scenes.set(scene.id, scene);
        }
    }
    getScene(sceneId) {
        return this.scenes.get(sceneId);
    }
    getCurrentScene() {
        if (!this.currentSceneId)
            return null;
        return this.scenes.get(this.currentSceneId) || null;
    }
    transitionToScene(sceneId, state, engine) {
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
    getAvailableChoices(state) {
        const currentScene = this.getCurrentScene();
        if (!currentScene)
            return [];
        return currentScene.choices.filter(choice => {
            if (choice.condition) {
                return choice.condition(state);
            }
            return true;
        });
    }
}
