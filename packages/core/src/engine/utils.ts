import { GameEngine } from './GameEngine';
import { GameEngineOptions } from './types';
import { Scene } from '../scene/types';
import { GenericContentLoader } from '../content/GenericContentLoader';
import { ContentDefinition } from '../content/types';
import { Plugin } from '../plugin/types';
import { GameState } from '../state/types';

/**
 * Možnosti pro vytvoření herního enginu
 */
export interface CreateGameEngineOptions {
    /**
     * Definice obsahu k registraci
     */
    content?: ContentDefinition<any>[];

    /**
     * Pluginy k registraci
     */
    plugins?: Plugin[];

    /**
     * Počáteční stav hry
     */
    initialState?: Partial<GameState>;

    /**
     * Vlastní content loader pro scény
     */
    sceneLoader?: GenericContentLoader<Scene>;

    /**
     * Další možnosti konfigurace enginu
     */
    engineOptions?: Partial<GameEngineOptions>;
}

/**
 * Vytvoří nový herní engine s danou konfigurací
 *
 * @param options Možnosti pro vytvoření enginu
 * @returns Nová instance herního enginu
 */
export function createGameEngine(options: CreateGameEngineOptions = {}): GameEngine {
    const {
        content = [],
        plugins = [],
        initialState = {},
        sceneLoader = new GenericContentLoader<Scene>(),
        engineOptions = {}
    } = options;

    // Vytvoření enginu
    const engine = new GameEngine({
        sceneLoader,
        initialState,
        plugins,
        ...engineOptions
    });

    // Registrace obsahu
    for (const contentDef of content) {
        engine.registerContent(contentDef);
    }

    return engine;
}