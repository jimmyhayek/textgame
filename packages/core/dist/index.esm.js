class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(listener);
    }
    off(eventType, listener) {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            eventListeners.delete(listener);
        }
    }
    emit(eventType, data) {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            for (const listener of eventListeners) {
                listener(data);
            }
        }
    }
}

class StateManager {
    constructor(initialState = {}) {
        this.state = this.createInitialState(initialState);
    }
    createInitialState(initialState) {
        return {
            visitedScenes: new Set(),
            variables: {},
            ...initialState
        };
    }
    getState() {
        return this.state;
    }
    updateState(updater) {
        updater(this.state);
    }
    setState(newState) {
        this.state = newState;
    }
    serialize() {
        const serializableState = {
            ...this.state,
            visitedScenes: Array.from(this.state.visitedScenes || [])
        };
        return JSON.stringify(serializableState);
    }
    deserialize(serializedState) {
        const parsedState = JSON.parse(serializedState);
        this.state = {
            ...parsedState,
            visitedScenes: new Set(parsedState.visitedScenes || [])
        };
    }
}

class SceneManager {
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

class EffectManager {
    constructor() {
        this.effectProcessors = new Map();
        this.registerDefaultEffects();
    }
    registerDefaultEffects() {
        this.registerEffectProcessor('SET_VARIABLE', (effect, state) => {
            const { variable, value } = effect;
            state.variables[variable] = value;
        });
        this.registerEffectProcessor('INCREMENT_VARIABLE', (effect, state) => {
            const { variable, value = 1 } = effect;
            if (typeof state.variables[variable] !== 'number') {
                state.variables[variable] = 0;
            }
            state.variables[variable] += value;
        });
        this.registerEffectProcessor('DECREMENT_VARIABLE', (effect, state) => {
            const { variable, value = 1 } = effect;
            if (typeof state.variables[variable] !== 'number') {
                state.variables[variable] = 0;
            }
            state.variables[variable] -= value;
        });
    }
    registerEffectProcessor(effectType, processor) {
        this.effectProcessors.set(effectType, processor);
    }
    applyEffect(effect, state) {
        const processor = this.effectProcessors.get(effect.type);
        if (processor) {
            processor(effect, state);
        }
        else {
            console.warn(`No processor registered for effect type '${effect.type}'`);
        }
    }
    applyEffects(effects, state) {
        for (const effect of effects) {
            this.applyEffect(effect, state);
        }
    }
}

class GameEngine {
    constructor(options = {}) {
        this.plugins = new Map();
        this.isRunning = false;
        const { scenes = [], initialState = {} } = options;
        this.eventEmitter = new EventEmitter();
        this.stateManager = new StateManager(initialState);
        this.sceneManager = new SceneManager(scenes);
        this.effectManager = new EffectManager();
    }
    start(initialSceneId) {
        const success = this.sceneManager.transitionToScene(initialSceneId, this.stateManager.getState(), this);
        if (success) {
            this.isRunning = true;
            this.eventEmitter.emit('gameStarted', { sceneId: initialSceneId });
        }
    }
    selectChoice(choiceId) {
        const currentScene = this.sceneManager.getCurrentScene();
        if (!currentScene)
            return;
        const choice = currentScene.choices.find(c => c.id === choiceId);
        if (!choice) {
            console.error(`Choice with ID '${choiceId}' not found in current scene.`);
            return;
        }
        if (choice.condition && !choice.condition(this.stateManager.getState())) {
            console.warn(`Choice with ID '${choiceId}' is not available.`);
            return;
        }
        this.eventEmitter.emit('choiceSelected', { choice });
        if (choice.effects && choice.effects.length > 0) {
            this.stateManager.updateState(state => {
                this.effectManager.applyEffects(choice.effects, state);
            });
            this.eventEmitter.emit('stateChanged', this.stateManager.getState());
        }
        let nextSceneId;
        if (typeof choice.nextScene === 'function') {
            nextSceneId = choice.nextScene(this.stateManager.getState());
        }
        else {
            nextSceneId = choice.nextScene;
        }
        const success = this.sceneManager.transitionToScene(nextSceneId, this.stateManager.getState(), this);
        if (success) {
            this.eventEmitter.emit('sceneChanged', this.sceneManager.getCurrentScene());
        }
    }
    on(eventType, listener) {
        this.eventEmitter.on(eventType, listener);
    }
    off(eventType, listener) {
        this.eventEmitter.off(eventType, listener);
    }
    emit(eventType, data) {
        this.eventEmitter.emit(eventType, data);
    }
    getState() {
        return this.stateManager.getState();
    }
    getCurrentScene() {
        return this.sceneManager.getCurrentScene();
    }
    getAvailableChoices() {
        return this.sceneManager.getAvailableChoices(this.stateManager.getState());
    }
    registerEffectProcessor(effectType, processor) {
        this.effectManager.registerEffectProcessor(effectType, processor);
    }
    registerScenes(scenes) {
        this.sceneManager.registerScenes(scenes);
    }
    registerPlugin(plugin) {
        if (this.plugins.has(plugin.name)) {
            console.warn(`Plugin with name '${plugin.name}' is already registered.`);
            return;
        }
        this.plugins.set(plugin.name, plugin);
        plugin.initialize(this);
    }
    unregisterPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            if (plugin.destroy) {
                plugin.destroy();
            }
            this.plugins.delete(pluginName);
        }
    }
    getPlugin(pluginName) {
        return this.plugins.get(pluginName);
    }
    getEventEmitter() {
        return this.eventEmitter;
    }
    getStateManager() {
        return this.stateManager;
    }
    getSceneManager() {
        return this.sceneManager;
    }
    getEffectManager() {
        return this.effectManager;
    }
}

export { EffectManager, EventEmitter, GameEngine, SceneManager, StateManager };
//# sourceMappingURL=index.esm.js.map
