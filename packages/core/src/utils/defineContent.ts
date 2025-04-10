import { ContentDefinition, ContentRegistry } from '../types';

/**
 * Defines a content definition for scenes
 *
 * @template T Type of scene registry
 * @param scenes Scene registry to define
 * @returns Content definition for scenes
 */
export function defineScenes<T extends ContentRegistry<any, any>>(scenes: T): ContentDefinition<T> {
  return { type: 'scenes', content: scenes };
}

/**
 * Generic function to define content for any type
 *
 * @template T Type of content registry
 * @param type Content type identifier
 * @param content Content registry to define
 * @returns Content definition for the specified type
 */
export function defineContent<T extends ContentRegistry<any, any>>(
    type: string,
    content: T
): ContentDefinition<T> {
  return { type, content };
}

/**
 * Defines a content definition for characters
 *
 * @template T Type of character registry
 * @param characters Character registry to define
 * @returns Content definition for characters
 */
export function defineCharacters<T extends ContentRegistry<any, any>>(
    characters: T
): ContentDefinition<T> {
  return { type: 'characters', content: characters };
}

/**
 * Defines a content definition for locations
 *
 * @template T Type of location registry
 * @param locations Location registry to define
 * @returns Content definition for locations
 */
export function defineLocations<T extends ContentRegistry<any, any>>(
    locations: T
): ContentDefinition<T> {
  return { type: 'locations', content: locations };
}

/**
 * Defines a content definition for dialogues
 *
 * @template T Type of dialogue registry
 * @param dialogues Dialogue registry to define
 * @returns Content definition for dialogues
 */
export function defineDialogues<T extends ContentRegistry<any, any>>(
    dialogues: T
): ContentDefinition<T> {
  return { type: 'dialogues', content: dialogues };
}

/**
 * Defines a content definition for items
 *
 * @template T Type of item registry
 * @param items Item registry to define
 * @returns Content definition for items
 */
export function defineItems<T extends ContentRegistry<any, any>>(
    items: T
): ContentDefinition<T> {
  return { type: 'items', content: items };
}

/**
 * Defines a content definition for quests
 *
 * @template T Type of quest registry
 * @param quests Quest registry to define
 * @returns Content definition for quests
 */
export function defineQuests<T extends ContentRegistry<any, any>>(
    quests: T
): ContentDefinition<T> {
  return { type: 'quests', content: quests };
}