// src/plugins/AbstractPlugin.ts

import { GameEngine } from '../core/GameEngine';
import { Plugin } from '../types';
import { GenericContentLoader } from '../loaders/GenericContentLoader';
import { Effect, EffectProcessor, GameState, GameEventType, EventListener } from '../types';

/**
 * Základní možnosti pro konfiguraci pluginů
 */
export interface PluginOptions {
    /** Volitelné konfigurační parametry */
    [key: string]: any;
}

/**
 * Abstraktní základní třída pro pluginy
 * Poskytuje společnou funkcionalitu a strukturu pro všechny pluginy
 */
export abstract class AbstractPlugin<Options extends PluginOptions = PluginOptions> implements Plugin {
    /** Název pluginu */
    public readonly name: string;

    /** Možnosti pluginu */
    protected options: Options;

    /** Reference na herní engine */
    protected engine: GameEngine | null = null;

    /** Loadery obsahu používané tímto pluginem */
    protected loaders: Map<string, GenericContentLoader<any>> = new Map();

    /** Registrované efekty s namespace tohoto pluginu */
    protected registeredEffects: Set<string> = new Set();

    /** Registrované event listenery pro snadné odregistrování */
    private eventListeners: Map<GameEventType, Set<EventListener>> = new Map();

    /**
     * Vytvoří novou instanci pluginu
     *
     * @param name Název pluginu
     * @param options Možnosti pluginu
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
        // Přepsat v podtřídě pro registraci specifických loaderů
    }

    /**
     * Inicializuje plugin s herním enginem
     * Tato metoda je nyní asynchronní, aby umožnila async inicializaci
     *
     * @param engine Instance herního enginu
     */
    public async initialize(engine: GameEngine): Promise<void> {
        this.engine = engine;

        // Registrace všech loaderů u enginu
        this.loaders.forEach((loader, type) => {
            engine.getLoaderRegistry().registerLoader(type, loader);
        });

        // Registrace obsahu
        await this.registerContent();

        // Registrace event handlerů
        this.registerEventHandlers();

        // Registrace procesorů efektů
        this.registerEffectProcessors();

        // Spuštění inicializace specifické pro plugin
        await this.onInitialize();
    }

    /**
     * Registruje obsah u enginu
     * Přepište tuto metodu pro registraci obsahu specifického pro plugin
     * Nově asynchronní pro podporu lazy loadingu
     */
    protected async registerContent(): Promise<void> {
        // Přepsat v podtřídě pro registraci specifického obsahu
    }

    /**
     * Registruje handlery událostí u enginu
     * Přepište tuto metodu pro registraci handlerů událostí specifických pro plugin
     */
    protected registerEventHandlers(): void {
        // Přepsat v podtřídě pro registraci specifických handlerů událostí
    }

    /**
     * Registruje procesory efektů u enginu
     * Přepište tuto metodu pro registraci procesorů efektů specifických pro plugin
     */
    protected registerEffectProcessors(): void {
        // Přepsat v podtřídě pro registraci specifických procesorů efektů
    }

    /**
     * Voláno během inicializace pluginu
     * Přepište tuto metodu pro logiku inicializace specifickou pro plugin
     * Nově asynchronní pro podporu async inicializace
     */
    protected async onInitialize(): Promise<void> {
        // Přepsat v podtřídě pro inicializaci specifickou pro plugin
    }

    /**
     * Vyčistí zdroje pluginu
     * Voláno při odregistraci pluginu
     */
    public async destroy(): Promise<void> {
        // Odstranění všech handlerů událostí
        if (this.engine) {
            this.unregisterEventHandlers();
            this.unregisterEffectProcessors();

            // Spuštění vyčištění specifického pro plugin
            await this.onDestroy();

            // Odstranění loaderů registrovaných tímto pluginem
            this.loaders.forEach((_, type) => {
                this.engine?.getLoaderRegistry().removeLoader(type);
            });

            this.engine = null;
        }
    }

