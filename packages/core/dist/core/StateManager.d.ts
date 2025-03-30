import { GameState } from '../types';
export declare class StateManager {
    private state;
    constructor(initialState?: Partial<GameState>);
    private createInitialState;
    getState(): GameState;
    updateState(updater: (state: GameState) => void): void;
    setState(newState: GameState): void;
    serialize(): string;
    deserialize(serializedState: string): void;
}
