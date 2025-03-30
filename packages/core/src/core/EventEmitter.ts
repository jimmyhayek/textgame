import { GameEventType, EventListener } from '../types';

export class EventEmitter {
    private listeners: Map<GameEventType, Set<EventListener>> = new Map();

    public on(eventType: GameEventType, listener: EventListener): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)!.add(listener);
    }

    public off(eventType: GameEventType, listener: EventListener): void {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            eventListeners.delete(listener);
        }
    }

    public emit(eventType: GameEventType, data?: any): void {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            for (const listener of eventListeners) {
                listener(data);
            }
        }
    }
}