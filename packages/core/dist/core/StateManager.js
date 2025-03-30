export class StateManager {
    constructor(initialState = {}) {
        this.state = this.createInitialState(initialState);
    }
    createInitialState(initialState) {
        return {
            visitedScenes: new Set(),
            variables: {},
            ...initialState
        };
    }
    getState() {
        return this.state;
    }
    updateState(updater) {
        updater(this.state);
    }
    setState(newState) {
        this.state = newState;
    }
    serialize() {
        const serializableState = {
            ...this.state,
            visitedScenes: Array.from(this.state.visitedScenes || [])
        };
        return JSON.stringify(serializableState);
    }
    deserialize(serializedState) {
        const parsedState = JSON.parse(serializedState);
        this.state = {
            ...parsedState,
            visitedScenes: new Set(parsedState.visitedScenes || [])
        };
    }
}
