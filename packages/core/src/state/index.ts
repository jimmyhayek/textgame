// Export typů
export * from './types';

// Export hlavních tříd
export { StateManager } from './StateManager';

// Export utilit
export {
    getStatePath,
    setStatePath,
    hasStatePath,
    createStateSnapshot,
    compareStates,
    validateState
} from './utils';