import { GameEventType, EventListener, EventEmitterOptions } from './types';

/**
 * EventEmitter implementuje návrhový vzor Observer
 * Umožňuje registraci posluchačů událostí a emitování událostí
 */
export class EventEmitter {
    /**
     * Mapa posluchačů událostí
     * Klíč je typ události, hodnota je množina posluchačů
     */
    private listeners: Map<GameEventType, Set<EventListener>> = new Map();

    /**
     * Mapa jednorázových posluchačů událostí
     * Posluchači jsou automaticky odstraněni po prvním zavolání
     */
    private onceListeners: Map<GameEventType, Set<EventListener>> = new Map();

    /**
     * Maximální počet posluchačů na jeden typ události
     */
    private maxListeners: number;

    /**
     * Zda zachytávat chyby v posluchačích
     */
    private catchErrors: boolean;

    /**
     * Vytvoří nový EventEmitter
     *
     * @param options Možnosti konfigurace EventEmitter
     */
    constructor(options: EventEmitterOptions = {}) {
        const { catchErrors = true, maxListeners = 10 } = options;
        this.catchErrors = catchErrors;
        this.maxListeners = maxListeners;
    }

    /**
     * Registruje posluchače pro daný typ události
     *
     * @param eventType Typ události
     * @param listener Funkce posluchače
     */
    public on(eventType: GameEventType, listener: EventListener): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }

        const eventListeners = this.listeners.get(eventType)!;
        eventListeners.add(listener);

        // Kontrola počtu posluchačů
        if (eventListeners.size > this.maxListeners) {
            console.warn(`Possible EventEmitter memory leak detected. ${eventListeners.size} listeners added for event type '${eventType}'`);
        }
    }

    /**
     * Registruje jednorázového posluchače pro daný typ události
     * Posluchač bude automaticky odstraněn po prvním zavolání
     *
     * @param eventType Typ události
     * @param listener Funkce posluchače
     */
    public once(eventType: GameEventType, listener: EventListener): void {
        if (!this.onceListeners.has(eventType)) {
            this.onceListeners.set(eventType, new Set());
        }

        const eventListeners = this.onceListeners.get(eventType)!;
        eventListeners.add(listener);
    }

    /**
     * Odregistruje posluchače pro daný typ události
     *
     * @param eventType Typ události
     * @param listener Funkce posluchače
     */
    public off(eventType: GameEventType, listener: EventListener): void {
        // Kontrola běžných posluchačů
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            eventListeners.delete(listener);
            if (eventListeners.size === 0) {
                this.listeners.delete(eventType);
            }
        }

        // Kontrola jednorázových posluchačů
        const onceEventListeners = this.onceListeners.get(eventType);
        if (onceEventListeners) {
            onceEventListeners.delete(listener);
            if (onceEventListeners.size === 0) {
                this.onceListeners.delete(eventType);
            }
        }
    }

    /**
     * Emituje událost daného typu s volitelným datovým objektem
     *
     * @param eventType Typ události
     * @param data Volitelná data předaná posluchačům
     */
    public emit(eventType: GameEventType, data?: any): void {
        // Zavolání běžných posluchačů
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            this.callListeners(eventListeners, data);
        }

        // Zavolání a odstranění jednorázových posluchačů
        const onceEventListeners = this.onceListeners.get(eventType);
        if (onceEventListeners && onceEventListeners.size > 0) {
            this.callListeners(onceEventListeners, data);
            this.onceListeners.delete(eventType);
        }
    }

    /**
     * Volá všechny posluchače v dané množině s danými daty
     *
     * @param listeners Množina posluchačů
     * @param data Data k předání posluchačům
     * @private
     */
    private callListeners(listeners: Set<EventListener>, data: any): void {
        for (const listener of listeners) {
            try {
                listener(data);
            } catch (error) {
                if (!this.catchErrors) {
                    throw error;
                }
                console.error(`Error in event listener:`, error);
            }
        }
    }

    /**
     * Odstraní všechny posluchače pro daný typ události
     * Pokud není typ události specifikován, odstraní všechny posluchače
     *
     * @param eventType Volitelný typ události
     */
    public removeAllListeners(eventType?: GameEventType): void {
        if (eventType) {
            this.listeners.delete(eventType);
            this.onceListeners.delete(eventType);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }

    /**
     * Vrátí seznam všech registrovaných typů událostí
     *
     * @returns Pole typů událostí
     */
    public getEventTypes(): GameEventType[] {
        const types = new Set([
            ...this.listeners.keys(),
            ...this.onceListeners.keys()
        ]);
        return Array.from(types);
    }

    /**
     * Vrátí počet posluchačů pro daný typ události
     *
     * @param eventType Typ události
     * @returns Počet posluchačů
     */
    public listenerCount(eventType: GameEventType): number {
        let count = 0;

        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            count += eventListeners.size;
        }

        const onceEventListeners = this.onceListeners.get(eventType);
        if (onceEventListeners) {
            count += onceEventListeners.size;
        }

        return count;
    }

    /**
     * Nastaví maximální počet posluchačů na jeden typ události
     *
     * @param n Maximální počet posluchačů
     */
    public setMaxListeners(n: number): void {
        this.maxListeners = n;
    }

    /**
     * Získá maximální počet posluchačů na jeden typ události
     *
     * @returns Maximální počet posluchačů
     */
    public getMaxListeners(): number {
        return this.maxListeners;
    }
}