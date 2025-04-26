import { PersistedState, StateMigrationFn } from './types';

/**
 * Vytvoří migrační funkci pro přejmenování vlastnosti na dané cestě v persistovaném stavu.
 * Používá standardní JS/lodash operace na plain objektu (PersistedState).
 * @param oldPath Původní cesta k vlastnosti (dot notation, např. 'variables.player.name' nebo 'inventory')
 * @param newPath Nová cesta k vlastnosti (dot notation)
 * @returns Migrační funkce
 */
export function createRenameMigration(oldPath: string, newPath: string): StateMigrationFn {
  return (state, fromVersion, toVersion) => {
    // Vytvoříme kopii stavu, aby migrační funkce byly immutable ve svém vstupu
    // a neměnily původní objekt předávaný do migrate().
    // Aplikace Immer produce by zde byla náročnější, ale bezpečnější pro složité struktury.
    // Pro jednoduché plain objekty stačí spread.
    const newState = { ...state }; // Kopie první úrovně

    // Implementace pro zanořené cesty
    const oldPathParts = oldPath.split('.');
    const newPathParts = newPath.split('.');

    let currentOld: any = newState;
    let parentOfOld: any = null;
    let oldKey: string | undefined;

    // Najdeme hodnotu na staré cestě a rodiče
    for (let i = 0; i < oldPathParts.length; i++) {
      oldKey = oldPathParts[i];
      if (currentOld === undefined || currentOld === null || typeof currentOld !== 'object') {
        console.warn(
          `Migration Warning (v${fromVersion} to v${toVersion}): Path segment '${oldPathParts[i]}' in old path '${oldPath}' is not an object. Skipping rename.`
        );
        return state; // Cesta se zlomila, nic neděláme
      }
      if (i < oldPathParts.length - 1) {
        parentOfOld = currentOld;
        currentOld = currentOld[oldKey];
      } else {
        currentOld = currentOld[oldKey]; // Hodnota na konci staré cesty
      }
    }

    // Pokud hodnota na staré cestě existuje (není undefined), provedeme přenos
    if (currentOld !== undefined) {
      // Vytvoříme novou strukturu pro novou cestu, pokud neexistuje
      let currentNew: any = newState;
      for (let i = 0; i < newPathParts.length - 1; i++) {
        const newKeyPart = newPathParts[i];
        if (
          currentNew[newKeyPart] === undefined ||
          currentNew[newKeyPart] === null ||
          typeof currentNew[newKeyPart] !== 'object'
        ) {
          currentNew[newKeyPart] = {}; // Vytvoříme zanořený objekt
        }
        currentNew = currentNew[newKeyPart];
      }

      // Nastavíme hodnotu na nové cestě
      const newKey = newPathParts[newPathParts.length - 1];
      currentNew[newKey] = currentOld;

      // Odstraníme hodnotu na staré cestě, pokud existuje rodič a klíč
      if (parentOfOld && oldKey !== undefined && typeof parentOfOld === 'object') {
        delete parentOfOld[oldKey];
      } else if (oldKey !== undefined && parentOfOld === null) {
        // Případ, kdy stará cesta začíná přímo na kořeni (např. 'myOldProp')
        delete newState[oldKey];
      }

      console.log(
        `Migration Applied (v${fromVersion} to v${toVersion}): Renamed '${oldPath}' to '${newPath}'`
      );
    } else {
      console.warn(
        `Migration Warning (v${fromVersion} to v${toVersion}): Value at old path '${oldPath}' is undefined. Skipping rename.`
      );
    }

    return newState; // Vracíme (modifikovaný) objekt stavu
  };
}

/**
 * Vytvoří migrační funkci pro transformaci hodnoty na dané cestě v persistovaném stavu.
 * @template T Původní typ hodnoty na cestě
 * @template U Nový typ hodnoty na cestě
 * @param path Cesta k hodnotě (dot notation)
 * @param transformFn Funkce pro transformaci hodnoty (oldValue: T => newValue: U)
 * @returns Migrační funkce
 */
