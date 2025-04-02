import { Plugin } from '../types';
import { GameEngine } from './GameEngine';

export class PluginManager {
    private plugins: Map<string, Plugin> = new Map();
    private engine: GameEngine;

    constructor(engine: GameEngine) {
        this.engine = engine;
    }

    public registerPlugin(plugin: Plugin): void {
        if (this.plugins.has(plugin.name)) {
            console.warn(`Plugin with name '${plugin.name}' is already registered.`);
            return;
        }

        this.plugins.set(plugin.name, plugin);
        plugin.initialize(this.engine);
    }

    public unregisterPlugin(pluginName: string): void {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            if (plugin.destroy) {
                plugin.destroy();
            }
            this.plugins.delete(pluginName);
        }
    }

    public getPlugin<T extends Plugin>(pluginName: string): T | undefined {
        return this.plugins.get(pluginName) as T | undefined;
    }

    public getAllPlugins(): Plugin[] {
        return Array.from(this.plugins.values());
    }
}