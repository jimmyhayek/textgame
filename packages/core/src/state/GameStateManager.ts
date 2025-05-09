import {
  GameState,
  GameStateManagerOptions,
  DEFAULT_PERSISTENT_KEYS,
  StateChangedEvent,
  GameStateManagerEvents,
  HistoryChangedEvent,
} from './types';
import { PersistedState } from './persistence/types';
import { produce } from '../utils/immer';
import { TypedEventEmitter } from '../event/TypedEventEmitter';
import { validateState } from './utils';
import { GameEngine } from '../engine/GameEngine';

const DEFAULT_HISTORY_LIMIT = 50;

/**
 * Spravuje herní stav s důrazem na neměnnost a podporou Undo/Redo.
 * @template T Typ proměnných ve stavu
 */
export class GameStateManager<T extends Record<string, unknown> = Record<string, unknown>> {
  private state: GameState<T>;
  private persistentKeys: string[];
  private readonly eventEmitter: TypedEventEmitter<GameStateManagerEvents<T>>;
  private readonly onBeforeSerialize?: (state: GameState<T>) => void;
  private readonly onAfterDeserialize?: (state: GameState<T>) => void;

  // --- History Properties ---
  private undoStack: GameState<T>[] = [];
  private redoStack: GameState<T>[] = [];
  private historyEnabled: boolean;
  private historyLimit: number;
  private isNavigatingHistory: boolean = false; // Flag to prevent history push during undo/redo

  constructor(engine: GameEngine, options: GameStateManagerOptions<T> = {}) {
    // History configuration
    this.historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;
    this.historyEnabled = options.historyEnabled ?? true;
    // Disable history if limit is non-positive
    if (this.historyLimit <= 0) {
      this.historyEnabled = false;
    }

    // Initialize state *after* history settings are known
    this.state = this.createInitialState(options.initialState || {});

    // Persistent keys setup
    this.persistentKeys = Array.isArray(options.persistentKeys)
        ? [...options.persistentKeys]
        : [...DEFAULT_PERSISTENT_KEYS];
    this.ensureDefaultPersistentKeys();

    // Event emitter setup
    this.eventEmitter = engine.getStateManagerEventEmitter<T>();

    // Callbacks setup
    this.onBeforeSerialize = options.onBeforeSerialize;
    this.onAfterDeserialize = options.onAfterDeserialize;

    // Emit initial history state if needed (usually canUndo=false, canRedo=false)
    // this.emitHistoryChanged(); // Consider if needed on init
  }

  private ensureDefaultPersistentKeys(): void {
    if (!this.persistentKeys.includes('visitedScenes')) {
      this.persistentKeys.push('visitedScenes');
    }
    if (!this.persistentKeys.includes('variables')) {
      this.persistentKeys.push('variables');
    }
  }

  private createInitialState(initialState: Partial<GameState<T>>): GameState<T> {
    const baseState: GameState<T> = {
      visitedScenes: new Set<string>(),
      variables: {} as T,
    };
    const state = { ...baseState, ...initialState } as GameState<T>;

    if (!(state.visitedScenes instanceof Set)) {
      console.warn(
          'GameStateManager: Initial state for visitedScenes was not a Set. Converting to Set.'
      );
      state.visitedScenes = new Set(Array.isArray(state.visitedScenes) ? state.visitedScenes : []);
    }
    if (typeof state.variables !== 'object' || state.variables === null) {
      console.warn(
          'GameStateManager: Initial state for variables was not an object. Initializing as empty object.'
      );
      state.variables = {} as T;
    }
    return state;
  }

  public getState(): GameState<T> {
    return this.state;
  }

  public updateState(updater: (state: GameState<T>) => void, source?: string): void {
    const previousState = this.state;
    const newState = produce(this.state, (draft: GameState<T>) => {
      updater(draft);
    });

    if (newState !== previousState) {
      this.state = newState;
      // Handle history *after* state is updated
      if (!this.isNavigatingHistory) {
        this.pushHistory(previousState); // Push the *previous* state
      }
      this.emitStateChanged(previousState, this.state, source || 'update');
    }
  }

