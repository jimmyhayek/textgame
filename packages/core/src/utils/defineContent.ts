import { ContentDefinition, ContentRegistry } from '../types';
import { Scene, SceneKey } from '../types/scene';
import { GenericContentLoader } from '../loaders/GenericContentLoader';

/**
 * Definuje scénu bez nutnosti specifikovat klíč
 *
 * @param scene Definice scény bez _key vlastnosti
 * @returns Definice scény pro použití v registry
 */
export function defineScene(scene: Omit<Scene, '_key'>): Scene {
  return scene;
}

/**
 * Definuje obsah scén pro registry
 *
 * @template T Typ registry scén
 * @param scenes Registry scén k definování
 * @returns Definice obsahu scén
 */
export function defineScenes<T extends ContentRegistry<Scene, SceneKey>>(
    scenes: T
): ContentDefinition<T> {
  return { type: 'scenes', content: scenes };
}

/**
 * Obecná funkce pro definování obsahu jakéhokoliv typu
 *
 * @template T Typ registry obsahu
 * @param type Identifikátor typu obsahu
 * @param content Registry obsahu k definování
 * @returns Definice obsahu pro určený typ
 */
export function defineContent<T extends ContentRegistry<any, any>>(
    type: string,
    content: T
): ContentDefinition<T> {
  return { type, content };
}

/**
 * Definuje obsah postav pro registry
 *
 * @template T Typ registry postav
 * @param characters Registry postav k definování
 * @returns Definice obsahu postav
 */
export function defineCharacters<T extends ContentRegistry<any, any>>(
    characters: T
): ContentDefinition<T> {
  return { type: 'characters', content: characters };
}

/**
 * Definuje obsah lokací pro registry
 *
 * @template T Typ registry lokací
 * @param locations Registry lokací k definování
 * @returns Definice obsahu lokací
 */
export function defineLocations<T extends ContentRegistry<any, any>>(
    locations: T
): ContentDefinition<T> {
  return { type: 'locations', content: locations };
}

/**
 * Definuje obsah dialogů pro registry
 *
 * @template T Typ registry dialogů
 * @param dialogues Registry dialogů k definování
 * @returns Definice obsahu dialogů
 */
export function defineDialogues<T extends ContentRegistry<any, any>>(
    dialogues: T
): ContentDefinition<T> {
  return { type: 'dialogues', content: dialogues };
}

/**
 * Definuje obsah předmětů pro registry
 *
 * @template T Typ registry předmětů
 * @param items Registry předmětů k definování
 * @returns Definice obsahu předmětů
 */
export function defineItems<T extends ContentRegistry<any, any>>(
    items: T
): ContentDefinition<T> {
  return { type: 'items', content: items };
}

/**
 * Definuje obsah úkolů pro registry
 *
 * @template T Typ registry úkolů
 * @param quests Registry úkolů k definování
 * @returns Definice obsahu úkolů
 */
export function defineQuests<T extends ContentRegistry<any, any>>(
    quests: T
): ContentDefinition<T> {
  return { type: 'quests', content: quests };
}

/**
 * Registruje scény do loaderů
 *
 * @param sceneLoader Loader scén pro registraci
 * @param scenes Definice obsahu scén k registraci
 */
export function registerScenes(
    sceneLoader: GenericContentLoader<Scene>,
    scenes: ContentDefinition<ContentRegistry<Scene>>
): void {
  if (scenes.type !== 'scenes') {
    throw new Error(`Expected content type 'scenes', got '${scenes.type}'`);
  }

  sceneLoader.registerAll(scenes.content);
}

/**
 * Vytvoří loader scén a registruje do něj scény
 *
 * @param scenes Definice obsahu scén k registraci
 * @returns Nový loader scén s registrovanými scénami
 */
export function createSceneLoader(
    scenes: ContentDefinition<ContentRegistry<Scene>>
): GenericContentLoader<Scene> {
  const loader = new GenericContentLoader<Scene>();
  registerScenes(loader, scenes);
  return loader;
}