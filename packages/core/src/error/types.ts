import type { EngineError } from './EngineError';
import type { SceneError, ContentError, EffectError, PluginError, SaveError, StateError, MigrationError } from './Errors';

/**
 * A type union representing any of the specific framework error classes.
 */
export type FrameworkError = SceneError | ContentError | EffectError | PluginError | SaveError | StateError | MigrationError | EngineError;