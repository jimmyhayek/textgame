import { GameEngine } from '../core/GameEngine';
import { Types, ContentDefinition, GameState, Scene, SceneKey } from '../types';
import { GenericContentLoader } from '../loaders/GenericContentLoader';

/**
 * Možnosti pro vytvoření herního enginu
 */
interface CreateGameEngineOptions {
  /** Definice obsahu k registraci */
  content?: ContentDefinition<any>[];
  /** Pluginy k registraci */
  plugins?: Types[];
  /** Počáteční stav hry */
  initialState?: Partial<GameState>;
  /** Vlastní content loader pro scény */
  sceneLoader?: GenericContentLoader<Scene>;
}

/**
 * Vytvoří nový herní engine se specifikovanými možnostmi
 *
 * @param options Možnosti pro vytvoření herního enginu
 * @returns Nová instance herního enginu
 */
export function createGameEngine(options: CreateGameEngineOptions = {}): GameEngine {
  const {
    content = [],
    plugins = [],
    initialState = {},
    sceneLoader = new GenericContentLoader<Scene>()
  } = options;

  // Vytvoření enginu s loaderem scén
  const engine = new GameEngine({
    sceneLoader,
    initialState,
    plugins
  });

  // Registrace obsahu s příslušnými loadery
  for (const contentDef of content) {
    engine.registerContent(contentDef);
  }

  return engine;
}