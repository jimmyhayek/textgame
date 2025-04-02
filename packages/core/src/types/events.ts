export type GameEventType =
    | 'sceneChanged'
    | 'stateChanged'
    | 'choiceSelected'
    | 'gameStarted'
    | 'gameEnded'
    | string;

export type EventListener = (data: any) => void;