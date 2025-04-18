import { GameState } from '../state/types';
import { Effect } from '../effect/types';

/**
 * Typ pro klíč scény
 */
export type SceneKey = string;

/**
 * Reprezentuje scénu ve hře
 */
export interface Scene {
    /**
     * Titulek scény
     */
    title: string;

    /**
     * Obsah scény, může být statický nebo dynamický
     */
    content: string | ((state: GameState) => string);

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

/**
 * Možnosti pro přechod mezi scénami
 */
export interface SceneTransitionOptions {
    /** Volitelné efekty, které se aplikují před přechodem */
    effects?: Effect[];

    /** Volitelná data pro předání scéně při přechodu */
    data?: any;
}