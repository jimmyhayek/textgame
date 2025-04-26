/**
 * Základní herní stav
 * Obsahuje základní strukturu pro ukládání herního stavu
 * @template T Typ pro proměnné, výchozí je prázdný objekt
 */
export interface GameState<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Množina klíčů navštívených scén
   */
  visitedScenes: Set<string>;

  /**
   * Úložiště herních proměnných
   */
  variables: T;

  /**
   * Indexová signatura pro další vlastnosti
   * Umožňuje rozšiřování stavu pluginy a dalšími komponentami
   */
  [key: string]: any;
}

/**
 * Klíč pro perzistentní vlastnosti ve stavu - pro dokumentaci/API reference, ne interně
 */
export const PERSISTENT_KEYS_KEY = '__persistentKeys'; // Konstanta zůstává pro referenci

/**
 * Výchozí perzistentní klíče, které by měly být vždy ukládány
 */
export const DEFAULT_PERSISTENT_KEYS = ['visitedScenes', 'variables'];

/**
 * Funkce pro aktualizaci herního stavu
 * Používá se s immer pro bezpečné mutace
 * @template T Typ proměnných ve stavu
 */
export type StateUpdater<T extends Record<string, unknown> = Record<string, unknown>> = (
  state: GameState<T>
) => void;

/**
 * Možnosti pro vytvoření GameStateManager
 * @template T Typ proměnných ve stavu
 */
export interface GameStateManagerOptions<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Počáteční stav, který bude sloučen s výchozím prázdným stavem
   */
  initialState?: Partial<GameState<T>>;

  /**
   * Seznam klíčů, které budou persistovány při serializaci
   * Pokud není uveden, použijí se DEFAULT_PERSISTENT_KEYS
   */
  persistentKeys?: string[];

  /**
   * Callback volaný PŘED serializací stavu.
   * Tuto funkcionalitu by měl primárně implementovat SaveManager nebo PersistenceService,
   * ale je zde ponechána pro možnost, aby GameStateManager mohl provést přípravu.
   */
  onBeforeSerialize?: (state: GameState<T>) => void;

  /**
   * Callback volaný PO deserializaci stavu a jeho aplikaci na GameStateManager.
   * Stejně jako onBeforeSerialize, primárně patří do persistence vrstvy.
   */
  onAfterDeserialize?: (state: GameState<T>) => void;
}

/**
 * Data předávaná při události změny stavu
 */
export interface StateChangedEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Předchozí stav (null při deserializaci)
   */
  previousState: GameState<T> | null;

  /**
   * Nový stav
   */
  newState: GameState<T>;

  /**
   * Zdroj změny (např. 'effect', 'scene', 'plugin', 'deserialize', 'reset', atd.)
   */
  source?: string;
}

/**
 * Eventy emitované GameStateManagerem (runtime události)
 */
export interface GameStateManagerEvents<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Emitováno při změně stavu
   */
  stateChanged: StateChangedEvent<T>;

  /**
   * Emitováno při změně perzistentních klíčů
   */
  persistentKeysChanged: { keys: string[] };

  // Události související s persistencí (jako beforeSerialize/afterDeserialize/migrationApplied)
  // by se nyní měly emitovat z StatePersistenceService nebo StateMigrationService,
  // jak je definováno v src/state/persistence/types.ts.
  // GameStateManager na ně může volitelně naslouchat, pokud je to potřeba.
}
