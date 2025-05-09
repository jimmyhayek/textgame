// Export typů
export * from './types';

// Export hlavních tříd
export { PluginManager } from './PluginManager';
export { AbstractPlugin } from './AbstractPlugin';

// Export konstant
export const CORE_PLUGIN_EVENTS = {
  REGISTERED: 'plugin:registered',
  UNREGISTERED: 'plugin:unregistered',
  INITIALIZED: 'plugin:initialized',
  ERROR: 'plugin:error',
} as const;

// Export utilit
export {
  createPlugin,
} from './utils';