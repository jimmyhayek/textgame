// packages/core/src/types/scene.ts

import { GameState } from './state';
import { Effect } from '../effect/effect';

/**
 * Typ pro klíč scény (typicky odvozeno od cesty k souboru)
 */
export type SceneKey = string;

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
   * Může být statický nebo dynamický
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
   * Textová odpověď po výběru volby, může být statická nebo dynamická
   */
  response?: string | ((state: GameState) => string);

  /**
   * Další metadata pro rozšíření funkcionality
   */
  metadata?: Record<string, any>;
}

/**
 * Reprezentuje scénu ve hře
 */
export interface Scene {
  /**
   * Titulek scény zobrazený hráči
   */
  title: string;

  /**
   * Obsah scény, může být statický nebo dynamický
   */
  content: string | ((state: GameState) => string);

  /**
   * Dostupné volby v této scéně
   */
  choices: Choice[];

  /**
   * Handler volaný při vstupu do scény
   */
  onEnter?: (state: GameState, engine: any) => void;

  /**
   * Handler volaný při odchodu ze scény
   */
  onExit?: (state: GameState, engine: any) => void;

  /**
   * Další metadata pro rozšíření funkcionality
   */
  metadata?: Record<string, any>;

  /**
   * Interní property obsahující klíč scény
   * Nastavuje se automaticky při načtení scény
   * @internal
   */
  _key?: SceneKey;
}

/**
 * Funkce pro načtení scény
 */
export type SceneLoader = () => Promise<{ default: Scene } | Scene>;

/**
 * Registry scén mapující klíče na definice nebo loadery
 */
export type ScenesRegistry = Record<SceneKey, Scene | SceneLoader>;