import { ScenesRegistry } from './scene';

export interface ContentDefinition<T> {
  type: string;
  content: T;
}

export type ScenesDefinition = ContentDefinition<ScenesRegistry>;
