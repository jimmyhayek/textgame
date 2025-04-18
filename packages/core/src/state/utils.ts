import { GameState } from './types';
import lodashGet from 'lodash/get';
import lodashSet from 'lodash/set';
import lodashHas from 'lodash/has';
import { produce } from '../utils/immer'; // Předpokládá se, že Immer utilities jsou stále zde

/**
 * Získá hodnotu z herního stavu pomocí cesty (dot notation)
 * Používá Lodash get pro pohodlí a robustnost.
 * @template T Typ očekávaného výstupu
 * @param state Herní stav
 * @param path Cesta k hodnotě (např. 'variables.player.health', 'visitedScenes', 'somePluginData.config.value')
 * @param defaultValue Výchozí hodnota, pokud cesta neexistuje nebo je výsledek undefined.
 * @returns Hodnota proměnné nebo defaultValue, pokud je poskytnuto.
 */
export function getStatePath<T>(state: GameState<any>, path: string, defaultValue?: T): T | undefined {
    // Lodash get umí procházet objekty i pole podle indexu nebo klíče
    return lodashGet(state, path, defaultValue);
}

/**
 * Nastaví hodnotu v herním stavu pomocí cesty (dot notation)
 * Tato funkce by se měla používat *uvnitř* `updateState` callbacku,
 * kde pracujete s draftem.
 * @param draftState Draft herního stavu (z Immer produce)
 * @param path Cesta k hodnotě (např. 'variables.player.health', 'somePluginData.config.value')
 * @param value Hodnota k nastavení
 */
export function setStatePath<T extends Record<string, unknown>>(
    draftState: GameState<T>, // Pracuje s draftem!
    path: string,
    value: any
): void { // V Immer draftu se mutuje in-place, nevrací se nový stav
    // Lodash set umí vytvářet zanořené objekty/pole, pokud neexistují
    lodashSet(draftState, path, value);
}

/**
 * Zkontroluje, zda cesta existuje v herním stavu a hodnota na ní není undefined.
 * Používá Lodash has.
 * @param state Herní stav
 * @param path Cesta k kontrole (např. 'variables.player.health', 'visitedScenes', 'somePluginData.config.value')
 * @returns True pokud cesta existuje a hodnota na ní není undefined.
 */
export function hasStatePath(state: GameState<any>, path: string): boolean {
    // Lodash has kontroluje pouze existenci klíče/indexu na cestě, ne hodnotu != undefined/null
    // Pokud potřebujete zkontrolovat, zda hodnota není undefined/null, použijte getStatePath !== undefined && getStatePath !== null
    return lodashHas(state, path);
}

/**
 * Vytvoří snapshot stavu (hluboká kopie).
 * Umožňuje bezpečně pracovat s kopií stavu, aniž by ovlivňoval aktuální runtime stav.
 * Poznámka: Tato utilita provede hlubokou kopii. Buďte opatrní s velkými nebo složitými stavy.
 * Používá JSON.parse/stringify a ručně zpracovává Set (předpokládá serializovatelný obsah Setu).
 * Pro komplexnější typy (Date, RegExp, Map, třídy) může být nutné použít vlastní rekurzivní klonování nebo specializovanou knihovnu pro deep clone (např. z lodash nebo vlastní implementaci deepClone z utils/object).
 * @param state Herní stav
 * @returns Hluboká kopie stavu.
 */
export function createStateSnapshot<T extends Record<string, unknown>>(state: GameState<T>): GameState<T> {
    // Použijeme JSON.parse/stringify pro hluboké klonování, což je jednoduché pro plain objekty a pole.
    // Je nutné ručně převést Set na Array pro serializaci.
    try {
        const serializableState = {
            ...state,
            // visitedScenes je Set, převedeme na Array pro serializaci
            visitedScenes: Array.from(state.visitedScenes)
        };

        // Stringifikace
        const serialized = JSON.stringify(serializableState);
        // Parsvání
        const parsed = JSON.parse(serialized);

        // Převedeme Array zpět na Set a vrátíme hotový GameState objekt
        return {
            ...parsed,
            visitedScenes: new Set(parsed.visitedScenes) // Convert back to Set
        } as GameState<T>; // Přetypování pro jistotu

    } catch (error) {
        console.error("createStateSnapshot: Failed to create a deep copy of the state.", error);
        // V případě chyby vracíme původní referenci nebo null/undefined?
        // Vrátit původní referenci by porušilo očekávání, že jde o kopii.
        // V závislosti na aplikaci můžete chtít vyhodit chybu.
        throw new Error("Failed to create state snapshot.");
    }
}

/**
 * Porovná dva stavy a vrátí rozdíly.
 * Pomáhá při ladění a sledování změn stavu.
 * Poznámka: Toto porovnání používá JSON.stringify pro hluboké porovnání,
 * což nemusí být vhodné pro všechny datové typy (např. funkce, cirkulární reference) nebo pro velký výkon.
 * Pro robustnější porovnání lze použít dedikovanou deepEqual funkci (např. z lodash nebo vlastní implementaci z utils/object).
 * @param oldState Starý stav
 * @param newState Nový stav
 * @returns Objekt s rozdíly (klíč -> { old: any, new: any }). Zahrnuje rozdíly v visitedScenes (added/removed) a variables.
 */
