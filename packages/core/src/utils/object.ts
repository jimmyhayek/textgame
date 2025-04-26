/**
 * Hluboká kopie objektu
 *
 * @param obj Objekt ke kopírování
 * @returns Hluboká kopie objektu
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Převede Set na Array pro klonování a zpět
  if (obj instanceof Set) {
    return new Set(Array.from(obj).map(item => deepClone(item))) as any;
  }

  // Převede Map na Array pro klonování a zpět
  if (obj instanceof Map) {
    return new Map(
      Array.from(obj.entries()).map(([key, value]) => [deepClone(key), deepClone(value)])
    ) as any;
  }

  // Zpracování Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  // Zpracování RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as any;
  }

  // Zpracování Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }

  // Zpracování obyčejného Object
  const clonedObj = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

/**
 * Hluboké porovnání dvou objektů
 *
 * @param obj1 První objekt
 * @param obj2 Druhý objekt
 * @returns True pokud jsou objekty hluboce rovny
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  // Kontrola primitivních typů a null/undefined
  if (obj1 === obj2) {
    return true;
  }

  // Kontrola, že oba objekty jsou objekty
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  // Speciální ošetření pro Date
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // Speciální ošetření pro RegExp
  if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
    return obj1.toString() === obj2.toString();
  }

  // Speciální ošetření pro Set
  if (obj1 instanceof Set && obj2 instanceof Set) {
    if (obj1.size !== obj2.size) return false;
    for (const item of obj1) {
      let found = false;
      for (const item2 of obj2) {
        if (deepEqual(item, item2)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  // Speciální ošetření pro Map
  if (obj1 instanceof Map && obj2 instanceof Map) {
    if (obj1.size !== obj2.size) return false;
    for (const [key, val1] of obj1.entries()) {
      let found = false;
      for (const [key2, val2] of obj2.entries()) {
        if (deepEqual(key, key2) && deepEqual(val1, val2)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  // Kontrola, že mají stejný konstruktor (jsou stejného typu)
  if (obj1.constructor !== obj2.constructor) {
    return false;
  }

  // Pro pole kontrolujeme délku a každý prvek
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false;
      }
    }
    return true;
  }

  // Pro objekty kontrolujeme klíče a hodnoty
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) {
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Bezpečné získání hodnoty z objektu pomocí cesty (dot notation)
 *
 * @param obj Objekt
 * @param path Cesta k vlastnosti (např. 'user.address.street')
 * @param defaultValue Výchozí hodnota, pokud vlastnost neexistuje
 * @returns Hodnota vlastnosti nebo defaultValue
 */
export function getPath<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
  if (!obj || !path) return defaultValue;

  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }

  return result === undefined ? defaultValue : (result as T);
}

/**
 * Bezpečné nastavení hodnoty v objektu pomocí cesty (dot notation)
 *
 * @param obj Objekt
 * @param path Cesta k vlastnosti (např. 'user.address.street')
 * @param value Hodnota k nastavení
 * @returns Modifikovaný objekt
 */
export function setPath<T>(obj: T, path: string, value: any): T {
  if (!obj || !path) return obj;

  const keys = path.split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Vytvoříme nové zanořené objekty, pokud neexistují
    if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
      current[key] = {};
    }

    current = current[key];
  }

  // Nastavíme hodnotu na poslední úrovni
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return obj;
}
