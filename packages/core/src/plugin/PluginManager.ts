import { EventEmitter } from '../event/EventEmitter';
import {
  Plugin,
  PluginRegistryOptions,
  PluginEvents,
  PluginRegisteredEventData,
  PluginUnregisteredEventData,
  PluginInitializedEventData,
  PluginErrorEventData
} from './types';
import { GameEngine } from '../engine/GameEngine';

/**
 * Správce pluginů pro herní engine
 *
 * Zodpovídá za registraci, inicializaci a správu pluginů
 * připojených k hernímu enginu.
 */
export class PluginManager {
  /**
   * Reference na herní engine
   */
  private engine: GameEngine;

  /**
   * Mapa registrovaných pluginů podle názvu
   */
  private plugins: Map<string, Plugin> = new Map();

  /**
   * Množina aktivních (inicializovaných) pluginů
   */
  private activePlugins: Set<string> = new Set();

  /**
   * Event emitter pro události pluginů
   */
  private eventEmitter: EventEmitter;

  /**
   * Možnosti konfigurace manažeru pluginů
   */
  private options: PluginRegistryOptions;

  /**
   * Vytvoří novou instanci PluginManager
   *
   * @param engine Reference na herní engine
   * @param eventEmitter Event emitter pro události
   * @param options Možnosti konfigurace
   */
  constructor(
      engine: GameEngine,
      eventEmitter: EventEmitter,
      options: PluginRegistryOptions = {}
  ) {
    this.engine = engine;
    this.eventEmitter = eventEmitter;
    this.options = {
      autoActivate: true,
      allowOverride: false,
      ...options
    };
  }

  /**
   * Registruje plugin v herním enginu
   *
   * @param plugin Plugin k registraci
   * @param activate Zda aktivovat plugin ihned po registraci
   * @returns Promise který se vyřeší na true, pokud byl plugin úspěšně registrován
   */
  public async registerPlugin(
      plugin: Plugin,
      activate?: boolean
  ): Promise<boolean> {
    const shouldActivate = activate ?? this.options.autoActivate;

    // Kontrola, zda plugin s tímto názvem již existuje
    if (this.plugins.has(plugin.name) && !this.options.allowOverride) {
      console.warn(`Plugin with name '${plugin.name}' is already registered.`);
      return false;
    }

    // Registrace pluginu
    this.plugins.set(plugin.name, plugin);

    // Emitování události registrace
    this.eventEmitter.emit(PluginEvents.REGISTERED, {
      name: plugin.name,
      plugin
    } as PluginRegisteredEventData);

    // Aktivace pluginu, pokud je požadováno
    if (shouldActivate) {
      return await this.activatePlugin(plugin.name);
    }

    return true;
  }

  /**
   * Registruje více pluginů najednou
   *
   * @param plugins Pole pluginů k registraci
   * @param activate Zda aktivovat pluginy ihned po registraci
   * @returns Promise který se vyřeší na počet úspěšně registrovaných pluginů
   */
  public async registerPlugins(
      plugins: Plugin[],
      activate?: boolean
  ): Promise<number> {
    let successCount = 0;

    for (const plugin of plugins) {
      const success = await this.registerPlugin(plugin, activate);
      if (success) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * Aktivuje registrovaný plugin
   *
   * @param pluginName Název pluginu k aktivaci
   * @returns Promise který se vyřeší na true, pokud byl plugin úspěšně aktivován
   */
  public async activatePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      console.warn(`Plugin with name '${pluginName}' is not registered.`);
      return false;
    }

    // Pokud je plugin již aktivní, vrátíme true
    if (this.activePlugins.has(pluginName)) {
      return true;
    }

    // Inicializace pluginu
    try {
      await Promise.resolve(plugin.initialize(this.engine));

      // Označení pluginu jako aktivního
      this.activePlugins.add(pluginName);

      // Emitování události inicializace
      this.eventEmitter.emit(PluginEvents.INITIALIZED, {
        name: pluginName,
        plugin
      } as PluginInitializedEventData);

      console.log(`Plugin '${pluginName}' successfully initialized.`);
      return true;
    } catch (error) {
      // Emitování události chyby
      this.eventEmitter.emit(PluginEvents.ERROR, {
        name: pluginName,
        plugin,
        error,
        phase: 'initialize'
      } as PluginErrorEventData);

      console.error(`Error initializing plugin '${pluginName}':`, error);
      return false;
    }
  }

