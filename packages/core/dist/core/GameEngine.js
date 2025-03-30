"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const EventEmitter_1 = require("./EventEmitter");
const StateManager_1 = require("./StateManager");
const SceneManager_1 = require("./SceneManager");
const EffectManager_1 = require("./EffectManager");
class GameEngine {
    constructor(options = {}) {
        this.plugins = new Map();
        this.isRunning = false;
        const { scenes = [], initialState = {} } = options;
        this.eventEmitter = new EventEmitter_1.EventEmitter();
        this.stateManager = new StateManager_1.StateManager(initialState);
        this.sceneManager = new SceneManager_1.SceneManager(scenes);
        this.effectManager = new EffectManager_1.EffectManager();
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
exports.GameEngine = GameEngine;
