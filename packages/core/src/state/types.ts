/**
 * Základní herní stav
 * Obsahuje základní strukturu pro ukládání herního stavu
 */
export interface GameState {
    /**
     * Množina klíčů navštívených scén
     */
    visitedScenes: Set<string>;

    /**
     * Úložiště herních proměnných
     */
    variables: Record<string, any>;

    /**
     * Indexová signatura pro další vlastnosti
     * Umožňuje rozšiřování stavu pluginy a dalšími komponentami
     */
    [key: string]: any;
}

/**
 * Funkce pro aktualizaci herního stavu
 * Používá se s immer pro bezpečné mutace
 */
export type StateUpdater = (state: GameState) => void;

/**
 * Možnosti pro vytvoření StateManager
 */
export interface StateManagerOptions {
    /**
     * Počáteční stav, který bude sloučen s výchozím prázdným stavem
     */
    initialState?: Partial<GameState>;
}

/**
 * Možnosti pro serializaci stavu
 */
export interface SerializationOptions {
    /**
     * Zda zahrnout metadata o stavu (např. verzi enginu)
     * Výchozí: true
     */
    includeMetadata?: boolean;

    /**
     * Vlastní replacer funkce pro JSON.stringify
     */
    replacer?: (key: string, value: any) => any;

    /**
     * Další volby specifické pro implementaci
     */
    [key: string]: any;
}

/**
 * Metadata o stavu
 */
export interface StateMetadata {
    /**
     * Verze formátu stavu
     */
    version: number;

    /**
     * Časové razítko vytvoření
     */
    timestamp: number;

    /**
     * Další metadata
     */
    [key: string]: any;
}