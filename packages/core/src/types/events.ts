export type GameEventType =
    | 'sceneChanged'
    | 'stateChanged'
    | 'gameStarted'
    | 'gameEnded'
    | 'effectApplied'
    | string;

export type EventListener = (data: any) => void;

export interface SceneChangedEventData {
    scene: any;
    transitionData?: any;
}

export interface GameStartedEventData {
    sceneKey: string;
    transitionData?: any;
}

export interface EffectAppliedEventData {
    effect: any;
    state: any;
}