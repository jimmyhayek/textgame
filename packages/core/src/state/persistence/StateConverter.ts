import { GameState } from '../types';
import {
  PersistedState,
  StateMetadata,
  SerializationOptions,
  StateManagerPersistenceEvents,
} from './types';
import { StateMigrationService } from './StateMigrationService';
import { TypedEventEmitter } from '../../event/TypedEventEmitter'; // Zkontroluj název souboru/třídy

/**
 * Služba zodpovědná za převod mezi runtime GameState a serializovatelnou PersistedState a zpět.
 */
export class StateConverter {
  private constructor() {}

  public static serialize<T extends Record<string, unknown>>(
    state: GameState<T>,
    persistentKeys: string[],
    options: SerializationOptions = {},
    onBeforeSerializeCallback?: (state: GameState<T>) => void,
    // Přijímá typovaný emitter
    eventEmitter?: TypedEventEmitter<StateManagerPersistenceEvents<T>>
  ): string {
    const { includeMetadata = true, replacer } = options;

    if (onBeforeSerializeCallback) {
      try {
        onBeforeSerializeCallback(state);
      } catch (error) {
        console.error('Error in onBeforeSerialize callback:', error);
        // Pokračovat v serializaci i přes chybu v callbacku? Záleží na požadavcích.
      }
    }

    eventEmitter?.emit('beforeSerialize', { state });

    const serializableState: PersistedState<T> = {} as PersistedState<T>;

    for (const key of persistentKeys) {
      if (key in state) {
        const value = (state as any)[key];
        if (key === 'visitedScenes') {
          serializableState.visitedScenes = this.convertSetToArray(value);
        } else if (key === 'variables') {
          serializableState.variables = value as T;
        } else {
          (serializableState as any)[key] = value;
        }
      } else {
        console.warn(
          `StateConverter: Persistent key '${key}' not found in GameState during serialization.`
        );
      }
    }

    if (includeMetadata) {
      serializableState._metadata = this.createStateMetadata();
    }

    try {
      return JSON.stringify(serializableState, replacer);
    } catch (error) {
      console.error('StateConverter: Failed to stringify serializable state.', error);
      throw new Error('Failed to serialize state to JSON');
    }
  }

  public static deserialize<T extends Record<string, unknown>>(
    serializedState: string,
    options: SerializationOptions = {},
    onAfterDeserializeCallback?: (state: GameState<T>) => void, // Stále zde, ale volá se z GameStateManageru
    // Přijímá typovaný emitter
    eventEmitter?: TypedEventEmitter<StateManagerPersistenceEvents<T>>
  ): PersistedState<T> {
    let parsedState: PersistedState<unknown>;
    try {
      parsedState = JSON.parse(serializedState) as PersistedState<unknown>;
    } catch (error) {
      console.error('StateConverter: Failed to parse serialized state string.', error);
      throw new Error('Invalid serialized state format');
    }

    const targetVersion = StateMigrationService.getCurrentStateFormatVersion();
    let migratedState: PersistedState<unknown>;
    try {
      // Předání typovaného emitteru migraci
      migratedState = StateMigrationService.migrate(
        parsedState,
        targetVersion,
        // StateMigrationService očekává emitter pro <unknown>
        eventEmitter as TypedEventEmitter<StateManagerPersistenceEvents<unknown>> | undefined
      );
    } catch (error) {
      console.error(`StateConverter: Failed to migrate state to version ${targetVersion}.`, error);
      throw error;
    }

    // Emitování události po deserializaci a migraci
    eventEmitter?.emit('afterDeserialize', { state: migratedState as PersistedState<T> });

    // Callback onAfterDeserialize se už zde nevolá, volá ho GameStateManager.applyPersistentState

    return migratedState as PersistedState<T>;
  }

  private static createStateMetadata(): StateMetadata {
    return {
      version: StateMigrationService.getCurrentStateFormatVersion(),
      timestamp: Date.now(),
    };
  }

  private static convertSetToArray(setOrArray: Set<string> | string[] | undefined): string[] {
    if (setOrArray instanceof Set) {
      return Array.from(setOrArray);
    }
    if (Array.isArray(setOrArray)) {
      return setOrArray;
    }
    if (setOrArray !== undefined && setOrArray !== null) {
      console.warn(
        'StateConverter: Expected Set<string> or Array<string> for visitedScenes, received',
        typeof setOrArray
      );
    }
    return [];
  }
}
