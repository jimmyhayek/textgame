import { Scene, SceneKey, ScenesRegistry } from './types';
import { GameState } from '../state/types';

/**
 * Získá text obsahu scény, řeší dynamický i statický obsah
 */
export function getSceneContent(scene: Scene, state: GameState): string {
  if (typeof scene.content === 'function') {
    return scene.content(state);
  }
  return scene.content;
}

/**
 * Zjistí, zda scéna byla již navštívena
 */
export function isSceneVisited(sceneKey: SceneKey, state: GameState): boolean {
  return state.visitedScenes.has(sceneKey);
}

/**
 * Validuje kompletnost a správnost definice scény
 */
export function validateScene(scene: Scene): boolean {
  if (!scene.title || !scene.content) {
    return false;
  }

  return true;
}

/**
 * Normalizuje klíč scény (např. převod neplatných znaků, normalizace cesty)
 */
export function normalizeSceneKey(key: string): SceneKey {
  return key
    .trim()
    .replace(/\/{2,}/g, '/')
    .replace(/^\/|\/$/g, '');
}

/**
 * Získá rodičovský klíč scény (např. pro 'forest/clearing' vrátí 'forest')
 */
export function getParentSceneKey(sceneKey: SceneKey): SceneKey | null {
  const lastSlashIndex = sceneKey.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return null;
  }
  return sceneKey.substring(0, lastSlashIndex);
}

/**
 * Získá název scény z klíče (např. pro 'forest/clearing' vrátí 'clearing')
 */
export function getSceneNameFromKey(sceneKey: SceneKey): string {
  const lastSlashIndex = sceneKey.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return sceneKey;
  }
  return sceneKey.substring(lastSlashIndex + 1);
}
