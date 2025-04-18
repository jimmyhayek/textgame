import { EventEmitter } from './EventEmitter';

/**
 * Typově bezpečný EventEmitter
 * @template T Mapa typů eventů na jejich datové typy
 */
export class TypedEventEmitter<T extends Record<string, any>> {
    private emitter: EventEmitter;

    constructor(emitter?: EventEmitter) {
        this.emitter = emitter || new EventEmitter();
    }

    /**
     * Registruje posluchače pro daný typ události
     * @param event Typ události
     * @param listener Funkce volaná při události
     */
    public on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        this.emitter.on(event as string, listener);
    }

    /**
     * Registruje jednorázového posluchače pro daný typ události
     * @param event Typ události
     * @param listener Funkce volaná při události
     */
    public once<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        this.emitter.once(event as string, listener);
    }

    /**
     * Odregistruje posluchače pro daný typ události
     * @param event Typ události
     * @param listener Funkce volaná při události
     */
    public off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        this.emitter.off(event as string, listener);
    }

    /**
     * Emituje událost daného typu
     * @param event Typ události
     * @param data Data události
     */
    public emit<K extends keyof T>(event: K, data: T[K]): void {
        this.emitter.emit(event as string, data);
    }

    /**
     * Vrátí počet posluchačů pro daný typ události
     * @param event Typ události
     */
    public listenerCount<K extends keyof T>(event: K): number {
        return this.emitter.listenerCount(event as string);
    }

    /**
     * Odstraní všechny posluchače pro daný typ události
     * @param event Volitelný typ události
     */
    public removeAllListeners<K extends keyof T>(event?: K): void {
        this.emitter.removeAllListeners(event as string | undefined);
    }

    /**
     * Nastaví maximální počet posluchačů na jeden typ události
     * @param n Maximální počet posluchačů
     */
    public setMaxListeners(n: number): void {
        this.emitter.setMaxListeners(n);
    }

    /**
     * Získá podkladový EventEmitter
     * @returns EventEmitter
     */
    public getUnderlyingEmitter(): EventEmitter {
        return this.emitter;
    }
}