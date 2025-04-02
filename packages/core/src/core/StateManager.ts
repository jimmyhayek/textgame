import { GameState } from '../types';

export class StateManager {
  private state: GameState;

  constructor(initialState: Partial<GameState> = {}) {
    this.state = this.createInitialState(initialState);
  }

  private createInitialState(initialState: Partial<GameState>): GameState {
    return {
      visitedScenes: new Set<string>(),
      variables: {},
      ...initialState,
    };
  }

  public getState(): GameState {
    return this.state;
  }

  public updateState(updater: (state: GameState) => void): void {
    updater(this.state);
  }

  public setState(newState: GameState): void {
    this.state = newState;
  }

  public serialize(): string {
    const serializableState = {
      ...this.state,
      visitedScenes: Array.from(this.state.visitedScenes || []),
    };
    return JSON.stringify(serializableState);
  }

  public deserialize(serializedState: string): void {
    const parsedState = JSON.parse(serializedState);
    this.state = {
      ...parsedState,
      visitedScenes: new Set(parsedState.visitedScenes || []),
    };
  }
}
