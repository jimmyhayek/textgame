import { EventEmitter } from './EventEmitter';
import { GameEventType, EventListener } from './types';

/**
 * Vytvoří funkci, která spojí více posluchačů do jednoho
 *
 * @param listeners Pole posluchačů k spojení
 * @returns Funkce, která volá všechny zadané posluchače
 */
export function combineListeners(listeners: EventListener[]): EventListener {
    return (data: any) => {
        for (const listener of listeners) {
            listener(data);
        }
    };
}

/**
 * Vytvoří předfiltrovaného posluchače, který se volá pouze pokud data splňují podmínku
 *
 * @param listener Původní posluchač
 * @param filter Funkce, která určuje, zda se posluchač zavolá
 * @returns Nový posluchač s filtrem
 */
export function createFilteredListener(
    listener: EventListener,
    filter: (data: any) => boolean
): EventListener {
    return (data: any) => {
        if (filter(data)) {
            listener(data);
        }
    };
}

/**
 * Vytvoří posluchače, který se automaticky odregistruje po N voláních
 *
 * @param emitter Instance EventEmitter
 * @param eventType Typ události
 * @param listener Původní posluchač
 * @param count Počet volání před odregistrací
 * @returns Nový posluchač, který se sám odregistruje
 */
export function createCountLimitedListener(
    emitter: EventEmitter,
    eventType: GameEventType,
    listener: EventListener,
    count: number
): EventListener {
    let callCount = 0;

    const wrappedListener: EventListener = (data: any) => {
        listener(data);
        callCount++;

        if (callCount >= count) {
            emitter.off(eventType, wrappedListener);
        }
    };

    return wrappedListener;
}

/**
 * Vytvoří debounced verzi posluchače, která se volá maximálně jednou za daný interval
 *
 * @param listener Původní posluchač
 * @param wait Čekací doba v milisekundách
 * @returns Debounced posluchač
 */
export function createDebouncedListener(
    listener: EventListener,
    wait: number
): EventListener {
    let timeout: any = null;

    return (data: any) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            listener(data);
        }, wait);
    };
}

/**
 * Vytvoří throttled verzi posluchače, která se volá maximálně jednou za daný interval
 *
 * @param listener Původní posluchač
 * @param limit Minimální interval mezi voláními v milisekundách
 * @returns Throttled posluchač
 */
export function createThrottledListener(
    listener: EventListener,
    limit: number
): EventListener {
    let waiting = false;
    let lastData: any = null;

    return (data: any) => {
        if (!waiting) {
            listener(data);
            waiting = true;
            setTimeout(() => {
                waiting = false;
                if (lastData !== null) {
                    const currentData = lastData;
                    lastData = null;
                    listener(currentData);
                }
            }, limit);
        } else {
            lastData = data;
        }
    };
}

/**
 * Zabalí posluchače událostí tak, aby se vykonával asynchronně
 *
 * @param listener Původní posluchač
 * @returns Asynchronní posluchač
 */
export function createAsyncListener(listener: EventListener): EventListener {
    return (data: any) => {
        setTimeout(() => {
            listener(data);
        }, 0);
    };
}