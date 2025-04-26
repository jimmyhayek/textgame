import { EngineError } from './EngineError';
import type { SceneKey } from '../scene';
import type { EffectType } from '../effect';

/**
 * Represents an error related to scene loading, transitions, or lifecycle events.
 */
export class SceneError extends EngineError {
    /** The key of the scene related to the error, if applicable. */
    public readonly sceneKey?: SceneKey;

    /**
     * Creates an instance of SceneError.
     * @param message The error message.
     * @param sceneKey The key of the relevant scene.
     * @param context Optional additional context.
     * @param options Optional standard Error options.
     */
    constructor(message: string, sceneKey?: SceneKey, context?: any, options?: ErrorOptions) {
        super(message, context, options);
        this.sceneKey = sceneKey;
    }
}

/**
 * Represents an error related to content loading, registration, or access.
 */
export class ContentError extends EngineError {
    /** The key of the content item related to the error, if applicable. */
    public readonly contentKey?: string;
    /** The type identifier (e.g., 'scenes', 'items') of the content related to the error, if applicable. */
    public readonly contentType?: string;

    /**
     * Creates an instance of ContentError.
     * @param message The error message.
     * @param contentKey The key of the relevant content item.
     * @param contentType The type identifier of the relevant content.
     * @param context Optional additional context.
     * @param options Optional standard Error options.
     */
    constructor(message: string, contentKey?: string, contentType?: string, context?: any, options?: ErrorOptions) {
        super(message, context, options);
        this.contentKey = contentKey;
        this.contentType = contentType;
    }
}

/**
 * Represents an error related to effect processing, application, or definition.
 */
export class EffectError extends EngineError {
    /** The type identifier of the effect related to the error, if applicable. */
    public readonly effectType?: EffectType; // Use EffectType from effect/types

    /**
     * Creates an instance of EffectError.
     * @param message The error message.
     * @param effectType The type identifier of the relevant effect.
     * @param context Optional additional context.
     * @param options Optional standard Error options.
     */
    constructor(message: string, effectType?: EffectType, context?: any, options?: ErrorOptions) {
        super(message, context, options);
        this.effectType = effectType;
    }
}

/**
 * Represents an error related to plugin initialization, execution, registration, or lifecycle.
 */
export class PluginError extends EngineError {
    /** The name of the plugin related to the error, if applicable. */
    public readonly pluginName?: string;
    /** The phase during which the error occurred (e.g., 'initialize', 'destroy'). */
    public readonly phase?: string;

    /**
     * Creates an instance of PluginError.
     * @param message The error message.
     * @param pluginName The name of the relevant plugin.
     * @param phase The lifecycle phase where the error occurred.
     * @param context Optional additional context.
     * @param options Optional standard Error options.
     */
    constructor(message: string, pluginName?: string, phase?: string, context?: any, options?: ErrorOptions) {
        super(message, context, options);
        this.pluginName = pluginName;
        this.phase = phase;
    }
}

/**
 * Represents an error related to saving, loading, deleting, or managing game saves.
 */
export class SaveError extends EngineError {
    /** The ID of the save slot related to the error, if applicable. */
    public readonly saveId?: string;

    /**
     * Creates an instance of SaveError.
     * @param message The error message.
     * @param saveId The ID of the relevant save slot.
     * @param context Optional additional context.
     * @param options Optional standard Error options.
     */
    constructor(message: string, saveId?: string, context?: any, options?: ErrorOptions) {
        super(message, context, options);
        this.saveId = saveId;
    }
}

/**
 * Represents an error related to game state management, validation, persistence, or structure.
 */
export class StateError extends EngineError {
    /** Describes the specific context within state management where the error occurred (e.g., 'validation', 'serialization'). */
    public readonly stateContext?: string;

    /**
     * Creates an instance of StateError.
     * @param message The error message.
     * @param stateContext The context within state operations.
     * @param context Optional additional context.
     * @param options Optional standard Error options.
     */
    constructor(message: string, stateContext?: string, context?: any, options?: ErrorOptions) {
        super(message, context, options);
        this.stateContext = stateContext;
    }
}

/**
 * Represents an error specifically related to state format migration issues.
 * Inherits from StateError.
 */
export class MigrationError extends StateError {
    /** The state format version the migration started from, if known. */
    public readonly fromVersion?: number;
    /** The target state format version the migration was attempting to reach, if known. */
    public readonly toVersion?: number;

    /**
     * Creates an instance of MigrationError.
     * @param message The error message.
     * @param fromVersion The source format version.
     * @param toVersion The target format version.
     * @param context Optional additional context.
     * @param options Optional standard Error options.
     */
    constructor(message: string, fromVersion?: number, toVersion?: number, context?: any, options?: ErrorOptions) {
        // Pass 'migration' as the stateContext to the parent StateError constructor
        super(message, 'migration', context, options);
        this.fromVersion = fromVersion;
        this.toVersion = toVersion;
    }
}