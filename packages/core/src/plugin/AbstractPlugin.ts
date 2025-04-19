import { GameEngine } from '../engine/GameEngine';
import { Plugin, PluginOptions } from './types';
import { GenericContentLoader } from '../content/GenericContentLoader';
import { Effect, EffectProcessor } from '../effect/types';
import { GameState } from '../state/types'; // GameState zůstává ze state/types
import { GameEventType, EventListener } from '../event/types'; // Opravený import
import { SceneKey, SceneTransitionOptions } from '../scene/types'; // Přidán import SceneTransitionOptions

/**
 * Abstraktní základní třída pro pluginy
 */
export abstract class AbstractPlugin<Options extends PluginOptions = PluginOptions> implements Plugin {
    public readonly name: string;
    protected options: Options;
    protected engine: GameEngine | null = null;
    protected loaders: Map<string, GenericContentLoader<any>> = new Map();
    protected registeredEffects: Set<string> = new Set();
    private eventListeners: Map<GameEventType, Set<EventListener>> = new Map();

    constructor(name: string, options: Options) {
        this.name = name;
        this.options = options;
        this.setupLoaders();
    }

    protected setupLoaders(): void {
        // Přepište v potomkovi pro registraci specifických loaderů
    }

    public async initialize(engine: GameEngine): Promise<void> {
        this.engine = engine;

        this.loaders.forEach((loader, type) => {
            engine.getLoaderRegistry().registerLoader(type, loader);
        });

        await this.registerContent();
        this.registerEventHandlers();
        this.setupEffectProcessors(); // <-- Přejmenovaná metoda
        await this.onInitialize();
    }

    protected async registerContent(): Promise<void> {
        // Přepište v potomkovi pro registraci specifického obsahu
    }

    protected registerEventHandlers(): void {
        // Přepište v potomkovi pro registraci specifických posluchačů událostí
    }

    /**
     * Nastavuje (setup) procesory efektů specifické pro plugin.
     * Přepište tuto metodu pro registraci procesorů specifických pro plugin.
     * Uvnitř této metody můžete volat `this.registerEffectProcessors(...)` s mapou procesorů.
     */
    protected setupEffectProcessors(): void { // <-- PŘEJMENOVANÁ HOOK METODA
        // Přepište v potomkovi pro registraci specifických procesorů efektů
        // Příklad v potomkovi:
        // const myProcessors = { 'myEffect': (effect, state) => { ... } };
        // this.registerEffectProcessors(myProcessors);
    }


    protected async onInitialize(): Promise<void> {
        // Přepište v potomkovi pro logiku specifickou pro plugin
    }

    public async destroy(): Promise<void> {
        if (this.engine) {
            this.unregisterEventHandlers();
            this.unregisterEffectProcessors();
            await this.onDestroy();

            this.loaders.forEach((_, type) => {
                this.engine?.getLoaderRegistry().removeLoader(type);
            });
            this.engine = null;
        }
    }

    protected unregisterEventHandlers(): void {
        if (this.engine) {
            this.eventListeners.forEach((listeners, eventType) => {
                listeners.forEach(listener => {
                    // Použijeme obecný emitter pro odregistraci
                    this.engine?.getGenericEventEmitter().off(eventType, listener);
                });
            });
            this.eventListeners.clear();
        }
    }

    protected unregisterEffectProcessors(): void {
        if (this.engine) {
            this.engine.getEffectManager().unregisterNamespace(this.name);
            this.registeredEffects.clear();
        }
    }

    protected async onDestroy(): Promise<void> {
        // Přepište v potomkovi pro logiku čištění specifickou pro plugin
    }

    protected getState(): GameState | undefined {
        return this.engine?.getState();
    }

    protected getLoader<T extends object, K extends string = string>(type: string): GenericContentLoader<T, K> | undefined {
        return this.engine?.getLoaderRegistry().getLoader<T, K>(type);
    }

    private namespaceEffectType(effectType: string): string {
        // Jednoduchý check, zda už namespace obsahuje - pro případ volání s již namespacovaným typem
        return effectType.includes(':') ? effectType : `${this.name}:${effectType}`;
    }

    protected registerEffectProcessor(effectType: string, processor: EffectProcessor): void {
        if (this.engine) {
            const namespacedType = this.namespaceEffectType(effectType);
            // Registrace přes EffectManager s namespacovaným typem
            this.engine.getEffectManager().registerEffectProcessor(namespacedType, processor);
            this.registeredEffects.add(namespacedType); // Sledujeme namespacovaný typ
        }
    }

    /**
     * Registruje více procesorů efektů najednou s automatickým namespacingem.
     * Tuto metodu volejte z `setupEffectProcessors` nebo `onInitialize`.
     *
     * @param processors Objekt mapující typy efektů na procesory
     */
    protected registerEffectProcessors(processors: Record<string, EffectProcessor>): void { // <-- HELPER METODA ZŮSTÁVÁ
        if (!this.engine) return;

        const namespacedProcessors: Record<string, EffectProcessor> = {};
        for (const [type, processor] of Object.entries(processors)) {
            const namespacedType = this.namespaceEffectType(type);
            namespacedProcessors[namespacedType] = processor;
            this.registeredEffects.add(namespacedType);
        }
        // Registrace přes EffectManager
        this.engine.getEffectManager().registerEffectProcessors(namespacedProcessors);
    }


    protected emitNamespacedEvent(eventType: string, data?: any): void {
        if (this.engine) {
            const namespacedType = eventType.includes(':') ? eventType : `${this.name}:${eventType}`;
            // Použijeme obecný emit enginu
            this.engine.emit(namespacedType, data);
        }
    }

    protected registerEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Registrace přes obecný emitter enginu
            this.engine.getGenericEventEmitter().on(eventType, listener);
            if (!this.eventListeners.has(eventType)) {
                this.eventListeners.set(eventType, new Set());
            }
            this.eventListeners.get(eventType)!.add(listener);
        }
    }

    protected unregisterEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Odregistrace přes obecný emitter enginu
            this.engine.getGenericEventEmitter().off(eventType, listener);
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.eventListeners.delete(eventType);
                }
            }
        }
    }

    protected async transitionToScene(
        sceneKey: SceneKey,
        options?: SceneTransitionOptions // Použij importovaný typ
    ): Promise<boolean> {
        if (!this.engine) return false;
        return await this.engine.transitionToScene(sceneKey, options);
    }

    protected applyEffect(effect: Effect): void {
        if (!this.engine) return;
        this.engine.applyEffect(effect);
    }

    protected applyEffects(effects: Effect[]): void {
        if (!this.engine) return;
        this.engine.applyEffects(effects);
    }
}