// src/core/PluginManager.ts

import { Plugin } from '../types';
import { GameEngine } from './GameEngine';

/**
 * Správce pluginů pro herní engine
 *
 * Zodpovídá za registraci, inicializaci a správu pluginů
 * připojených k hernímu enginu.
 */
export class PluginManager {
  /** Reference na herní engine */
  private engine: GameEngine;

  /** Mapa registrovaných pluginů podle názvu */
  private plugins: Map<string, Plugin> = new Map();

  /**
   * Vytvoří novou instanci PluginManager
   *
   * @param engine Reference na herní engine
   */
  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * Registruje plugin v herním enginu
   *
   * @param plugin Plugin k registraci
   * @returns True pokud byl plugin úspěšně registrován, false pokud plugin se stejným názvem již existuje
   */
  public registerPlugin(plugin: Plugin): boolean {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin with name '${plugin.name}' is already registered.`);
      return false;
    }

    this.plugins.set(plugin.name, plugin);

    // Inicializace pluginu
    try {
      plugin.initialize(this.engine);
      console.log(`Plugin '${plugin.name}' successfully registered and initialized.`);
      return true;
    } catch (error) {
      console.error(`Error initializing plugin '${plugin.name}':`, error);
      this.plugins.delete(plugin.name);
      return false;
    }
  }

  /**
   * Odregistruje plugin z herního enginu
   *
   * @param pluginName Název pluginu k odregistrování
   * @returns True pokud byl plugin úspěšně odregistrován, false pokud plugin nebyl nalezen
   */
  public unregisterPlugin(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      console.warn(`Plugin with name '${pluginName}' is not registered.`);
      return false;
    }

    // Vyčištění zdrojů pluginu
    try {
      if (plugin.destroy) {
        plugin.destroy();
      }

      this.plugins.delete(pluginName);
      console.log(`Plugin '${pluginName}' successfully unregistered.`);
      return true;
    } catch (error) {
      console.error(`Error destroying plugin '${pluginName}':`, error);
      // Plugin zůstává registrován v případě chyby
      return false;
    }
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
   * Kontroluje, zda je plugin registrován
   *
   * @param pluginName Název pluginu
   * @returns True pokud je plugin registrován, jinak false
   */
  public hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Vrátí počet registrovaných pluginů
   *
   * @returns Počet registrovaných pluginů
   */
  public getPluginCount(): number {
    return this.plugins.size;
  }
}