import { GameEngine } from '../engine/GameEngine';

/**
 * Základní rozhraní pro plugin
 */
export interface Plugin {
  /**
   * Jedinečný název pluginu
   */
  name: string;

  /**
   * Inicializuje plugin a připojí jej k enginu
   * @param engine Instance herního enginu
   */
  initialize: (engine: GameEngine) => Promise<void> | void;

  /**
   * Volitelná metoda pro čištění zdrojů při odstranění pluginu
   */
  destroy?: () => Promise<void> | void;
}

/**
 * Možnosti konfigurace pluginu
 */
export interface PluginOptions {
  /**
   * Indexová signatura pro libovolné konfigurační parametry
   */
  [key: string]: any;
}

/**
 * Možnosti pro registry pluginů
 */
export interface PluginRegistryOptions {
  /**
   * Automaticky aktivovat pluginy při registraci
   * Výchozí: true
   */
  autoActivate?: boolean;

  /**
   * Zda povolit přepsání již registrovaného pluginu
   * Výchozí: false
   */
  allowOverride?: boolean;
}

/**
 * Události emitované systémem pluginů
 */
export enum PluginEvents {
  /**
   * Plugin byl registrován
   */
  REGISTERED = 'plugin:registered',

  /**
   * Plugin byl odregistrován
   */
  UNREGISTERED = 'plugin:unregistered',

  /**
   * Plugin byl inicializován
   */
  INITIALIZED = 'plugin:initialized',

  /**
   * Došlo k chybě při inicializaci pluginu
   */
  ERROR = 'plugin:error'
}

/**
 * Data předávaná při události registrace pluginu
 */
export interface PluginRegisteredEventData {
  /**
   * Název registrovaného pluginu
   */
  name: string;

  /**
   * Instance pluginu
   */
  plugin: Plugin;
}

/**
 * Data předávaná při události odregistrace pluginu
 */
export interface PluginUnregisteredEventData {
  /**
   * Název odregistrovaného pluginu
   */
  name: string;
}

/**
 * Data předávaná při události inicializace pluginu
 */
export interface PluginInitializedEventData {
  /**
   * Název inicializovaného pluginu
   */
  name: string;

  /**
   * Instance pluginu
   */
  plugin: Plugin;
}

/**
 * Data předávaná při události chyby pluginu
 */
export interface PluginErrorEventData {
  /**
   * Název pluginu, který způsobil chybu
   */
  name: string;

  /**
   * Instance pluginu
   */
  plugin: Plugin;

  /**
   * Objekt chyby
   */
  error: Error;

  /**
   * Fáze, ve které nastala chyba (např. "initialize", "destroy")
   */
  phase: string;
}