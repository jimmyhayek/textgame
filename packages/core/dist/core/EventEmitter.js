"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(listener);
    }
    off(eventType, listener) {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            eventListeners.delete(listener);
        }
    }
    emit(eventType, data) {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            for (const listener of eventListeners) {
                listener(data);
            }
        }
    }
}
exports.EventEmitter = EventEmitter;
