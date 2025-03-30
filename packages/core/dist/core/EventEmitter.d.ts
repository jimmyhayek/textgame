import { GameEventType, EventListener } from '../types';
export declare class EventEmitter {
    private listeners;
    on(eventType: GameEventType, listener: EventListener): void;
    off(eventType: GameEventType, listener: EventListener): void;
    emit(eventType: GameEventType, data?: any): void;
}