  /**
   * Deaktivuje aktivní plugin
   *
   * @param pluginName Název pluginu k deaktivaci
   * @returns Promise který se vyřeší na true, pokud byl plugin úspěšně deaktivován
   */
  public async deactivatePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      console.warn(`Plugin with name '${pluginName}' is not registered.`);
      return false;
    }

    // Pokud plugin není aktivní, vrátíme true
    if (!this.activePlugins.has(pluginName)) {
      return true;
    }

    // Volání destroy metody pluginu, pokud existuje
    if (plugin.destroy) {
      try {
        await Promise.resolve(plugin.destroy());
      } catch (error) {
        // Emitování události chyby
        this.eventEmitter.emit(PluginEvents.ERROR, {
          name: pluginName,
          plugin,
          error,
          phase: 'destroy'
        } as PluginErrorEventData);

        console.error(`Error destroying plugin '${pluginName}':`, error);
        return false;
      }
    }

    // Odstranění pluginu ze seznamu aktivních
    this.activePlugins.delete(pluginName);

    return true;
  }

  /**
   * Odregistruje plugin z herního enginu
   *
   * @param pluginName Název pluginu k odregistrování
   * @returns Promise který se vyřeší na true, pokud byl plugin úspěšně odregistrován
   */
  public async unregisterPlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      console.warn(`Plugin with name '${pluginName}' is not registered.`);
      return false;
    }

    // Nejprve deaktivujeme plugin, pokud je aktivní
    if (this.activePlugins.has(pluginName)) {
      const success = await this.deactivatePlugin(pluginName);
      if (!success) {
        return false;
      }
    }

    // Odregistrace pluginu
    this.plugins.delete(pluginName);

    // Emitování události odregistrace
    this.eventEmitter.emit(PluginEvents.UNREGISTERED, {
      name: pluginName
    } as PluginUnregisteredEventData);

    console.log(`Plugin '${pluginName}' successfully unregistered.`);
    return true;
  }

  /**
   * Získá plugin podle názvu
   *
   * @template T Typ očekávaného pluginu
   * @param pluginName Název pluginu
   * @returns Plugin daného typu nebo undefined pokud plugin nebyl nalezen
   */
  public getPlugin<T extends Plugin = Plugin>(pluginName: string): T | undefined {
    return this.plugins.get(pluginName) as T | undefined;
  }

  /**
   * Vrátí názvy všech registrovaných pluginů
   *
   * @returns Pole názvů registrovaných pluginů
   */
  public getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Vrátí všechny registrované pluginy
   *
   * @returns Pole registrovaných pluginů
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Vrátí názvy všech aktivních pluginů
   *
   * @returns Pole názvů aktivních pluginů
   */
  public getActivePluginNames(): string[] {
    return Array.from(this.activePlugins);
  }

  /**
   * Vrátí všechny aktivní pluginy
   *
   * @returns Pole aktivních pluginů
   */
  public getActivePlugins(): Plugin[] {
    return Array.from(this.activePlugins).map(name => this.plugins.get(name)!);
  }

  /**
   * Kontroluje, zda je plugin registrován
   *
   * @param pluginName Název pluginu
   * @returns True pokud je plugin registrován, jinak false
   */
  public hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Kontroluje, zda je plugin aktivní
   *
   * @param pluginName Název pluginu
   * @returns True pokud je plugin aktivní, jinak false
   */
  public isPluginActive(pluginName: string): boolean {
    return this.activePlugins.has(pluginName);
  }

  /**
   * Vrátí počet registrovaných pluginů
   *
   * @returns Počet registrovaných pluginů
   */
  public getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Vrátí počet aktivních pluginů
   *
   * @returns Počet aktivních pluginů
   */
  public getActivePluginCount(): number {
    return this.activePlugins.size;
  }

  /**
   * Deaktivuje všechny aktivní pluginy
   *
   * @returns Promise který se vyřeší, když jsou všechny pluginy deaktivovány
   */
  public async deactivateAllPlugins(): Promise<void> {
    const activePluginNames = Array.from(this.activePlugins);

    for (const pluginName of activePluginNames) {
      await this.deactivatePlugin(pluginName);
    }
  }

  /**
   * Nastaví novou instanci enginu pro všechny pluginy
   * Použije se například při resetování či restartování enginu
   *
   * @param engine Nová instance herního enginu
   */
  public setEngine(engine: GameEngine): void {
    this.engine = engine;

    // Reinicializace všech aktivních pluginů s novým enginem
    this.resetPlugins();
  }

  /**
   * Resetuje všechny aktivní pluginy
   * Deaktivuje všechny pluginy a znovu je aktivuje
   *
   * @returns Promise který se vyřeší na true, pokud byly všechny pluginy úspěšně resetovány
   */
  public async resetPlugins(): Promise<boolean> {
    const activePluginNames = Array.from(this.activePlugins);

    // Deaktivujeme všechny pluginy
    await this.deactivateAllPlugins();

    // Opět aktivujeme všechny pluginy, které byly aktivní
    let allSuccessful = true;
    for (const pluginName of activePluginNames) {
      const success = await this.activatePlugin(pluginName);
      if (!success) {
        allSuccessful = false;
      }
    }

    return allSuccessful;
  }
}