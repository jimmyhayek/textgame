import { GameEngine } from '../engine/GameEngine';
import { Plugin, PluginOptions } from './types';
import { GenericContentLoader } from '../content/GenericContentLoader';
import { Effect, EffectProcessor } from '../effect/types';
import { GameState, GameEventType, EventListener } from '../state/types';
import { SceneKey } from '../scene/types';

/**
 * Abstraktní základní třída pro pluginy
 * Poskytuje společnou funkcionalitu a strukturu pro všechny pluginy
 */
export abstract class AbstractPlugin<Options extends PluginOptions = PluginOptions> implements Plugin {
    /** Název pluginu */
    public readonly name: string;

    /** Možnosti konfigurace pluginu */
    protected options: Options;

    /** Reference na herní engine */
    protected engine: GameEngine | null = null;

    /** Loadery obsahu používané tímto pluginem */
    protected loaders: Map<string, GenericContentLoader<any>> = new Map();

    /** Registrované efekty s jmenným prostorem tohoto pluginu */
    protected registeredEffects: Set<string> = new Set();

    /** Registrované posluchače událostí pro snadnou odregistraci */
    private eventListeners: Map<GameEventType, Set<EventListener>> = new Map();

    /**
     * Vytvoří novou instanci pluginu
     *
     * @param name Název pluginu
     * @param options Možnosti konfigurace pluginu
     */
    constructor(name: string, options: Options) {
        this.name = name;
        this.options = options;
        this.setupLoaders();
    }

    /**
     * Nastaví loadery obsahu používané tímto pluginem
     * Přepište tuto metodu pro inicializaci specifických loaderů pluginu
     */
    protected setupLoaders(): void {
        // Přepište v potomkovi pro registraci specifických loaderů
    }

    /**
     * Inicializuje plugin s herním enginem
     * Tato metoda je nyní asynchronní pro podporu asynchronní inicializace
     *
     * @param engine Instance herního enginu
     */
    public async initialize(engine: GameEngine): Promise<void> {
        this.engine = engine;

        // Registrace všech loaderů v enginu
        this.loaders.forEach((loader, type) => {
            engine.getLoaderRegistry().registerLoader(type, loader);
        });

        // Registrace obsahu
        await this.registerContent();

        // Registrace posluchačů událostí
        this.registerEventHandlers();

        // Registrace procesorů efektů
        this.registerEffectProcessors();

        // Spuštění inicializace specifické pro plugin
        await this.onInitialize();
    }

    /**
     * Registruje obsah v enginu
     * Přepište tuto metodu pro registraci obsahu specifického pro plugin
     * Nyní asynchronní pro podporu lazy loadingu
     */
    protected async registerContent(): Promise<void> {
        // Přepište v potomkovi pro registraci specifického obsahu
    }

    /**
     * Registruje posluchače událostí v enginu
     * Přepište tuto metodu pro registraci posluchačů specifických pro plugin
     */
    protected registerEventHandlers(): void {
        // Přepište v potomkovi pro registraci specifických posluchačů událostí
    }

    /**
     * Registruje procesory efektů v enginu
     * Přepište tuto metodu pro registraci procesorů specifických pro plugin
     */
    protected registerEffectProcessors(): void {
        // Přepište v potomkovi pro registraci specifických procesorů efektů
    }

    /**
     * Volá se během inicializace pluginu
     * Přepište tuto metodu pro logiku inicializace specifické pro plugin
     * Nyní asynchronní pro podporu asynchronní inicializace
     */
    protected async onInitialize(): Promise<void> {
        // Přepište v potomkovi pro logiku specifickou pro plugin
    }

    /**
     * Vyčistí zdroje pluginu
     * Volá se při odregistraci pluginu
     */
    public async destroy(): Promise<void> {
        // Odregistrace všech posluchačů událostí
        if (this.engine) {
            this.unregisterEventHandlers();
            this.unregisterEffectProcessors();

            // Spuštění čištění specifického pro plugin
            await this.onDestroy();

            // Odregistrace loaderů registrovaných tímto pluginem
            this.loaders.forEach((_, type) => {
                this.engine?.getLoaderRegistry().removeLoader(type);
            });

            this.engine = null;
        }
    }

    /**
     * Odregistruje posluchače událostí z enginu
     */
    protected unregisterEventHandlers(): void {
        if (this.engine) {
            // Odregistrace všech sledovaných posluchačů událostí
            this.eventListeners.forEach((listeners, eventType) => {
                listeners.forEach(listener => {
                    this.engine?.getEventEmitter().off(eventType, listener);
                });
            });
            this.eventListeners.clear();
        }
    }

    /**
     * Odregistruje procesory efektů
     */
    protected unregisterEffectProcessors(): void {
        if (this.engine) {
            // Odregistrace všech efektů pomocí jmenného prostoru
            this.engine.getEffectManager().unregisterNamespace(this.name);
            this.registeredEffects.clear();
        }
    }

