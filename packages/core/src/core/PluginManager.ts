import { GameEngine } from '../core/GameEngine';
import { Plugin } from '../types';
import { GenericContentLoader } from '../loaders/GenericContentLoader';
import { Effect, EffectProcessor } from '../types/effect';

export interface PluginOptions {
  [key: string]: any;
}

export abstract class AbstractPlugin<Options extends PluginOptions = PluginOptions> implements Plugin {
  public readonly name: string;
  protected options: Options;
  protected engine: GameEngine | null = null;
  protected loaders: Map<string, GenericContentLoader<any>> = new Map();
  protected registeredEffects: Set<string> = new Set();

  constructor(name: string, options: Options) {
    this.name = name;
    this.options = options;
    this.setupLoaders();
  }

  protected setupLoaders(): void {
    // Override in subclass to register specific loaders
  }

  public initialize(engine: GameEngine): void {
    this.engine = engine;

    this.loaders.forEach((loader, type) => {
      engine.getLoaderRegistry().registerLoader(type, loader);
    });

    this.registerContent();
    this.registerEventHandlers();
    this.setupEffectProcessors();
    this.onInitialize();
  }

  protected registerContent(): void {
    // Override in subclass to register specific content
  }

  protected registerEventHandlers(): void {
    // Override in subclass to register specific event handlers
  }

  protected setupEffectProcessors(): void {
    // Override in subclass to register specific effect processors
  }

  protected registerEffectProcessor(effectType: string, processor: EffectProcessor): void {
    if (this.engine) {
      this.engine.getEffectManager().registerEffectProcessor(effectType, processor, this.name);
      this.registeredEffects.add(effectType);
    }
  }

  protected registerEffectProcessors(processors: Record<string, EffectProcessor>): void {
    if (this.engine) {
      this.engine.getEffectManager().registerEffectProcessors(processors, this.name);
      Object.keys(processors).forEach(type => this.registeredEffects.add(type));
    }
  }

  protected onInitialize(): void {
    // Override in subclass for plugin-specific initialization
  }

  public destroy(): void {
    if (this.engine) {
      this.unregisterEventHandlers();
      this.unregisterEffectProcessors();
      this.onDestroy();

      this.loaders.forEach((_, type) => {
        this.engine?.getLoaderRegistry().removeLoader(type);
      });

      this.engine = null;
    }
  }

  protected unregisterEventHandlers(): void {
    // Override in subclass to unregister specific event handlers
  }

  protected unregisterEffectProcessors(): void {
    if (this.engine) {
      // Odregistrování všech efektů přes namespace
      this.engine.getEffectManager().unregisterNamespace(this.name);
    }
  }

  protected onDestroy(): void {
    // Override in subclass for plugin-specific cleanup
  }

  protected getState() {
    return this.engine?.getState();
  }

  protected getLoader<T extends object, K extends string = string>(type: string) {
    return this.engine?.getLoader<T, K>(type);
  }

  protected applyEffect(effect: Effect): void {
    if (this.engine) {
      const currentState = this.engine.getState();
      // Pokud efekt už nemá namespace, přidáme ho
      const namespaceEffect = {
        ...effect,
        type: effect.type.includes(':') ? effect.type : `${this.name}:${effect.type}`
      };
      const newState = this.engine.getEffectManager().applyEffect(namespaceEffect, currentState);
      this.engine.getStateManager().setState(newState);
      this.engine.emit('stateChanged', this.engine.getState());
    }
  }

  protected applyEffects(effects: Effect[]): void {
    if (this.engine && effects.length > 0) {
      const currentState = this.engine.getState();
      // Přidáme namespace ke všem efektům, které ho nemají
      const namespaceEffects = effects.map(effect => ({
        ...effect,
        type: effect.type.includes(':') ? effect.type : `${this.name}:${effect.type}`
      }));
      const newState = this.engine.getEffectManager().applyEffects(namespaceEffects, currentState);
      this.engine.getStateManager().setState(newState);
      this.engine.emit('stateChanged', this.engine.getState());
    }
  }

  protected emit(eventType: string, data?: any): void {
    this.engine?.emit(eventType, data);
  }

  protected on(eventType: string, listener: (data: any) => void): void {
    this.engine?.on(eventType, listener);
  }

  protected off(eventType: string, listener: (data: any) => void): void {
    this.engine?.off(eventType, listener);
  }
}