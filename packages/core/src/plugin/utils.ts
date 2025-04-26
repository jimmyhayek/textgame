import { Plugin, PluginOptions } from './types';
import { AbstractPlugin } from './AbstractPlugin';
import { GameEngine } from '../engine/GameEngine';

/**
 * Vytvoří jednoduchý plugin pomocí konfigurační funkce
 *
 * @param name Název pluginu
 * @param configureFn Funkce pro konfiguraci pluginu
 * @param options Volitelné možnosti konfigurace
 * @returns Nová instance pluginu
 */
export function createPlugin(
  name: string,
  configureFn: (engine: GameEngine, options: PluginOptions) => void | Promise<void>,
  options: PluginOptions = {}
): Plugin {
  class SimplePlugin extends AbstractPlugin {
    constructor() {
      super(name, options);
    }

    protected async onInitialize(): Promise<void> {
      if (this.engine) {
        await Promise.resolve(configureFn(this.engine, this.options));
      }
    }
  }

  return new SimplePlugin();
}