export function createTransformMigration<T, U>(
  path: string,
  transformFn: (oldValue: T) => U
): StateMigrationFn {
  return (state, fromVersion, toVersion) => {
    const newState = { ...state }; // Kopie první úrovně
    const pathParts = path.split('.');
    let current: any = newState;
    let parent: any = null;
    let key: string | undefined;

    // Najdeme hodnotu na cestě a rodiče
    for (let i = 0; i < pathParts.length; i++) {
      key = pathParts[i];
      if (current === undefined || current === null || typeof current !== 'object') {
        console.warn(
          `Migration Warning (v${fromVersion} to v${toVersion}): Path segment '${pathParts[i]}' in path '${path}' is not an object. Skipping transform.`
        );
        return state; // Cesta se zlomila, nic neděláme
      }
      if (i < pathParts.length - 1) {
        parent = current;
        current = current[key];
      } else {
        parent = current; // Rodič je objekt před posledním klíčem
        current = current[key]; // Hodnota na konci cesty
      }
    }

    // Pokud hodnota na cestě existuje (není undefined) a rodič je objekt, provedeme transformaci
    if (current !== undefined && parent && key !== undefined && typeof parent === 'object') {
      try {
        parent[key] = transformFn(current as T);
        console.log(
          `Migration Applied (v${fromVersion} to v${toVersion}): Transformed value at '${path}'`
        );
      } catch (error) {
        console.error(
          `Migration Error (v${fromVersion} to v${toVersion}): Failed to transform value at '${path}'.`,
          error
        );
        // Můžete se rozhodnout vyhodit chybu nebo jen zalogovat a vrátit původní stav
        // throw error; // Vyhození chyby zastaví migrační proces
      }
    } else {
      console.warn(
        `Migration Warning (v${fromVersion} to v${toVersion}): Value at path '${path}' is undefined or path invalid. Skipping transform.`
      );
    }

    return newState; // Vracíme (modifikovaný) objekt stavu
  };
}

/**
 * Vytvoří migrační funkci pro přidání nové vlastnosti s výchozí hodnotou na dané cestě, pokud neexistuje.
 * Vytvoří zanořené objekty na cestě, pokud je to nutné.
 * @template T Typ výchozí hodnoty
 * @param path Cesta k nové vlastnosti (dot notation)
 * @param defaultValue Výchozí hodnota
 * @returns Migrační funkce
 */
export function createAddPropertyMigration<T>(path: string, defaultValue: T): StateMigrationFn {
  return (state, fromVersion, toVersion) => {
    const newState = { ...state }; // Kopie první úrovně
    const pathParts = path.split('.');
    let current: any = newState;
    let parent: any = null;
    let key: string | undefined;

    // Projdeme cestu a vytvoříme zanořené objekty
    for (let i = 0; i < pathParts.length; i++) {
      key = pathParts[i];
      if (current === undefined || current === null || typeof current !== 'object') {
        // Nelze pokračovat po neobjektové hodnotě, cesta pro přidání není platná v této struktuře
        console.warn(
          `Migration Warning (v${fromVersion} to v${toVersion}): Cannot add property at invalid path '${path}'. Path segment '${pathParts[i]}' is not an object.`
        );
        return state;
      }
      if (i < pathParts.length - 1) {
        parent = current;
        // Pokud neexistuje další zanořený objekt nebo není objekt, vytvoříme ho
        if (
          current[key] === undefined ||
          current[key] === null ||
          typeof current[key] !== 'object'
        ) {
          current[key] = {};
        }
        current = current[key];
      } else {
        // Jsme na poslední úrovni, kde má být vlastnost přidána
        parent = current;
        current = current[key]; // Toto je hodnota, kterou chceme zkontrolovat, zda existuje
      }
    }

    // Pokud vlastnost na cílové cestě neexistuje (je undefined), přidáme ji
    if (current === undefined && parent && key !== undefined && typeof parent === 'object') {
      parent[key] = defaultValue;
      console.log(
        `Migration Applied (v${fromVersion} to v${toVersion}): Added new property at '${path}'`
      );
    } else {
      // Vlastnost už existuje nebo cesta byla nevalidní (varování již zalogováno výše)
      if (current !== undefined) {
        console.warn(
          `Migration Warning (v${fromVersion} to v${toVersion}): Property at '${path}' already exists. Skipping add.`
        );
      }
    }

    return newState; // Vracíme (modifikovaný) objekt stavu
  };
}

