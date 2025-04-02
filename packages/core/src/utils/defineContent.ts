import { ContentDefinition, ScenesRegistry } from '../types';

export function defineScenes<T extends ScenesRegistry>(scenes: T): ContentDefinition<T> {
  return { type: 'scenes', content: scenes };
}