  public setState(newState: GameState<T>, source?: string): void {
    if (!validateState(newState)) {
      console.error('GameStateManager: Attempted to set invalid state.', newState);
      throw new Error('Attempted to set invalid state.');
    }
    const previousState = this.state;
    if (newState !== previousState) {
      this.state = newState;
      // Handle history *after* state is updated
      if (!this.isNavigatingHistory) {
        this.pushHistory(previousState); // Push the *previous* state
      }
      this.emitStateChanged(previousState, this.state, source || 'setState');
    }
  }

  public applyPersistentState(persistedStateData: PersistedState<T>, source?: string): void {
    const previousState = this.state; // Store state before clearing history
    this.clearHistoryInternal(); // Clear history before applying new state baseline

    const newState: GameState<T> = {
      visitedScenes: new Set(
          Array.isArray(persistedStateData.visitedScenes) ? persistedStateData.visitedScenes : []
      ),
      variables: (typeof persistedStateData.variables === 'object' &&
      persistedStateData.variables !== null
          ? persistedStateData.variables
          : {}) as T,
    } as GameState<T>;

    for (const key of this.persistentKeys) {
      if (key === 'visitedScenes' || key === 'variables') continue;
      if (key in persistedStateData && key !== '_metadata') {
        (newState as any)[key] = (persistedStateData as any)[key];
      }
    }

    this.state = newState;

    if (this.onAfterDeserialize) {
      try {
        this.onAfterDeserialize(this.state);
      } catch (error) {
        console.error('Error in onAfterDeserialize callback:', error);
      }
    }

    this.emitStateChanged(null, this.state, source || 'applyPersistentState'); // previousState is conceptually null here
    this.emitHistoryChanged(); // Emit change after history clear
  }

  public resetState(options: Partial<GameState<T>> = {}): void {
    const previousState = this.state; // Store state before clearing history
    this.clearHistoryInternal(); // Clear history before resetting state

    this.state = this.createInitialState(options);
    this.emitStateChanged(null, this.state, 'reset'); // previousState is conceptually null here
    this.emitHistoryChanged(); // Emit change after history clear
  }

  // --- History Management Methods ---

  /**
   * Pushes a state onto the undo stack and manages history limits.
   * Should only be called for non-history navigation state changes.
   * @param stateToPush The state *before* the change occurred.
   */
  private pushHistory(stateToPush: GameState<T>): void {
    if (!this.historyEnabled) {
      return;
    }

    this.undoStack.push(stateToPush);

    // Enforce history limit
    if (this.undoStack.length > this.historyLimit) {
      this.undoStack.shift(); // Remove the oldest state
    }

    // Any new action clears the redo stack
    if (this.redoStack.length > 0) {
      this.redoStack = [];
    }

    this.emitHistoryChanged();
  }

  /**
   * Internal method to clear history without emitting event immediately.
   */
  private clearHistoryInternal(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Clears both the undo and redo stacks.
   */
  public clearHistory(): void {
    if (!this.historyEnabled && this.undoStack.length === 0 && this.redoStack.length === 0) {
      return; // No change if history disabled and stacks already empty
    }
    this.clearHistoryInternal();
    this.emitHistoryChanged();
  }

  /**
   * Checks if an Undo operation can be performed.
   * @returns True if undo is possible, false otherwise.
   */
  public canUndo(): boolean {
    return this.historyEnabled && this.undoStack.length > 0;
  }

  /**
   * Checks if a Redo operation can be performed.
   * @returns True if redo is possible, false otherwise.
   */
  public canRedo(): boolean {
    return this.historyEnabled && this.redoStack.length > 0;
  }

  /**
   * Performs the Undo operation.
   * Reverts the game state to the previous state in the history.
   * @returns True if the operation was successful, false otherwise.
   */
  public undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    this.isNavigatingHistory = true; // Prevent history push during this operation
    try {
      const previousState = this.state; // State before undo
      const stateToRestore = this.undoStack.pop()!; // Pop the last state from undo stack

      this.redoStack.push(previousState); // Push the current state onto redo stack
      this.state = stateToRestore; // Restore the popped state

      this.emitStateChanged(previousState, this.state, 'undo');
      this.emitHistoryChanged();
    } finally {
      this.isNavigatingHistory = false;
    }
    return true;
  }

