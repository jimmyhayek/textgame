/**
 * Generuje jedinečný identifikátor (UUID v4)
 *
 * @returns Jedinečný identifikátor
 */
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Generuje krátký identifikátor (8 znaků)
 *
 * @param prefix Volitelný prefix pro ID
 * @returns Krátký jedinečný identifikátor
 */
export function generateShortId(prefix?: string): string {
    const randomPart = Math.random().toString(36).substring(2, 8);
    return prefix ? `${prefix}_${randomPart}` : randomPart;
}

/**
 * Kontroluje, zda řetězec je validní UUID
 *
 * @param id Řetězec k kontrole
 * @returns True pokud je validní UUID
 */
export function isValidUUID(id: string): boolean {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return pattern.test(id);
}