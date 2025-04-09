import { GameState } from '../types';
import { produce } from '../utils/immer';

/**
 * Manages the game state with immutability using Immer
 *
 * StateManager is responsible for tracking, updating, and persisting the game state
 * throughout the game's lifecycle. It uses Immer to ensure immutability while
 * providing a convenient API for state updates.
 */
export class StateManager {
  private state: GameState;

  /**
   * Creates a new StateManager instance with optional initial state
   *
   * @param initialState - Partial state that will be merged with the default state
   */
  constructor(initialState: Partial<GameState> = {}) {
    this.state = this.createInitialState(initialState);
  }

  /**
   * Creates the initial game state by merging default values with provided initialState
   *
   * @param initialState - Partial state that will be merged with the default state
   * @returns A complete GameState object
   */
  private createInitialState(initialState: Partial<GameState>): GameState {
    return {
      visitedScenes: new Set<string>(),
      variables: {},
      ...initialState,
    };
  }

  /**
   * Returns the current game state
   *
   * @returns The current game state
   */
  public getState(): GameState {
    return this.state;
  }

  /**
   * Updates the game state using Immer's produce function
   * This allows writing updates as if they were mutable operations
   * while ensuring immutability underneath
   *
   * @param updater - Function that receives a draft of the state to modify
   */
  public updateState(updater: (state: GameState) => void): void {
    this.state = produce(this.state, (draft: GameState) => {
      updater(draft);
    });
  }

  /**
   * Sets the game state to a completely new state
   *
   * @param newState - The new game state to set
   */
  public setState(newState: GameState): void {
    this.state = newState;
  }

  /**
   * Serializes the game state to a JSON string
   * Handles converting Sets to arrays for proper serialization
   *
   * @returns JSON string representation of the game state
   */
  public serialize(): string {
    // Vytvoříme kopii stavu pro serializaci
    const serializableState: any = {
      ...this.state,
      visitedScenes: Array.from(this.state.visitedScenes || [])
    };

    return JSON.stringify(serializableState);
  }

  /**
   * Deserializes a JSON string into a game state
   * Handles converting arrays back to Sets
   *
   * @param serializedState - JSON string representation of the game state
   */
  public deserialize(serializedState: string): void {
    const parsedState = JSON.parse(serializedState);

    // Nejprve vytvoříme nový objekt stavu a pak ho přiřadíme
    const newState: GameState = {
      ...parsedState,
      visitedScenes: new Set(parsedState.visitedScenes || [])
    };

    this.state = newState;
  }
}