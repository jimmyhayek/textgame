// Export runtime typů
export * from './types';

// Export hlavního runtime správce stavu
export { GameStateManager } from './GameStateManager';

// Export obecných runtime utilit pro stav
export * from './utils';

// Export všeho z persistence podsložky
// Tím se persistence služby a typy stávají součástí veřejného API modulu 'state'
export * from './persistence';