  /**
   * Performs the Redo operation.
   * Re-applies a previously undone state change.
   * @returns True if the operation was successful, false otherwise.
   */
  public redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.isNavigatingHistory = true; // Prevent history push during this operation
    try {
      const previousState = this.state; // State before redo
      const stateToRestore = this.redoStack.pop()!; // Pop the last state from redo stack

      this.undoStack.push(previousState); // Push the current state onto undo stack
      // Enforce limit on undo stack after redo push
      if (this.undoStack.length > this.historyLimit) {
        this.undoStack.shift();
      }
      this.state = stateToRestore; // Restore the popped state

      this.emitStateChanged(previousState, this.state, 'redo');
      this.emitHistoryChanged();
    } finally {
      this.isNavigatingHistory = false;
    }
    return true;
  }

  /**
   * Gets the configured history limit.
   * @returns The maximum number of undo steps.
   */
  public getHistoryLimit(): number {
    return this.historyLimit;
  }

  /**
   * Sets the history limit dynamically.
   * If the new limit is smaller than the current undo stack size, the stack will be trimmed.
   * The redo stack is cleared when the limit changes.
   * @param limit The new maximum number of undo steps.
   */
  public setHistoryLimit(limit: number): void {
    const newLimit = Math.max(0, limit); // Ensure non-negative limit
    const oldLimit = this.historyLimit;
    const oldEnabled = this.historyEnabled;

    if (newLimit === oldLimit) return; // No change

    this.historyLimit = newLimit;
    this.historyEnabled = newLimit > 0;

    let changed = oldEnabled !== this.historyEnabled;

    // Trim undo stack if new limit is smaller
    if (this.historyLimit > 0 && this.undoStack.length > this.historyLimit) {
      const excess = this.undoStack.length - this.historyLimit;
      this.undoStack.splice(0, excess); // Remove oldest items
      changed = true;
    }

    // Clear redo stack on limit change for consistency
    if (this.redoStack.length > 0) {
      this.redoStack = [];
      changed = true;
    }

    if (changed) {
      this.emitHistoryChanged();
    }
  }

  /**
   * Gets the current size of the undo stack.
   * @returns The number of available undo steps.
   */
  public getUndoSize(): number {
    return this.undoStack.length;
  }

  /**
   * Gets the current size of the redo stack.
   * @returns The number of available redo steps.
   */
  public getRedoSize(): number {
    return this.redoStack.length;
  }

  /** Emits the stateChanged event. */
  private emitStateChanged(
      previousState: GameState<T> | null,
      newState: GameState<T>,
      source?: string
  ): void {
    const eventData: StateChangedEvent<T> = { previousState, newState, source };
    this.eventEmitter.emit('stateChanged', eventData);
  }

  /** Emits the historyChanged event. */
  private emitHistoryChanged(): void {
    if (!this.historyEnabled && this.undoStack.length === 0 && this.redoStack.length === 0) {
      // Optimization: Don't emit if history is disabled and stacks are empty (common state after clear/reset/load)
      // However, always emit if history was *just* disabled or enabled by setHistoryLimit.
      // This logic could be more complex, so emitting always might be safer for now.
      // Let's keep emitting for simplicity unless proven problematic.
    }

    const eventData: HistoryChangedEvent = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoSize: this.getUndoSize(),
      redoSize: this.getRedoSize(),
    };
    this.eventEmitter.emit('historyChanged', eventData);
  }

  public mergeState(externalState: Partial<GameState<T>>): void {
    this.updateState(state => {
      // ... (merge logic remains the same)
      if (externalState.visitedScenes) {
        const scenesToAdd =
            externalState.visitedScenes instanceof Set
                ? externalState.visitedScenes
                : Array.isArray(externalState.visitedScenes)
                    ? new Set(externalState.visitedScenes)
                    : [];
        for (const sceneKey of scenesToAdd) {
          state.visitedScenes.add(sceneKey);
        }
      }
      if (externalState.variables && typeof externalState.variables === 'object') {
        Object.assign(state.variables, externalState.variables);
      }
      for (const key in externalState) {
        if (
            Object.prototype.hasOwnProperty.call(externalState, key) &&
            key !== 'visitedScenes' &&
            key !== 'variables'
        ) {
          (state as any)[key] = (externalState as any)[key];
        }
      }
    }, 'mergeState');
  }

  public getVariable<K extends keyof T>(name: K, defaultValue?: T[K]): T[K] | undefined {
    return this.state.variables[name] ?? defaultValue;
  }

  public setVariable<K extends keyof T>(name: K, value: T[K]): void {
    this.updateState(state => {
      state.variables[name] = value;
    }, 'setVariable');
  }

  public hasVariable<K extends keyof T>(name: K): boolean {
    return this.state.variables[name] !== undefined;
  }

  public removeVariable<K extends keyof T>(name: K): void {
    this.updateState(state => {
      delete state.variables[name];
    }, 'removeVariable');
  }

  public markSceneVisited(sceneKey: string): void {
    this.updateState(state => {
      state.visitedScenes.add(sceneKey);
    }, 'markSceneVisited');
  }

  public unmarkSceneVisited(sceneKey: string): void {
    this.updateState(state => {
      state.visitedScenes.delete(sceneKey);
    }, 'unmarkSceneVisited');
  }

  public clearVisitedScenes(): void {
    this.updateState(state => {
      state.visitedScenes.clear();
    }, 'clearVisitedScenes');
  }

  public hasVisitedScene(sceneKey: string): boolean {
    return this.state.visitedScenes.has(sceneKey);
  }

  public getVisitedScenesCount(): number {
    return this.state.visitedScenes.size;
  }

  public setPersistentKeys(keys: string[]): void {
    this.persistentKeys = Array.isArray(keys) ? [...keys] : [];
    this.ensureDefaultPersistentKeys();
    this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
  }

  public getPersistentKeys(): string[] {
    return [...this.persistentKeys];
  }

  public addPersistentKey(key: string): void {
    if (key.length === 0) return;
    if (!this.persistentKeys.includes(key)) {
      this.persistentKeys = [...this.persistentKeys, key];
      this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
    }
  }

  public removePersistentKey(key: string): void {
    if (key.length === 0) return;
    if (key === 'visitedScenes' || key === 'variables') {
      console.warn(`GameStateManager: Cannot remove default persistent key "${key}".`);
      return;
    }
    const index = this.persistentKeys.indexOf(key);
    if (index !== -1) {
      this.persistentKeys = [
        ...this.persistentKeys.slice(0, index),
        ...this.persistentKeys.slice(index + 1),
      ];
      this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
    }
  }

  public on<K extends keyof GameStateManagerEvents<T>>(
      event: K,
      listener: (data: GameStateManagerEvents<T>[K]) => void
  ): void {
    this.eventEmitter.on(event, listener);
  }

  public off<K extends keyof GameStateManagerEvents<T>>(
      event: K,
      listener: (data: GameStateManagerEvents<T>[K]) => void
  ): void {
    this.eventEmitter.off(event, listener);
  }

  public getOnBeforeSerializeCallback(): ((state: GameState<T>) => void) | undefined {
    return this.onBeforeSerialize;
  }

  public getOnAfterDeserializeCallback(): ((state: GameState<T>) => void) | undefined {
    return this.onAfterDeserialize;
  }
}