/**
 * Vytvoří migrační funkci pro odstranění vlastnosti na dané cestě v persistovaném stavu.
 * @param path Cesta k vlastnosti (dot notation)
 * @returns Migrační funkce
 */
export function createRemovePropertyMigration(path: string): StateMigrationFn {
  return (state, fromVersion, toVersion) => {
    const newState = { ...state }; // Kopie první úrovně
    const pathParts = path.split('.');
    let current: any = newState;
    let parent: any = null;
    let key: string | undefined;

    // Najdeme rodiče a klíč cesty
    for (let i = 0; i < pathParts.length; i++) {
      key = pathParts[i];
      if (current === undefined || current === null || typeof current !== 'object') {
        console.warn(
          `Migration Warning (v${fromVersion} to v${toVersion}): Path segment '${pathParts[i]}' in path '${path}' is not an object. Skipping remove.`
        );
        return state; // Cesta se zlomila, nic neděláme
      }
      if (i < pathParts.length - 1) {
        parent = current;
        current = current[key];
      } else {
        parent = current; // Rodič je objekt před posledním klíčem
        current = current[key]; // Toto je hodnota, kterou chceme zkontrolovat, zda existuje k odstranění
      }
    }

    // Pokud vlastnost existuje (není undefined) a rodič je objekt, odstraníme ji
    if (current !== undefined && parent && key !== undefined && typeof parent === 'object') {
      delete parent[key];
      console.log(
        `Migration Applied (v${fromVersion} to v${toVersion}): Removed property at '${path}'`
      );
    } else {
      console.warn(
        `Migration Warning (v${fromVersion} to v${toVersion}): Property at '${path}' does not exist or path invalid. Skipping remove.`
      );
    }

    return newState; // Vracíme (modifikovaný) objekt stavu
  };
}

/**
 * Kombinuje více migračních funkcí do jedné.
 * Aplikuje funkce postupně v pořadí, v jakém jsou zadány.
 * @param migrations Pole migračních funkcí
 * @returns Kombinovaná migrační funkce
 */
export function combineMigrations(...migrations: StateMigrationFn[]): StateMigrationFn {
  return (state, fromVersion, toVersion) => {
    let currentState = state;
    for (const migration of migrations) {
      // Každá migrace pracuje na výstupu té předchozí
      currentState = migration(currentState, fromVersion, toVersion);
    }
    return currentState;
  };
}

/**
 * Vytvoří migrační funkci, která aplikuje libovolnou transformaci na celý persistovaný stav.
 * @param transformFn Funkce pro transformaci celého stavu (state: PersistedState<unknown> => PersistedState<unknown>)
 * @returns Migrační funkce
 */
export function createStateMigration(
  transformFn: (state: PersistedState<unknown>) => PersistedState<unknown>
): StateMigrationFn {
  return (state, fromVersion, toVersion) => {
    try {
      const newState = transformFn(state);
      console.log(
        `Migration Applied (v${fromVersion} to v${toVersion}): Applied custom state transformation.`
      );
      return newState;
    } catch (error) {
      console.error(
        `Migration Error (v${fromVersion} to v${toVersion}): Error during custom state transformation.`,
        error
      );
      // Propagace chyby, aby se migrační proces zastavil
      throw error;
    }
  };
}

// Speciální utility pro migraci variables (zde jako aliasy pro obecnější funkce)
// Tyto předpokládají, že proměnné jsou přímo na první úrovni 'variables'.
export const createVariableRenameMigration = (oldName: string, newName: string) =>
  createRenameMigration(`variables.${oldName}`, `variables.${newName}`);

export const createVariableTransformMigration = <T, U>(
  name: string,
  transformFn: (oldValue: T) => U
) => createTransformMigration<T, U>(`variables.${name}`, transformFn);

export const createAddVariableMigration = <T>(name: string, defaultValue: T) =>
  createAddPropertyMigration(`variables.${name}`, defaultValue);

export const createRemoveVariableMigration = (name: string) =>
  createRemovePropertyMigration(`variables.${name}`);