export function compareStates<T extends Record<string, unknown>>(
    oldState: GameState<T>,
    newState: GameState<T>
): Record<string, any> {
    const differences: Record<string, any> = {};

    // Klíče, které jsou systémové nebo by se neměly přímo porovnávat na první úrovni
    const excludeKeys = ['_metadata'];

    // Kombinace všech klíčů z obou stavů
    const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);


    for (const key of allKeys) {
        if (!excludeKeys.includes(key)) {
            const oldValue = (oldState as any)[key];
            const newValue = (newState as any)[key];

            // Speciální porovnání pro visitedScenes (Set)
            if (key === 'visitedScenes') {
                const oldScenes = oldValue instanceof Set ? Array.from(oldValue) : [];
                const newScenes = newValue instanceof Set ? Array.from(newValue) : [];

                // Porovnáme sady klíčů
                const addedScenes = newScenes.filter(scene => !((oldValue as Set<string>)?.has(scene)));
                const removedScenes = oldScenes.filter(scene => !((newValue as Set<string>)?.has(scene)));

                if (addedScenes.length > 0 || removedScenes.length > 0) {
                    // Logujeme přidané/odebrané prvky Setu
                    differences[key] = { added: addedScenes, removed: removedScenes };
                } else if (oldValue instanceof Set !== newValue instanceof Set) {
                    // Pokud se změnil typ (např. Set na něco jiného)
                    differences[key] = { old: oldValue, new: newValue };
                }


            } else if (key === 'variables') {
                // Porovnání variables (objekt)
                const oldVars = oldValue || {}; // Treat null/undefined as empty object for comparison
                const newVars = newValue || {};
                const variableKeys = new Set([...Object.keys(oldVars), ...Object.keys(newVars)]);
                const changedVars: Record<string, { old: any; new: any }> = {};

                // Projdeme všechny klíče proměnných a porovnáme jejich hodnoty
                for (const varKey of variableKeys) {
                    const oldVal = oldVars[varKey];
                    const newVal = newVars[varKey];

                    // Hluboké porovnání hodnot proměnných pomocí JSON.stringify
                    // Může být neefektivní nebo nesprávné pro některé typy (funkce, instance tříd).
                    // Zvažte použití deepEqual utility z utils/object, pokud je potřeba robustnější porovnání.
                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                        changedVars[varKey] = { old: oldVal, new: newVal };
                    }
                }
                if (Object.keys(changedVars).length > 0) {
                    differences.variables = changedVars;
                }

            } else {
                // Standardní porovnání ostatních vlastností na první úrovni (JSON.stringify)
                // Toto je "hluboké" porovnání hodnot, ne jen referencí.
                if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    differences[key] = { old: oldValue, new: newValue };
                }
            }
        }
    }

    // Můžete přidat logiku pro detekci klíčů, které byly odstraněny v newState
    // Iterace přes oldState klíče a kontrola, zda neexistují v newState
    for (const key in oldState) {
        if (Object.prototype.hasOwnProperty.call(oldState, key) && !excludeKeys.includes(key) && !(key in newState)) {
            // Klíč existoval ve starém stavu, ale neexistuje v novém
            differences[key] = { old: (oldState as any)[key], new: undefined };
        }
    }


    return differences;
}

/**
 * Validuje herní stav a kontroluje základní strukturu a typy klíčových vlastností.
 * @param state Herní stav
 * @returns True pokud je stav validní, jinak False.
 */
export function validateState<T extends Record<string, unknown>>(state: GameState<T>): boolean {
    if (!state || typeof state !== 'object') {
        console.error("Validation failed: State is null, undefined, or not an object.");
        return false;
    }

    // Kontrola základní struktury a typů
    if (!('variables' in state) || typeof state.variables !== 'object' || state.variables === null) {
        console.error("Validation failed: state.variables is missing, not an object, or null.");
        return false;
    }

    if (!('visitedScenes' in state)) {
        console.error("Validation failed: state.visitedScenes is missing.");
        return false;
    }

    // Zajištění, že visitedScenes je Set
    if (!(state.visitedScenes instanceof Set)) {
        // Může se stát po deserializaci, pokud nebyl použit applyPersistentState
        console.warn("Validation warning: state.visitedScenes is not a Set.", state.visitedScenes);
        // Můžeme se pokusit o konverzi nebo to označit jako chybu
        if (Array.isArray(state.visitedScenes)) {
            try {
                state.visitedScenes = new Set(state.visitedScenes);
                console.warn("Validation warning: Successfully converted state.visitedScenes from Array to Set.");
            } catch (e) {
                console.error("Validation failed: Error converting state.visitedScenes from Array to Set.", e);
                return false;
            }
        } else {
            console.error("Validation failed: state.visitedScenes is neither a Set nor an Array.");
            return false;
        }
    }

    // Další vlastní validační logiku můžete přidat zde
    // Např. kontrola existence a typu specifických pluginových dat
    // if ('myPluginData' in state && (typeof state.myPluginData !== 'object' || state.myPluginData === null)) {
    //      console.error("Validation failed: state.myPluginData is not an object.");
    //      return false;
    // }


    return true;
}
