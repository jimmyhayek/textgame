export type { Plugin, PluginOptions } from './types';

export { PluginManager } from './PluginManager';
export { AbstractPlugin } from './AbstractPlugin';

export const CORE_PLUGIN_EVENTS = {
    REGISTERED: 'plugin:registered',
    UNREGISTERED: 'plugin:unregistered',
    INITIALIZED: 'plugin:initialized'
} as const;