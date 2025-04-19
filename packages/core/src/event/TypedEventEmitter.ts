import { EventEmitter } from './EventEmitter';

/**
 * Typově bezpečný EventEmitter
 * @template T Mapa typů eventů na jejich datové typy
 */
export class TypedEventEmitter<T extends Record<string, any>> {
    private emitter: EventEmitter;

    constructor(emitter: EventEmitter) { // Přijímá existující EventEmitter
        this.emitter = emitter;
    }

    public on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        this.emitter.on(event as string, listener);
    }

    public once<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        this.emitter.once(event as string, listener);
    }

    public off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        this.emitter.off(event as string, listener);
    }

    public emit<K extends keyof T>(event: K, data: T[K]): void {
        this.emitter.emit(event as string, data);
    }

    public listenerCount<K extends keyof T>(event: K): number {
        return this.emitter.listenerCount(event as string);
    }

    public removeAllListeners<K extends keyof T>(event?: K): void {
        this.emitter.removeAllListeners(event as string | undefined);
    }

    public setMaxListeners(n: number): void {
        this.emitter.setMaxListeners(n);
    }

    public getUnderlyingEmitter(): EventEmitter {
        return this.emitter;
    }
}