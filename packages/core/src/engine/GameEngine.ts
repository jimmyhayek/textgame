import {
    GameEngineOptions,
    GameEngineEvents,
    GameStartedEventData,
    GameEndedEventData,
    SceneChangedEventData,
    EffectAppliedEventData
} from './types';
import { GameState } from '../state/types';
import { Scene, SceneKey, SceneTransitionOptions } from '../scene/types';
import { Effect } from '../effect/types';
import { EventEmitter } from '../event';
import { GameStateManager } from '../state';
import { SceneManager } from '../scene/SceneManager';
import { EffectManager } from '../effect/EffectManager';
import { PluginManager } from '../plugin/PluginManager';
import { GenericContentLoader } from '../content/GenericContentLoader';
import { LoaderRegistry } from '../content/LoaderRegistry';
import { SaveManager } from '../save/SaveManager';
import { ContentDefinition } from '../content/types';
import { Plugin } from '../plugin/types';
import { createSaveManager } from '../save/utils';
import { GameEventType, EventListener } from '../event/types';

/**
 * Hlavní třída herního enginu
 *
 * Koordinuje všechny komponenty enginu, spravuje stav hry a přechody
 * mezi scénami, a poskytuje rozhraní pro interakci s herním světem.
 */
export class GameEngine {
    /** Verze enginu */
    private readonly version: string;

    /** Event emitter pro události */
    private readonly eventEmitter: EventEmitter;

    /** Správce stavu */
    private readonly stateManager: GameStateManager;

    /** Správce scén */
    private readonly sceneManager: SceneManager;

    /** Správce efektů */
    private readonly effectManager: EffectManager;

    /** Správce pluginů */
    private readonly pluginManager: PluginManager;

    /** Registr loaderů obsahu */
    private readonly loaderRegistry: LoaderRegistry;

    /** Správce ukládání a načítání */
    private readonly saveManager: SaveManager;

    /** Příznak, zda je hra spuštěna */
    private isRunning: boolean = false;

    /**
     * Vytvoří novou instanci herního enginu
     *
     * @param options Možnosti konfigurace
     */
    constructor(options: GameEngineOptions) {
        const {
            sceneLoader,
            initialState = {},
            plugins = [],
            engineVersion = '0.1.0'
        } = options;

        this.version = engineVersion;

        // Vytvoření nebo převzetí event emitteru
        this.eventEmitter = options.eventEmitter || new EventEmitter();

        // Vytvoření správce stavu
        this.stateManager = new GameStateManager({
            initialState
        });

        // Vytvoření registru loaderů obsahu
        this.loaderRegistry = new LoaderRegistry();

        // Vytvoření správce efektů
        this.effectManager = new EffectManager();

        // Registrace loaderu scén
        this.loaderRegistry.registerLoader('scenes', sceneLoader);

        // Vytvoření správce scén
        this.sceneManager = new SceneManager(sceneLoader);

        // Vytvoření správce pluginů
        this.pluginManager = new PluginManager(this, this.eventEmitter, {
            autoActivate: true
        });

        // Vytvoření nebo převzetí správce ukládání
        if (options.saveManager) {
            this.saveManager = options.saveManager;
        } else {
            this.saveManager = createSaveManager(this, {
                storage: options.saveStorage,
                engineVersion: this.version
            });
        }

        // Inicializace pluginů
        this.initializePlugins(plugins)
    }

    /**
     * Inicializuje pluginy
     *
     * @param plugins Pole pluginů k inicializaci
     * @private
     */
    private async initializePlugins(plugins: Plugin[]): Promise<void> {
        for (const plugin of plugins) {
            await this.pluginManager.registerPlugin(plugin);
        }
    }

    /**
     * Spustí hru od zadané scény
     *
     * @param initialSceneKey Klíč počáteční scény
     * @param options Volitelné možnosti přechodu
     * @returns Promise, který se vyřeší, když je hra spuštěna
     */
    public async start(initialSceneKey: SceneKey, options?: SceneTransitionOptions): Promise<boolean> {
        // Aplikace efektů, pokud existují
        if (options?.effects && options.effects.length > 0) {
            this.applyEffects(options.effects);
        }

        // Přechod na počáteční scénu
        const success = await this.sceneManager.transitionToScene(
            initialSceneKey,
            this.stateManager.getState(),
            this
        );

        if (success) {
            this.isRunning = true;

            // Emitování události startu hry
            this.eventEmitter.emit(GameEngineEvents.GAME_STARTED, {
                sceneKey: initialSceneKey,
                transitionData: options?.data
            } as GameStartedEventData);

            // Emitování události změny scény
            this.eventEmitter.emit(GameEngineEvents.SCENE_CHANGED, {
                scene: this.sceneManager.getCurrentScene(),
                sceneKey: initialSceneKey,
                transitionData: options?.data
            } as SceneChangedEventData);
        } else {
            console.error(`Failed to start game at scene '${initialSceneKey}'`);
        }

        return success;
    }

