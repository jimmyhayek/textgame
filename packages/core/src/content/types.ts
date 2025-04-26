// src/content/types.ts

import { Scene } from '../scene/types'; // Assuming Scene is defined here

/**
 * Represents a registry for content items, supporting both direct definitions
 * and asynchronous lazy-loading functions.
 *
 * @template T The type of the content item (e.g., Scene, Item). Must be an object type if you rely on automatic _key injection.
 * @template K The type of the content identifier key (defaults to string).
 */
export type ContentRegistry<T, K extends string = string> = {
  // Using string index signature allows flexibility but loses specific key type checking beyond string.
  // If K needed stricter compile-time checks, a mapped type might be used, but string is common here.
  [key: string]: T | (() => Promise<T | { default: T }>);
};

/**
 * Configuration options for creating a GenericContentLoader.
 *
 * @template T The type of the content being loaded.
 * @template K The type of the content identifier key.
 */
export interface ContentLoaderOptions<T extends object, K extends string = string> {
  /** An optional initial registry of content definitions. */
  initialRegistry?: ContentRegistry<T, K>;
}

/**
 * Defines a structure for registering a collection of content with the engine
 * under a specific type identifier.
 *
 * @template T The type of the content items within the registry (e.g., Scene, Item). Must be an object.
 */
export interface ContentDefinition<T extends object> {
  /** An identifier for the type of content (e.g., 'scenes', 'items', 'characters'). */
  type: string;
  /** The ContentRegistry holding the actual content definitions or loaders for this type. */
  content: ContentRegistry<T>;
}


// --- Potential Future Event Types ---
// Note: These events are defined here but are not currently emitted by the core content module.
// They serve as a potential future enhancement for observing content loading and registration.

/**
 * Data for an event signaling that a specific content item has been loaded.
 * (Not currently emitted)
 * @template T The type of the loaded content.
 */
export interface ContentLoadedEvent<T> {
  /** The type identifier of the content (e.g., 'scenes'). */
  type: string;
  /** The key of the loaded content item. */
  key: string;
  /** The actual loaded content item. */
  content: T;
}

/**
 * Data for an event signaling that new content definitions have been registered.
 * (Not currently emitted)
 */
export interface ContentRegisteredEvent {
  /** The type identifier of the content (e.g., 'scenes'). */
  type: string;
  /** The number of content items registered in this batch. */
  count: number;
  /** The keys of the content items that were registered. */
  keys: string[];
}