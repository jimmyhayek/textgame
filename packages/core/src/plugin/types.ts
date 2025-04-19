import { GameEngine } from '../engine/GameEngine';

/** Základní rozhraní pro plugin */
export interface Plugin {
  name: string;
  initialize: (engine: GameEngine) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

/** Možnosti konfigurace pluginu */
export interface PluginOptions {
  [key: string]: any;
}

/** Možnosti pro registry pluginů */
export interface PluginRegistryOptions {
  autoActivate?: boolean;
  allowOverride?: boolean;
}

/** Události emitované systémem pluginů */
export enum PluginEvents {
  REGISTERED = 'plugin:registered',
  UNREGISTERED = 'plugin:unregistered',
  INITIALIZED = 'plugin:initialized',
  ERROR = 'plugin:error'
}

/** Data předávaná při události registrace pluginu */
export interface PluginRegisteredEventData {
  name: string;
  plugin: Plugin;
}

/** Data předávaná při události odregistrace pluginu */
export interface PluginUnregisteredEventData {
  name: string;
}

/** Data předávaná při události inicializace pluginu */
export interface PluginInitializedEventData {
  name: string;
  plugin: Plugin;
}

/** Data předávaná při události chyby pluginu */
export interface PluginErrorEventData {
  name: string;
  plugin: Plugin;
  error: Error | unknown; // Použij 'unknown' pro lepší typování chyb
  phase: 'initialize' | 'destroy' | string; // Fáze může být i jiná
}

/** Mapa událostí pro systém pluginů */
export type PluginEventMap = {
  [PluginEvents.REGISTERED]: PluginRegisteredEventData;
  [PluginEvents.UNREGISTERED]: PluginUnregisteredEventData;
  [PluginEvents.INITIALIZED]: PluginInitializedEventData;
  [PluginEvents.ERROR]: PluginErrorEventData;
};