    /**
     * Ukončí běžící hru
     *
     * @param reason Volitelný důvod ukončení
     * @param data Volitelná dodatečná data
     */
    public end(reason?: string, data: Record<string, any> = {}): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;

        // Emitování události konce hry
        this.eventEmitter.emit(GameEngineEvents.GAME_ENDED, {
            reason,
            ...data
        } as GameEndedEventData);
    }

    /**
     * Přesune hru na novou scénu
     *
     * @param sceneKey Klíč cílové scény
     * @param options Volitelné možnosti přechodu
     * @returns Promise, který se vyřeší, když je přechod dokončen
     */
    public async transitionToScene(
        sceneKey: SceneKey,
        options?: SceneTransitionOptions
    ): Promise<boolean> {
        if (!this.isRunning) {
            console.warn('Cannot transition: game is not running. Call start() first.');
            return false;
        }

        const previousSceneKey = this.sceneManager.getCurrentSceneKey();
        const previousScene = this.sceneManager.getCurrentScene();

        // Aplikace efektů, pokud existují
        if (options?.effects && options.effects.length > 0) {
            this.applyEffects(options.effects);
        }

        // Provedení přechodu
        const success = await this.sceneManager.transitionToScene(
            sceneKey,
            this.stateManager.getState(),
            this
        );

        if (success) {
            // Emitování události změny scény
            this.eventEmitter.emit(GameEngineEvents.SCENE_CHANGED, {
                scene: this.sceneManager.getCurrentScene(),
                sceneKey,
                previousScene,
                previousSceneKey,
                transitionData: options?.data
            } as SceneChangedEventData);
        }

        return success;
    }

    /**
     * Aplikuje efekty na herní stav
     *
     * @param effects Efekty k aplikaci
     */
    public applyEffects(effects: Effect[]): void {
        if (!effects || effects.length === 0) return;

        const currentState = this.stateManager.getState();
        const newState = this.effectManager.applyEffects(effects, currentState);

        this.stateManager.setState(newState);

        // Emitování události změny stavu
        this.eventEmitter.emit(GameEngineEvents.STATE_CHANGED, newState);

        // Emitování události aplikace efektů
        this.eventEmitter.emit(GameEngineEvents.EFFECT_APPLIED, {
            effect: effects.length === 1 ? effects[0] : { type: 'batch', effects },
            previousState: currentState,
            newState
        } as EffectAppliedEventData);
    }

    /**
     * Aplikuje jeden efekt na herní stav
     *
     * @param effect Efekt k aplikaci
     */
    public applyEffect(effect: Effect): void {
        if (!effect) return;

        const currentState = this.stateManager.getState();
        const newState = this.effectManager.applyEffect(effect, currentState);

        this.stateManager.setState(newState);

        // Emitování události změny stavu
        this.eventEmitter.emit(GameEngineEvents.STATE_CHANGED, newState);

        // Emitování události aplikace efektu
        this.eventEmitter.emit(GameEngineEvents.EFFECT_APPLIED, {
            effect,
            previousState: currentState,
            newState
        } as EffectAppliedEventData);
    }

    /**
     * Registruje obsah s příslušným loaderem
     *
     * @param contentDefinition Definice obsahu
     * @returns True, pokud byla registrace úspěšná
     */
    public registerContent<T extends object>(
        contentDefinition: ContentDefinition<T>
    ): boolean {
        const { type, content } = contentDefinition;
        const loader = this.loaderRegistry.getLoader(type);

        if (!loader) {
            console.warn(`No loader registered for content type '${type}'`);
            return false;
        }

        loader.registerContent(content);
        return true;
    }

    /**
     * Získá loader obsahu podle typu
     *
     * @param type Typ obsahu
     * @returns Loader pro daný typ obsahu nebo undefined
     */
    public getLoader<T extends object, K extends string = string>(
        type: string
    ): GenericContentLoader<T, K> | undefined {
        return this.loaderRegistry.getLoader<T, K>(type);
    }

    /**
     * Registruje posluchače události
     *
     * @param eventType Typ události
     * @param listener Funkce, která bude volána při události
     */
    public on(eventType: GameEventType, listener: EventListener): void {
        this.eventEmitter.on(eventType, listener);
    }

    /**
     * Odregistruje posluchače události
     *
     * @param eventType Typ události
     * @param listener Funkce, která byla zaregistrována
     */
    public off(eventType: GameEventType, listener: EventListener): void {
        this.eventEmitter.off(eventType, listener);
    }

    /**
     * Emituje událost
     *
     * @param eventType Typ události
     * @param data Volitelná data události
     */
    public emit(eventType: GameEventType, data?: any): void {
        this.eventEmitter.emit(eventType, data);
    }

    /**
     * Vrátí aktuální herní stav
     *
     * @returns Aktuální herní stav
     */
    public getState(): GameState {
        return this.stateManager.getState();
    }

    /**
     * Vrátí aktuální scénu
     *
     * @returns Aktuální scéna nebo null
     */
    public getCurrentScene(): Scene | null {
        return this.sceneManager.getCurrentScene();
    }

    /**
     * Vrátí klíč aktuální scény
     *
     * @returns Klíč aktuální scény nebo null
     */
    public getCurrentSceneKey(): SceneKey | null {
        return this.sceneManager.getCurrentSceneKey();
    }

    /**
     * Vrátí verzi enginu
     *
     * @returns Verze enginu
     */
    public getVersion(): string {
        return this.version;
    }

    /**
     * Kontroluje, zda je hra spuštěna
     *
     * @returns True, pokud je hra spuštěna
     */
    public isGameRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Vrátí správce stavu
     *
     * @returns Správce stavu
     */
    public getStateManager(): GameStateManager {
        return this.stateManager;
    }

    /**
     * Vrátí správce scén
     *
     * @returns Správce scén
     */
    public getSceneManager(): SceneManager {
        return this.sceneManager;
    }

    /**
     * Vrátí správce efektů
     *
     * @returns Správce efektů
     */
    public getEffectManager(): EffectManager {
        return this.effectManager;
    }

    /**
     * Vrátí správce pluginů
     *
     * @returns Správce pluginů
     */
    public getPluginManager(): PluginManager {
        return this.pluginManager;
    }

    /**
     * Vrátí registr loaderů obsahu
     *
     * @returns Registr loaderů obsahu
     */
    public getLoaderRegistry(): LoaderRegistry {
        return this.loaderRegistry;
    }

    /**
     * Vrátí správce ukládání
     *
     * @returns Správce ukládání
     */
    public getSaveManager(): SaveManager {
        return this.saveManager;
    }


    /**
     * Vrátí event emitter
     *
     * @returns Event emitter
     */
    public getEventEmitter(): EventEmitter {
        return this.eventEmitter;
    }

    /**
     * Registruje plugin
     *
     * @param plugin Plugin k registraci
     * @returns Promise, který se vyřeší na true, pokud byl plugin úspěšně registrován
     */
    public async registerPlugin(plugin: Plugin): Promise<boolean> {
        return await this.pluginManager.registerPlugin(plugin);
    }

    /**
     * Odregistruje plugin
     *
     * @param pluginName Název pluginu
     * @returns Promise, který se vyřeší na true, pokud byl plugin úspěšně odregistrován
     */
    public async unregisterPlugin(pluginName: string): Promise<boolean> {
        return await this.pluginManager.unregisterPlugin(pluginName);
    }

    /**
     * Získá plugin podle názvu
     *
     * @param pluginName Název pluginu
     * @returns Plugin nebo undefined
     */
    public getPlugin<T extends Plugin>(pluginName: string): T | undefined {
        return this.pluginManager.getPlugin<T>(pluginName);
    }

    /**
     * Uloží aktuální stav hry
     *
     * @param saveId ID uložené hry
     * @param options Volitelné možnosti
     * @returns Promise, který se vyřeší na true, pokud bylo uložení úspěšné
     */
    public async saveGame(saveId: string, options = {}): Promise<boolean> {
        return await this.saveManager.save(saveId, options);
    }

    /**
     * Načte uloženou hru
     *
     * @param saveId ID uložené hry
     * @returns Promise, který se vyřeší na true, pokud bylo načtení úspěšné
     */
    public async loadGame(saveId: string): Promise<boolean> {
        return await this.saveManager.load(saveId);
    }

    /**
     * Restartuje engine s novým stavem
     *
     * @param options Volitelné možnosti restartu
     * @returns Promise, který se vyřeší, když je restart dokončen
     */
    public async restart(options: {
        initialState?: Partial<GameState>;
        initialSceneKey?: SceneKey;
    } = {}): Promise<boolean> {
        // Ukončíme aktuální hru, pokud běží
        if (this.isRunning) {
            this.end('restart');
        }

        // Resetujeme stav
        if (options.initialState) {
            this.stateManager.resetState(options.initialState);
        } else {
            this.stateManager.resetState();
        }

        // Určíme počáteční scénu
        const initialSceneKey = options.initialSceneKey || this.getCurrentSceneKey() || 'start';

        // Spustíme hru znovu
        return await this.start(initialSceneKey);
    }
}