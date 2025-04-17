import { SceneKey, GameState, Effect } from '@pabitel/core';

/**
 * Reprezentuje textový příkaz pro interakci s herním světem
 */
export interface Command {
    /**
     * Vzory příkazů, které uživatel může zadat
     * Např. ['jít na sever', 'jdi severně', 'sever']
     */
    patterns: string[];

    /**
     * Volitelný klíč scény, na kterou se přejde po zpracování příkazu
     */
    scene?: SceneKey | ((state: GameState) => SceneKey);

    /**
     * Efekty, které se aplikují na stav hry po zpracování příkazu
     */
    effects?: Effect[];

    /**
     * Volitelná podmínka, která určuje, zda je příkaz dostupný
     */
    condition?: (state: GameState) => boolean;

    /**
     * Textová odpověď po zpracování příkazu
     */
    response?: string | ((state: GameState) => string);

    /**
     * Priorita příkazu při zpracování podobných příkazů
     * Vyšší číslo znamená vyšší prioritu
     */
    priority?: number;

    /**
     * Další metadata pro rozšíření funkcionality
     */
    metadata?: Record<string, any>;
}

/**
 * Nastavení pro CommandPlugin
 */
export interface CommandPluginOptions {
    /**
     * Nastavení pro Fuse.js
     * Hodnoty pro vyhledávání lze upravit pro lepší výsledky
     */
    fuseOptions?: {
        /**
         * Práh pro shodu (0-1, kde 0 znamená přesnou shodu)
         * Výchozí hodnota: 0.3
         */
        threshold?: number;

        /**
         * Ignorovat pozici nalezeného vzoru ve vstupu
         * Výchozí hodnota: true
         */
        ignoreLocation?: boolean;

        /**
         * Použít rozšířené vyhledávání
         * Výchozí hodnota: true
         */
        useExtendedSearch?: boolean;

        /**
         * Další hodnoty pro konfiguraci Fuse.js
         */
        [key: string]: any;
    };

    /**
     * Ignorovat velikost písmen při porovnávání příkazů
     * Výchozí hodnota: true
     */
    ignoreCase?: boolean;

    /**
     * Normalizovat diakritiku při porovnávání příkazů
     * Výchozí hodnota: true
     */
    normalizeDiacritics?: boolean;

    /**
     * Výchozí odpověď, pokud nebyl rozpoznán žádný příkaz
     * Může být statická nebo dynamická
     */
    defaultFallbackResponse?: string | ((input: string, state: GameState) => string);

    /**
     * Další možnosti pro rozšíření funkcionality
     */
    [key: string]: any;
}

/**
 * Typy událostí emitovaných CommandPluginem
 */
export enum CommandPluginEvents {
    COMMAND_PROCESSED = 'commands:commandProcessed',
    COMMAND_NOT_FOUND = 'commands:commandNotFound',
    AVAILABLE_COMMANDS = 'commands:availableCommands',
    COMMAND_HINTS = 'commands:commandHints'
}

/**
 * Rozšíření rozhraní Scene o příkazy
 */
declare module '@pabitel/core' {
    interface Scene {
        /**
         * Příkazy dostupné v této scéně
         */
        commands?: Command[];

        /**
         * Odpověď při zadání nerozpoznaného příkazu
         */
        fallbackResponse?: string | ((input: string, state: GameState) => string);

        /**
         * Nápověda dostupná v této scéně
         */
        hints?: string[] | ((state: GameState) => string[]);
    }
}

/**
 * Výsledek zpracování příkazu
 */
export interface CommandProcessResult {
    /**
     * Byl příkaz rozpoznán a zpracován
     */
    success: boolean;

    /**
     * Odpověď na příkaz
     */
    response?: string;

    /**
     * Rozpoznaný příkaz
     */
    command?: Command;

    /**
     * Detaily shody
     */
    matchDetails?: {
        /**
         * Skóre shody (0-1, kde 0 je přesná shoda)
         */
        score: number;

        /**
         * Rozpoznaný vzor
         */
        pattern: string;
    };
}