    /**
     * Odregistruje handlery událostí z enginu
     */
    protected unregisterEventHandlers(): void {
        if (this.engine) {
            // Odregistrování všech sledovaných event handlerů
            this.eventListeners.forEach((listeners, eventType) => {
                listeners.forEach(listener => {
                    this.engine?.off(eventType, listener);
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
            // Odregistrování všech efektů přes namespace
            this.engine.getEffectManager().unregisterNamespace(this.name);
            this.registeredEffects.clear();
        }
    }

    /**
     * Voláno během vyčištění pluginu
     * Přepište tuto metodu pro logiku vyčištění specifickou pro plugin
     * Nově asynchronní pro podporu async cleanup
     */
    protected async onDestroy(): Promise<void> {
        // Přepsat v podtřídě pro vyčištění specifické pro plugin
    }

    /**
     * Získá aktuální herní stav
     *
     * @returns Aktuální herní stav nebo undefined, pokud plugin není inicializován
     */
    protected getState(): GameState | undefined {
        return this.engine?.getState();
    }

    /**
     * Získá loader obsahu podle typu
     *
     * @param type Typ obsahu
     * @returns Loader obsahu nebo undefined, pokud není nalezen
     */
    protected getLoader<T extends object, K extends string = string>(type: string): GenericContentLoader<T, K> | undefined {
        return this.engine?.getLoader<T, K>(type);
    }

    /**
     * Registruje procesor efektů s automatickým prefixem namespace
     *
     * @param effectType Typ efektu
     * @param processor Funkce pro zpracování efektu
     */
    protected registerEffectProcessor(effectType: string, processor: EffectProcessor): void {
        if (this.engine) {
            // Přidání namespace k typu efektu
            const namespacedType = `${this.name}:${effectType}`;
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
        // Přidáme namespace ke všem typům efektů
        const namespacedProcessors: Record<string, EffectProcessor> = {};

        for (const [type, processor] of Object.entries(processors)) {
            const namespacedType = `${this.name}:${type}`;
            namespacedProcessors[namespacedType] = processor;
            this.registeredEffects.add(namespacedType);
        }

        if (this.engine) {
            this.engine.getEffectManager().registerEffectProcessors(namespacedProcessors);
        }
    }

    /**
     * Aplikuje efekt na herní stav s automatickým prefixem namespace
     *
     * @param effect Efekt, který se má aplikovat
     */
    protected applyEffect(effect: Effect): void {
        if (this.engine) {
            const currentState = this.engine.getState();

            // Přidání namespace k typu efektu, pokud už nemá
            const namespacedEffect = {
                ...effect,
                type: effect.type.includes(':') ? effect.type : `${this.name}:${effect.type}`
            };

            const newState = this.engine.getEffectManager().applyEffect(namespacedEffect, currentState);
            this.engine.getStateManager().setState(newState);
            this.engine.emit('stateChanged', this.engine.getState());
        }
    }

    /**
     * Aplikuje více efektů na herní stav s automatickým prefixem namespace
     *
     * @param effects Pole efektů, které se mají aplikovat
     */
    protected applyEffects(effects: Effect[]): void {
        if (this.engine && effects.length > 0) {
            const currentState = this.engine.getState();

            // Přidání namespace ke všem efektům, které ho nemají
            const namespacedEffects = effects.map(effect => ({
                ...effect,
                type: effect.type.includes(':') ? effect.type : `${this.name}:${effect.type}`
            }));

            const newState = this.engine.getEffectManager().applyEffects(namespacedEffects, currentState);
            this.engine.getStateManager().setState(newState);
            this.engine.emit('stateChanged', this.engine.getState());
        }
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
            this.engine.emit(namespacedType, data);
        }
    }

    /**
     * Registruje listener pro událost a sleduje ho pro automatické odregistrování
     *
     * @param eventType Typ události
     * @param listener Funkce volaná při události
     */
    protected registerEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Registrace u enginu
            this.engine.on(eventType, listener);

            // Sledování pro pozdější odregistrování
            if (!this.eventListeners.has(eventType)) {
                this.eventListeners.set(eventType, new Set());
            }
            this.eventListeners.get(eventType)!.add(listener);
        }
    }

    /**
     * Odregistruje listener pro událost
     *
     * @param eventType Typ události
     * @param listener Funkce, která byla zaregistrována
     */
    protected unregisterEventListener(eventType: GameEventType, listener: EventListener): void {
        if (this.engine) {
            // Odregistrace u enginu
            this.engine.off(eventType, listener);

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
     * Vrátí entity s určitým tagem
     * Helper metoda pro práci s entitami
     *
     * @param tag Tag pro filtrování
     * @returns Pole entit s daným tagem
     */
    protected getEntitiesByTag(tag: string): any[] {
        if (!this.engine) return [];
        return this.engine.getEntityManager().findEntitiesByTag(tag);
    }

    /**
     * Vrátí entity s určitou komponentou
     * Helper metoda pro práci s entitami
     *
     * @param componentName Název komponenty
     * @returns Pole entit s danou komponentou
     */
    protected getEntitiesByComponent(componentName: string): any[] {
        if (!this.engine) return [];
        return this.engine.getEntityManager().findEntitiesByComponent(componentName);
    }

    /**
     * Vrátí entity určitého typu
     * Helper metoda pro práci s entitami
     *
     * @param type Typ entity
     * @returns Pole entit daného typu
     */
    protected getEntitiesByType(type: string): any[] {
        if (!this.engine) return [];
        return this.engine.getEntityManager().findEntitiesByType(type);
    }
}