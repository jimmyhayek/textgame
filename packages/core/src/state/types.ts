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

  /**
   * Zda povolit funkci historie (Undo/Redo).
   * Výchozí: true
   */
  historyEnabled?: boolean;

  /**
   * Maximální počet kroků historie (Undo), které se mají uchovávat.
   * Limit 0 nebo záporné číslo efektivně vypne historii.
   * Výchozí: 50
   */
  historyLimit?: number;
}

/**
 * Data předávaná při události změny stavu
 */
export interface StateChangedEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Předchozí stav (null při inicializaci nebo resetu/loadu)
   */
  previousState: GameState<T> | null; // Modified to allow null

  /**
   * Nový stav
   */
  newState: GameState<T>;

  /**
   * Zdroj změny (např. 'update', 'setState', 'undo', 'redo', 'applyPersistentState', 'reset', atd.)
   */
  source?: string;
}

/**
 * Data předávaná při události změny historie
 */
export interface HistoryChangedEvent {
  /**
   * Zda je možné provést operaci Undo.
   */
  canUndo: boolean;
  /**
   * Zda je možné provést operaci Redo.
   */
  canRedo: boolean;
  /**
   * Aktuální počet kroků v undo stacku.
   */
  undoSize: number;
  /**
   * Aktuální počet kroků v redo stacku.
   */
  redoSize: number;
}


/**
* Eventy emitované GameStateManagerem (runtime události)
*/
export interface GameStateManagerEvents<
    T extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Emitováno při změně stavu (výsledkem jakékoli operace měnící `this.state`).
   */
  stateChanged: StateChangedEvent<T>;

  /**
   * Emitováno při změně perzistentních klíčů.
   */
  persistentKeysChanged: { keys: string[] };

  /**
   * Emitováno při změně stavu historie (po undo, redo, clearHistory,
   * nebo po normální změně stavu, která ovlivní historii).
   */
  historyChanged: HistoryChangedEvent;
}