    /**
     * Volá se během čištění pluginu
     * Přepište tuto metodu pro logiku čištění specifickou pro plugin
     * Nyní asynchronní pro podporu asynchronního čištění
     */
    protected async onDestroy(): Promise<void> {
        // Přepište v potomkovi pro logiku čištění specifickou pro plugin
    }

    /**
     * Získá aktuální herní stav
     *
     * @returns Aktuální herní stav nebo undefined pokud plugin není inicializován
     */
    protected getState(): GameState | undefined {
        return this.engine?.getState();
    }

    /**
     * Získá loader obsahu podle typu
     *
     * @param type Typ obsahu
     * @returns Loader obsahu nebo undefined pokud nenalezen
     */
    protected getLoader<T extends object, K extends string = string>(type: string): GenericContentLoader<T, K> | undefined {
        return this.engine?.getLoaderRegistry().getLoader<T, K>(type);
    }

    /**
     * Přidá namespace prefix k typu efektu, pokud je potřeba
     *
     * @param effectType Typ efektu k prefixování
     * @returns Prefixovaný typ efektu
     */
    private namespaceEffectType(effectType: string): string {
        return effectType.includes(':') ? effectType : `${this.name}:${effectType}`;
    }

    /**
     * Registruje procesor efektu s automatickým prefixem namespace
     *
     * @param effectType Typ efektu
     * @param processor Funkce pro zpracování efektu
     */
    protected registerEffectProcessor(effectType: string, processor: EffectProcessor): void {
        if (this.engine) {
            const namespacedType = this.namespaceEffectType(effectType);
            this.engine.getEffectManager().registerEffectProcessor(namespacedType, processor);
            this.registeredEffects.add(namespacedType);
        }
    }

    /**
     * Registruje více procesorů efektů najednou
     *
     * @param processors Objekt mapující typy efektů na procesory
     */
    protected registerEffectProcessors(processors: Record<string, EffectProcessor>): void {
        if (!this.engine) return;

        // Přidání namespace ke všem typům efektů
        const namespacedProcessors: Record<string, EffectProcessor> = {};

        for (const [type, processor] of Object.entries(processors)) {
            const namespacedType = this.namespaceEffectType(type);
            namespacedProcessors[namespacedType] = processor;
            this.registeredEffects.add(namespacedType);
        }

        this.engine.getEffectManager().registerEffectProcessors(namespacedProcessors);
    }

    /**
     * Emituje událost s prefixem namespace
     *
     * @param eventType Typ události
     * @param data Volitelná data události
     */
    protected emitNamespacedEvent(eventType: string, data?: any): void {
        if (this.engine) {
            const namespacedType = eventType.includes(':') ? eventType : `${this.name}:${eventType}`;
            this.engine.getEventEmitter().emit(namespacedType, data);
        }
    }

    /**
     * Registruje posluchače události a sleduje ho pro automatickou odregistraci
     *
     * @param eventType Typ události
     * @param listener Funkce volaná při události
     */
    protected registerEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Registrace v enginu
            this.engine.getEventEmitter().on(eventType, listener);

            // Sledování pro pozdější odregistraci
            if (!this.eventListeners.has(eventType)) {
                this.eventListeners.set(eventType, new Set());
            }
            this.eventListeners.get(eventType)!.add(listener);
        }
    }

    /**
     * Odregistruje posluchače události
     *
     * @param eventType Typ události
     * @param listener Funkce, která byla registrována
     */
    protected unregisterEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Odregistrace z enginu
            this.engine.getEventEmitter().off(eventType, listener);

            // Odstranění ze sledování
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.eventListeners.delete(eventType);
                }
            }
        }
    }

    /**
     * Přesune hru do zadané scény pomocí enginu
     * Pohodlná metoda pro použití v pluginech
     *
     * @param sceneKey Klíč cílové scény
     * @param options Volitelné možnosti přechodu
     * @returns Promise který se vyřeší na true, pokud byl přechod úspěšný
     */
    protected async transitionToScene(
        sceneKey: SceneKey,
        options?: {
            effects?: Effect[],
            data?: any
        }
    ): Promise<boolean> {
        if (!this.engine) return false;
        return await this.engine.transitionToScene(sceneKey, options);
    }

    /**
     * Aplikuje efekt na herní stav pomocí enginu
     * Pohodlná metoda pro použití v pluginech
     *
     * @param effect Efekt k aplikaci
     */
    protected applyEffect(effect: Effect): void {
        if (!this.engine) return;
        this.engine.applyEffect(effect);
    }

    /**
     * Aplikuje více efektů na herní stav pomocí enginu
     * Pohodlná metoda pro použití v pluginech
     *
     * @param effects Efekty k aplikaci
     */
    protected applyEffects(effects: Effect[]): void {
        if (!this.engine) return;
        this.engine.applyEffects(effects);
    }
}