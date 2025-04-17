import { GameState, SceneKey, Effect } from '@pabitel/core';

/**
 * Reprezentuje volbu v rámci scény
 */
export interface Choice {
    /**
     * Text volby zobrazený v UI
     */
    label: string | ((state: GameState) => string);

    /**
     * Volitelná klávesová zkratka pro rychlý výběr volby
     */
    shortcut?: string;

    /**
     * Volitelný klíč scény, na kterou se přejde po výběru této volby
     */
    scene?: SceneKey | ((state: GameState) => SceneKey);

    /**
     * Volitelná podmínka, která určuje, zda je volba dostupná
     */
    condition?: (state: GameState) => boolean;

    /**
     * Efekty, které se aplikují na stav hry po výběru této volby
     */
    effects?: Effect[];

    /**
     * Textová odpověď po výběru volby
     */
    response?: string | ((state: GameState) => string);

    /**
     * Další metadata pro rozšíření funkcionality
     */
    metadata?: Record<string, any>;
}

/**
 * Konfigurace pro ChoicesPlugin
 */
export interface ChoicesPluginOptions {
    /**
     * Zda automaticky emitovat událost o nových dostupných volbách při změně scény
     * Výchozí: true
     */
    emitAvailableChoicesOnSceneChange?: boolean;

    /**
     * Zda povolit klávesové zkratky pro volby
     * Výchozí: true
     */
    enableShortcuts?: boolean;
}

/**
 * Data události o vybrané volbě
 */
export interface ChoiceSelectedEventData {
    /**
     * Vybraná volba
     */
    choice: Choice;

    /**
     * Index vybrané volby
     */
    index: number;
}

/**
 * Data události o dostupných volbách
 */
export interface AvailableChoicesEventData {
    /**
     * Dostupné volby
     */
    choices: Choice[];

    /**
     * Aktuální scéna
     */
    sceneKey: SceneKey;
}

/**
 * Typy událostí emitovaných ChoicesPluginem
 */
export enum ChoicesPluginEvents {
    CHOICE_SELECTED = 'choices:choiceSelected',
    CHOICE_PROCESSED = 'choices:choiceProcessed',
    AVAILABLE_CHOICES = 'choices:availableChoices',
    CHOICE_RESPONSE = 'choices:choiceResponse'
}

/**
 * Rozšíření Scene interface o choices
 */
declare module '@pabitel/core' {
    interface Scene {
        /**
         * Dostupné volby v této scéně
         */
        choices?: Choice[];
    }
}