// Export typů
export * from './types';

// Export hlavních tříd
export { SaveManager } from './SaveManager';
export { MemoryStorage } from './MemoryStorage';

// Export utilit
export {
    createSaveManager,
    validateSaveData,
    generateSaveId,
    formatPlayTime,
    exportSaveToFile,
    importSaveFromFile
} from './utils';