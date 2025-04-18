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

/**
 * Vytvoří kompozitní plugin z více pluginů
 *
 * @param name Název kompozitního pluginu
 * @param plugins Pole pluginů k zahrnutí
 * @param options Volitelné možnosti konfigurace
 * @returns Nová instance kompozitního pluginu
 */
export function createCompositePlugin(
    name: string,
    plugins: Plugin[],
    options: PluginOptions = {}
): Plugin {
    class CompositePlugin extends AbstractPlugin {
        private childPlugins: Plugin[] = [];

        constructor() {
            super(name, options);
            this.childPlugins = [...plugins];
        }

        protected async onInitialize(): Promise<void> {
            // Inicializace všech podřízených pluginů
            for (const plugin of this.childPlugins) {
                if (this.engine) {
                    await plugin.initialize(this.engine);
                }
            }
        }

        protected async onDestroy(): Promise<void> {
            // Čištění všech podřízených pluginů
            for (const plugin of this.childPlugins) {
                if (plugin.destroy) {
                    await plugin.destroy();
                }
            }
        }
    }

    return new CompositePlugin();
}

/**
 * Vytvoří plugin s možností načtení až při inicializaci (lazy loading)
 *
 * @param name Název pluginu
 * @param pluginFactory Funkce, která vrátí plugin nebo jeho Promise
 * @returns Nová instance lazy-loaded pluginu
 */
export function createLazyPlugin(
    name: string,
    pluginFactory: () => Plugin | Promise<Plugin>
): Plugin {
    class LazyPlugin implements Plugin {
        private innerPlugin: Plugin | null = null;
        public readonly name: string;

        constructor() {
            this.name = name;
        }

        public async initialize(engine: GameEngine): Promise<void> {
            // Načtení pluginu při první inicializaci
            this.innerPlugin = await Promise.resolve(pluginFactory());

            // Inicializace načteného pluginu
            await this.innerPlugin.initialize(engine);
        }

        public async destroy(): Promise<void> {
            // Čištění načteného pluginu
            if (this.innerPlugin && this.innerPlugin.destroy) {
                await this.innerPlugin.destroy();
            }
            this.innerPlugin = null;
        }
    }

    return new LazyPlugin();
}

/**
 * Vytvoří podmíněný plugin, který se inicializuje pouze pokud je splněna podmínka
 *
 * @param plugin Základní plugin
 * @param condition Funkce, která určuje, zda se plugin inicializuje
 * @returns Nová instance podmíněného pluginu
 */
export function createConditionalPlugin(
    plugin: Plugin,
    condition: (engine: GameEngine) => boolean | Promise<boolean>
): Plugin {
    class ConditionalPlugin implements Plugin {
        private initialized = false;
        public readonly name: string;

        constructor() {
            this.name = `conditional:${plugin.name}`;
        }

        public async initialize(engine: GameEngine): Promise<void> {
            // Kontrola podmínky
            const shouldInitialize = await Promise.resolve(condition(engine));

            if (shouldInitialize) {
                await plugin.initialize(engine);
                this.initialized = true;
            }
        }

        public async destroy(): Promise<void> {
            if (this.initialized && plugin.destroy) {
                await plugin.destroy();
                this.initialized = false;
            }
        }
    }

    return new ConditionalPlugin();
}

/**
 * Vytvoří verzovaný plugin s kontrolou kompatibility
 *
 * @param plugin Základní plugin
 * @param version Verze pluginu
 * @param compatibilityCheck Funkce pro kontrolu kompatibility
 * @returns Nová instance verzovaného pluginu
 */
export function createVersionedPlugin(
    plugin: Plugin,
    version: string,
    compatibilityCheck: (engineVersion: string) => boolean
): Plugin {
    class VersionedPlugin implements Plugin {
        public readonly name: string;
        public readonly version: string;

        constructor() {
            this.name = plugin.name;
            this.version = version;
        }

        public async initialize(engine: GameEngine): Promise<void> {
            // Kontrola kompatibility s enginem
            const engineVersion = engine.getVersion();
            if (!compatibilityCheck(engineVersion)) {
                throw new Error(
                    `Plugin '${this.name}' version ${this.version} is not compatible with engine version ${engineVersion}.`
                );
            }

            await plugin.initialize(engine);
        }

        public async destroy(): Promise<void> {
            if (plugin.destroy) {
                await plugin.destroy();
            }
        }
    }

    return new VersionedPlugin();
}

/**
 * Vytvoří debounced verzi pluginu, který odloží inicializaci
 * Užitečné pro optimalizaci při hromadné registraci více pluginů
 *
 * @param plugin Základní plugin
 * @param delay Zpoždění inicializace v ms
 * @returns Nová instance pluginu s odloženou inicializací
 */
export function createDebouncedPlugin(
    plugin: Plugin,
    delay: number = 100
): Plugin {
    class DebouncedPlugin implements Plugin {
        private engine: GameEngine | null = null;
        private initTimeout: any = null;
        private initialized = false;
        public readonly name: string;

        constructor() {
            this.name = `debounced:${plugin.name}`;
        }

        public async initialize(engine: GameEngine): Promise<void> {
            this.engine = engine;

            // Zrušení předchozího timeoutu, pokud existuje
            if (this.initTimeout) {
                clearTimeout(this.initTimeout);
            }

            // Odložení inicializace
            return new Promise<void>((resolve) => {
                this.initTimeout = setTimeout(async () => {
                    await plugin.initialize(engine);
                    this.initialized = true;
                    resolve();
                }, delay);
            });
        }

        public async destroy(): Promise<void> {
            // Zrušení timeoutu, pokud inicializace ještě neproběhla
            if (this.initTimeout) {
                clearTimeout(this.initTimeout);
                this.initTimeout = null;
            }

            if (this.initialized && plugin.destroy) {
                await plugin.destroy();
                this.initialized = false;
            }

            this.engine = null;
        }
    }

    return new DebouncedPlugin();
}