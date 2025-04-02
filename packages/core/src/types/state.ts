export interface GameState {
    visitedScenes: Set<string>;
    variables: Record<string, any>;
    [key: string]: any;
}