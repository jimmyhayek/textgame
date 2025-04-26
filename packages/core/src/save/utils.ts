import { GameEngine } from '../engine/GameEngine';
import { SaveManager } from './SaveManager';
import { SaveStorage, AutoSaveOptions } from './types';
import { MemoryStorage } from './MemoryStorage';
import { LocalStorageProxy } from './LocalStorageProxy';

/**
 * Možnosti pro vytvoření SaveManageru
 */
export interface CreateSaveManagerOptions {
  /**
   * Úložiště pro uložené hry
   */
  storage?: SaveStorage;

  /**
   * Verze enginu
   */
  engineVersion?: string;

  /**
   * Zda automaticky aktivovat automatické ukládání
   */
  enableAutoSave?: boolean;

  /**
   * Interval automatického ukládání v milisekundách
   */
  autoSaveInterval?: number;

  /**
   * Počet slotů pro automatické ukládání
   */
  autoSaveSlots?: number;

  /**
   * Prefix pro klíče v localStorage (pouze pro localStorage úložiště)
   */
  storagePrefix?: string;

  /**
   * Typ úložiště
   * 'memory' - uložení do paměti (pouze pro běh aplikace)
   * 'localStorage' - uložení do localStorage prohlížeče
   * Výchozí: 'localStorage'
   */
  storageType?: 'memory' | 'localStorage';
}

/**
 * Vytvoří SaveManager s předkonfigurovaným nastavením
 *
 * @param engine Instance herního enginu
 * @param options Možnosti pro vytvoření SaveManageru
 * @returns Instance SaveManageru
 */
export function createSaveManager(
  engine: GameEngine,
  options: CreateSaveManagerOptions = {}
): SaveManager {
  // Vytvoření úložiště, pokud není specifikováno
  let storage = options.storage;
  if (!storage) {
    const storageType = options.storageType || 'localStorage';
    if (storageType === 'memory') {
      storage = new MemoryStorage();
    } else {
      storage = new LocalStorageProxy({ prefix: options.storagePrefix });
    }
  }

  // Získání verze enginu z enginu, pokud existuje metoda getVersion
  const engineVersion =
    options.engineVersion ||
    (typeof engine.getVersion === 'function' ? engine.getVersion() : '0.1.0');

  // Vytvoření SaveManageru
  const saveManager = new SaveManager(engine, {
    storage,
    engineVersion,
  });

  // Aktivace automatického ukládání, pokud je požadováno
  if (options.enableAutoSave) {
    const autoSaveOptions: AutoSaveOptions = {};

    if (options.autoSaveInterval) {
      autoSaveOptions.interval = options.autoSaveInterval;
    }

    if (options.autoSaveSlots) {
      autoSaveOptions.slots = options.autoSaveSlots;
    }

    saveManager.enableAutoSave(autoSaveOptions);
  }

  return saveManager;
}

/**
 * Validuje data uložené hry
 *
 * @param saveData Data k validaci
 * @returns True pokud jsou data validní, jinak false
 */
export function validateSaveData(saveData: any): boolean {
  if (!saveData || typeof saveData !== 'object') {
    return false;
  }

  // Kontrola existence a typu požadovaných vlastností
  if (!saveData.metadata || typeof saveData.metadata !== 'object') {
    return false;
  }

  if (typeof saveData.state !== 'string') {
    return false;
  }

  // Kontrola požadovaných polí metadat
  const requiredMetadataFields = ['id', 'name', 'createdAt', 'updatedAt', 'saveVersion'];
  for (const field of requiredMetadataFields) {
    if (!(field in saveData.metadata)) {
      return false;
    }
  }

  return true;
}

/**
 * Vytvoří jedinečné ID pro uloženou hru
 *
 * @param prefix Volitelný prefix
 * @returns Jedinečné ID
 */
export function generateSaveId(prefix: string = 'save'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Převede čas hraní z milisekund na formátovaný řetězec
 *
 * @param timeMs Čas v milisekundách
 * @param format Formát výstupu ('short', 'medium', 'long')
 * @returns Naformátovaný řetězec
 */
export function formatPlayTime(
  timeMs: number,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const seconds = Math.floor((timeMs / 1000) % 60);
  const minutes = Math.floor((timeMs / (1000 * 60)) % 60);
  const hours = Math.floor(timeMs / (1000 * 60 * 60));
  const days = Math.floor(timeMs / (1000 * 60 * 60 * 24));

  switch (format) {
    case 'short':
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    case 'long':
      let parts = [];
      if (days > 0) parts.push(`${days} ${days === 1 ? 'den' : 'dnů'}`);
      if (hours > 0) parts.push(`${hours} ${getHoursText(hours)}`);
      if (minutes > 0) parts.push(`${minutes} ${getMinutesText(minutes)}`);
      if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds} ${getSecondsText(seconds)}`);
      }
      return parts.join(', ');
    case 'medium':
    default:
      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
      ].join(':');
  }
}

// Pomocné funkce pro českou lokalizaci
function getHoursText(hours: number): string {
  if (hours === 1) return 'hodina';
  if (hours >= 2 && hours <= 4) return 'hodiny';
  return 'hodin';
}

function getMinutesText(minutes: number): string {
  if (minutes === 1) return 'minuta';
  if (minutes >= 2 && minutes <= 4) return 'minuty';
  return 'minut';
}

function getSecondsText(seconds: number): string {
  if (seconds === 1) return 'sekunda';
  if (seconds >= 2 && seconds <= 4) return 'sekundy';
  return 'sekund';
}

/**
 * Exportuje uloženou hru do souboru
 *
 * @param saveData Data uložené hry
 * @param filename Název souboru
 */
export function exportSaveToFile(saveData: any, filename: string = 'save.json'): void {
  if (typeof window === 'undefined') {
    console.warn('Export to file is only available in browser environment');
    return;
  }

  try {
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    // Uvolnění URL po stažení
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Failed to export save file:', error);
  }
}

/**
 * Importuje uloženou hru ze souboru
 *
 * @param file Soubor k importu
 * @returns Promise rozhodnutý na data uložené hry
 */
export function importSaveFromFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        const saveData = JSON.parse(content);

        if (!validateSaveData(saveData)) {
          reject(new Error('Invalid save file format'));
          return;
        }

        resolve(saveData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsText(file);
  });
}
