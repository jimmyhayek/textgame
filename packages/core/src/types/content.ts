/**
 * Generic content definition interface
 * @template T Type of content registry
 */
export interface ContentDefinition<T> {
  /** Content type identifier */
  type: string;
  /** Content registry */
  content: T;
}

/**
 * Function for loading content by ID
 * @template T Content type
 * @template ID Content ID type
 */
export type ContentLoader<T, ID = string> = (id: ID) => Promise<T>;

/**
 * Function for checking if content exists
 * @template ID Content ID type
 */
export type ContentChecker<ID = string> = (id: ID) => boolean;



/**
 * Content registry with lazy-loading support
 * @template T Content type
 * @template K Content ID type
 */
export type ContentRegistry<T extends object, K extends string = string> = {
  [key: string]: T | (() => Promise<T | { default: T }>);
};