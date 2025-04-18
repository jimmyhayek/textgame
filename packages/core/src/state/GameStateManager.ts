import {
    GameState,
    GameStateManagerOptions,
    DEFAULT_PERSISTENT_KEYS,
    StateChangedEvent,
    GameStateManagerEvents
} from './types'; lu
import { PersistedState } from './persistence/types'; // Import Persistence types z 'state/persistence' podsložky
import { produce } from '../utils/immer';
import { TypedEventEmitter } from '../event/TypedEventEmmitter';
import { validateState } from './utils'; // Import validation utility z 'state' utilit

/**
 * Spravuje herní stav s důrazem na neměnnost.
 * Zaměřuje se na runtime reprezentaci a modifikaci stavu ve paměti.
 * Zodpovědnost za serializaci, deserializaci a migraci je delegována
 * na služby v modulu `state/persistence`.
 * GameStateManager uchovává aktuální runtime stav a konfiguraci perzistentních klíčů.
 * @template T Typ proměnných ve stavu
 */
export class GameStateManager<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Herní stav (runtime reprezentace ve paměti)
     */
    private state: GameState<T>;

    /**
     * Seznam klíčů na nejvyšší úrovni GameState, které by měly být
     * zahrnuty při vytváření serializovatelné reprezentace stavu (PersistedState).
     * Tuto konfiguraci spravuje GameStateManager.
     */
    private persistentKeys: string[];

    /**
     * Event emitter pro události GameStateManageru (runtime události, např. stateChanged).
     * Události související s persistencí by měl emitovat SaveManager nebo StateConverter.
     */
    private eventEmitter: TypedEventEmitter<GameStateManagerEvents<T>>;

    /**
     * Callback volaný před serializací stavu.
     * Tento callback je zde pro zachování možnosti provést přípravu stavu
     * před jeho předáním persistence vrstvě (např. v SaveManageru).
     * Měl by být volán z kódu, který provádí serializaci (např. SaveManager).
     */
    private onBeforeSerialize?: (state: GameState<T>) => void;

    /**
     * Callback volaný po deserializaci stavu a jeho úspěšné aplikaci na GameStateManager.
     * Měl by být volán z kódu, který provádí deserializaci a aplikaci (např. SaveManager po volání applyPersistentState).
     */
    private onAfterDeserialize?: (state: GameState<T>) => void;


    /**
     * Vytvoří novou instanci GameStateManager.
     * Inicializuje stav a konfiguraci perzistentních klíčů.
     * @param options Možnosti konfigurace GameStateManageru.
     */
    constructor(options: GameStateManagerOptions<T> = {}) {
        // Inicializuje stav pomocí createInitialState, které aplikuje defaulty a počáteční stav z options.
        this.state = this.createInitialState(options.initialState || {});
        // Inicializuje perzistentní klíče, buď z options nebo výchozí.
        // Vytvoříme kopii pole pro zajištění, aby externí kód nemohl přímo modifikovat interní pole.
        this.persistentKeys = Array.isArray(options.persistentKeys)
            ? [...options.persistentKeys]
            : [...DEFAULT_PERSISTENT_KEYS];
        this.eventEmitter = new TypedEventEmitter<GameStateManagerEvents<T>>();

        // Tyto callbacky jsou uloženy, aby je volající (např. SaveManager) mohl získat a volat v příslušný čas.
        this.onBeforeSerialize = options.onBeforeSerialize;
        this.onAfterDeserialize = options.onAfterDeserialize;


        // Zajištění, že základní perzistentní klíče (visitedScenes, variables) jsou vždy v seznamu.
        this.ensureDefaultPersistentKeys();
    }

    /**
     * Zajistí, že výchozí perzistentní klíče (visitedScenes, variables) jsou vždy v seznamu `this.persistentKeys`.
     * Voláno v konstruktoru a setPersistentKeys.
     * Modifikuje this.persistentKeys pole (přidává klíče, pokud chybí).
     * @private
     */
    private ensureDefaultPersistentKeys(): void {
        if (!this.persistentKeys.includes('visitedScenes')) {
            this.persistentKeys.push('visitedScenes');
        }
        if (!this.persistentKeys.includes('variables')) {
            this.persistentKeys.push('variables');
        }
        // Případně lze přidat další klíče, které by měly být *vždy* perzistentní.
    }


    /**
     * Vytvoří výchozí herní stav.
     * Používá se při inicializaci StateManageru nebo při resetu stavu.
     * Aplikuje počáteční stav přes základní strukturu a zajišťuje správné typy pro klíčové vlastnosti.
     * @param initialState Počáteční stav k aplikaci přes defaultní strukturu.
     * @returns Nově vytvořený GameState objekt.
     * @private
     */
    private createInitialState(initialState: Partial<GameState<T>>): GameState<T> {
        // Základní struktura stavu s výchozími hodnotami pro klíčové vlastnosti
        const baseState: GameState<T> = {
            visitedScenes: new Set<string>(),
            variables: {} as T,
            // Přidejte zde další výchozí hodnoty pro neperzistentní klíče, pokud existují a jsou součástí základní struktury.
            // Např: someTransientFlag: false, lastErrorMessage: null
        };

        // Aplikuje initialState přes základní strukturu.
        // initialState může přepsat výchozí hodnoty, včetně visitedScenes nebo variables.
        const state = {
            ...baseState,
            ...initialState,
        } as GameState<T>; // Přetypování pro jistotu, pokud initialState přidá dynamické klíče.

        // Explicitně zajistit, že visitedScenes je Set (i když je v baseState, initialState ho může přepsat)
        // Pokud initialState.visitedScenes bylo pole nebo něco jiného, zkusíme z toho vytvořit Set.
        if (!(state.visitedScenes instanceof Set)) {
            console.warn("GameStateManager: Initial state for visitedScenes was not a Set. Attempting to convert to Set.");
            state.visitedScenes = new Set(Array.isArray(state.visitedScenes) ? state.visitedScenes : []);
        }

        // Explicitně zajistit, že variables je objekt (i když je v baseState, initialState ho může přepsat)
        if (typeof state.variables !== 'object' || state.variables === null) {
            console.warn("GameStateManager: Initial state for variables was not an object. Initializing as empty object.");
            state.variables = {} as T;
        }


        return state;
    }


    /**
     * Vrátí aktuální herní stav.
     * Vrácený objekt je neměnný z pohledu Immeru.
     * @returns Aktuální neměnný GameState objekt.
     */
    public getState(): GameState<T> {
        return this.state; // Immer zajišťuje, že state je de facto neměnný externě.
    }

    /**
     * Aktualizuje herní stav pomocí Immer.
     * Funkce `updater` obdrží draft stavu, který lze bezpečně mutovat.
     * Immer na pozadí vytvoří novou neměnnou verzi stavu, pokud dojde ke změnám.
     * Emituje událost `stateChanged`, pokud se stav skutečně změní.
     * @param updater Funkce, která přijme draft stavu a provede v něm změny.
     * @param source Zdroj změny (volitelné, pro účely ladění/sledování, např. 'effect', 'scene').
     */
    public updateState(updater: (state: GameState<T>) => void, source?: string): void {
        const previousState = this.state;

        // Immer produce vytvoří nový, neměnný stav, pokud došlo ke změnám v draftu.
        // Pokud updater nezmění draft, produce vrátí původní referenci (`previousState`).
        this.state = produce(this.state, (draft: GameState<T>) => {
            updater(draft);
        });

        // Emitování události změny stavu pouze pokud se stav skutečně změnil.
        // Immer produce vrací původní objekt, pokud nebyly provedeny žádné změny.
        // Porovnání referencí (`this.state !== previousState`) je správný způsob,
        // jak zjistit, zda se stav "změnil" z pohledu Immer a zda je potřeba emitovat událost.
        if (this.state !== previousState) {
            this.emitStateChanged(previousState, this.state, source || 'update');
        }
    }

    /**
     * Nastaví kompletně nový herní stav.
     * Přímé nahrazení aktuálního stavu novým objektem `newState`.
     * Obchází Immer produce pro tento konkrétní případ.
     * Může být užitečné pro "rollback", nastavení předem připraveného stavu,
     * nebo pro aplikaci stavu, který pochází z důvěryhodného externího zdroje
     * a je již v požadovaném formátu (např. po ruční tvorbě stavu pro testování).
     * **Důležité:** Předpokládá se, že `newState` je buď důvěryhodný immutable objekt,
     * nebo s ním nebude dále mutováno externě po předání do `setState`.
     * @param newState Nový objekt stavu, který se stane aktuálním.
     * @param source Zdroj změny (volitelné).
     */
    public setState(newState: GameState<T>, source?: string): void {
        // Zvažte, zda zde provádět základní validaci vstupního objektu.
        // validatedState utility může pomoci.
        if (!validateState(newState)) {
            console.warn("GameStateManager: Attempted to set state with potentially invalid structure.", newState);
            // Můžete zde rozhodnout, zda vyhodit chybu nebo jen logovat a pokračovat
            // throw new Error("Attempted to set invalid state.");
        }

        const previousState = this.state;
        this.state = newState; // Přímé nahrazení

        // Emitování události změny stavu
        this.emitStateChanged(previousState, this.state, source || 'setState');
    }

    /**
     * Aplikuje data z deserializovaného a migrovaného `PersistedState` na aktuální GameStateManager.
     * Tato metoda by se volala z persistence vrstvy (např. SaveManageru) po úspěšné deserializaci a migraci.
     * Vytvoří *nový* runtime stav objekt (`GameState`) na základě dat z `PersistedState`
     * a nahradí jím aktuální stav GameStateManageru.
     * Zajišťuje správné konverze potřebné pro runtime stav (např. Array -> Set pro visitedScenes).
     * @param persistedStateData Data načtená z persistence (očekává se, že jsou již migrována na aktuální verzi).
     * @param source Zdroj změny (obvykle 'deserialize' nebo 'loadGame').
     */
    public applyPersistentState(persistedStateData: PersistedState<T>, source?: string): void {
        const previousState = this.state;

        // 1. Vytvoření zcela nového GameState objektu z dat z `persistedStateData`.
        // Tím se zajistí, že nepřeneseme neperzistentní data z předchozího `this.state`.
        // Nový objekt se inicializuje s hodnotami pro klíčové persistentní vlastnosti
        // na základě dat z `persistedStateData`.

        const newState: GameState<T> = {
            // visitedScenes: Převede pole stringů (z persistence) zpět na Set<string>.
            // Pokud persistedStateData.visitedScenes neexistuje nebo není pole, použije prázdné pole,
            // což vytvoří prázdný Set.
            visitedScenes: new Set(Array.isArray(persistedStateData.visitedScenes) ? persistedStateData.visitedScenes : []),
            // variables: Použije objekt variables z persistedStateData.
            // Pokud persistedStateData.variables neexistuje nebo není objekt, použije prázdný objekt.
            // Přetypuje na T.
            variables: (typeof persistedStateData.variables === 'object' && persistedStateData.variables !== null ? persistedStateData.variables : {}) as T,
            // Ostatní perzistentní klíče budou přidány v následujícím kroku
            // Neperzistentní klíče, které NEBYLY v persistedStateData, zde NEBUDOU.
            // Pokud by bylo potřeba zachovat hodnoty NEpersistentních klíčů z předchozího stavu
            // při načítání, musela by se zde provést složitější logika sloučení:
            // { ...filterNonPersistentKeys(previousState), ...newStateFromPersistence }
            // Aktuální návrh (nový objekt z persistence dat) je bezpečnější pro čisté načtení stavu.
        } as GameState<T>; // Přetypování na GameState<T>

        // 2. Kopírování dalších perzistentních vlastností z `persistedStateData` do `newState`.
        // Iterujeme přes klíče definované v `this.persistentKeys` GameStateManageru.
        // Tím se zajistí, že do nového runtime stavu se dostanou pouze klíče, které *tento GameStateManager*
        // definuje jako perzistentní, i když `persistedStateData` mohla obsahovat něco navíc
        // (např. stará metadata nebo transientní data z minula z jiného kontextu).
        // Zajišťuje také, že se nekopírují metadata (`_metadata`).
        for (const key of this.persistentKeys) {
            // visitedScenes a variables už jsme zpracovali, přeskočíme je.
            if (key === 'visitedScenes' || key === 'variables') {
                continue;
            }

            // Pokud klíč existuje v načtených perzistentních datech (`persistedStateData`)
            // a není to systémový klíč (_metadata), zkopírujeme jeho hodnotu do nového runtime stavu (`newState`).
            if (key in persistedStateData && key !== '_metadata') {
                // Přístup přes 'any' je nutný kvůli dynamickým klíčům
                (newState as any)[key] = (persistedStateData as any)[key];
            } else {
                // Volitelné: Pokud perzistentní klíč definovaný v GameStateManageru chybí v načtených datech,
                // můžete zde nastavit výchozí hodnotu nebo logovat varování.
                // console.warn(`GameStateManager: Persistent key '${key}' not found in loaded data. Skipping.`);
            }
        }

        // 3. Metadata (`_metadata`) by neměla být v persistentKeys a neměla by se dostat do runtime GameState<T>.
        // Při správném toku StateConverteru by se neměla objevit v datech kopírovaných smyčkou výše.

        // 4. Nastavení nově vytvořeného stavu jako aktuálního stavu GameStateManageru.
        this.state = newState;

        // 5. Volání callbacku po deserializaci (pokud je nastaven a byl předán v konstruktoru GameStateManageru).
        // Tento callback má signature pro GameState, takže je zde volán s novým GameState.
        if (this.onAfterDeserialize) {
            this.onAfterDeserialize(this.state);
        }

        // 6. Emitování události změny stavu.
        // Předchozí stav je ten, který existoval před aplikací perzistentních dat.
        // Zdroj je obvykle 'deserialize' nebo 'loadGame', jak ho předá volající (např. SaveManager).
        this.emitStateChanged(previousState, this.state, source || 'applyPersistentState');
    }


    /**
     * Resetuje stav GameStateManageru na výchozí hodnoty.
     * Vytvoří nový výchozí stav pomocí `createInitialState` a nahradí jím aktuální stav.
     * @param options Částečný stav k nastavení přes výchozí hodnoty po resetu.
     */
    public resetState(options: Partial<GameState<T>> = {}): void {
        const previousState = this.state;
        this.state = this.createInitialState(options); // Vytvoření nového výchozího stavu

        // Emitování události změny stavu
        this.emitStateChanged(previousState, this.state, 'reset');
    }

    /**
     * Sloučí externí částečný stav s aktuálním runtime stavem.
     * Používá `updateState` s Immerem pro vytvoření nového, neměnného stavu.
     * Toto je primárně určeno pro slučování runtime změn (např. z pluginu),
     * nikoliv pro načítání kompletního stavu z persistence (k tomu slouží `applyPersistentState`).
     * @param externalState Částečný stav k sloučení.
     */
    public mergeState(externalState: Partial<GameState<T>>): void {
        // Zvažte, zda zde provést základní validaci externalState
        this.updateState(state => {
            // Sloučení visitedScenes (přidání nových do existujícího Setu)
            if (externalState.visitedScenes) {
                // Zajištění, že externalState.visitedScenes je iterovatelné a konverze na Set, pokud je potřeba
                const scenesToAdd = externalState.visitedScenes instanceof Set
                    ? externalState.visitedScenes
                    : Array.isArray(externalState.visitedScenes)
                        ? new Set(externalState.visitedScenes)
                        : []; // Pokud to není ani Set ani Array, nic nepřidáme

                for (const sceneKey of scenesToAdd) {
                    state.visitedScenes.add(sceneKey);
                }
            }

            // Sloučení variables (přepsání existujících a přidání nových)
            if (externalState.variables && typeof externalState.variables === 'object') {
                // Použití Object.assign provede shallow merge.
                // Pokud variables obsahují zanořené objekty, které potřebujete hluboce sloučit,
                // budete potřebovat rekurzivní merge utility (např. z lodash, ale opatrně s Immerem drafty).
                Object.assign(state.variables, externalState.variables);
                // Alternativně, pokud máte bezpečnou deep merge utilitu pro Immer drafty:
                // mergeDeep(state.variables, externalState.variables);
            }

            // Sloučení ostatních vlastností na první úrovni (ty, které nejsou visitedScenes nebo variables)
            // Iterujeme přes externalState, abychom věděli, co přidat/přepsat v draftu.
            // Kontrola `Object.prototype.hasOwnProperty.call` zajišťuje, že kopírujeme jen vlastní vlastnosti, ne z prototypu.
            for (const key in externalState) {
                if (Object.prototype.hasOwnProperty.call(externalState, key) && key !== 'visitedScenes' && key !== 'variables') {
                    // Přístup k vlastnosti na draftu přes 'any' je nutný kvůli dynamickým klíčům GameState.
                    (state as any)[key] = (externalState as any)[key];
                }
            }
        }, 'mergeState');
    }


    /**
     * Získá hodnotu proměnné ze stavu `state.variables`.
     * @template K Typ klíče proměnné.
     * @param name Název proměnné.
     * @param defaultValue Výchozí hodnota, která se vrátí, pokud proměnná neexistuje nebo je `undefined` nebo `null`.
     * @returns Hodnota proměnné nebo `defaultValue`, pokud je poskytnuto a hodnota je `undefined` nebo `null`.
     */
    public getVariable<K extends keyof T>(name: K, defaultValue?: T[K]): T[K] | undefined {
        // Použití nullish coalescing (??) pro správné vrácení defaultValue pro null/undefined.
        // Pokud hodnota existuje, ale je 0, false nebo '', vrátí se tato hodnota, nikoli defaultValue.
        return this.state.variables[name] ?? defaultValue;
    }

    /**
     * Nastaví hodnotu proměnné ve stavu `state.variables`.
     * Používá `updateState` pro zajištění neměnnosti.
     * @template K Typ klíče proměnné.
     * @param name Název proměnné.
     * @param value Hodnota k nastavení.
     */
    public setVariable<K extends keyof T>(name: K, value: T[K]): void {
        this.updateState(state => {
            // Immer draft umožňuje přímou modifikaci v `state.variables`.
            state.variables[name] = value;
        }, 'setVariable');
    }

    /**
     * Zkontroluje, zda proměnná existuje (není `undefined`) ve stavu `state.variables`.
     * @template K Typ klíče proměnné.
     * @param name Název proměnné.
     * @returns True, pokud proměnná s daným názvem existuje v `state.variables` a její hodnota není `undefined`.
     */
    public hasVariable<K extends keyof T>(name: K): boolean {
        // Kontroluje, zda je klíč přítomen A hodnota není undefined.
        // Pokud byste chtěli kontrolovat pouze přítomnost klíče (včetně `undefined`/`null` hodnot), použijte `name as string in this.state.variables`.
        return this.state.variables[name] !== undefined;
    }

    /**
     * Odebere proměnnou ze stavu `state.variables`.
     * Používá `updateState` pro zajištění neměnnosti.
     * @template K Typ klíče proměnné.
     * @param name Název proměnné k odebrání.
     */
    public removeVariable<K extends keyof T>(name: K): void {
        this.updateState(state => {
            // Použijte `delete` pro odstranění klíče ze `state.variables` draftu.
            delete state.variables[name];
        }, 'removeVariable');
    }


    /**
     * Označí scénu jako navštívenou.
     * Přidá klíč scény do Setu `state.visitedScenes`.
     * Používá `updateState`.
     * @param sceneKey Klíč scény.
     */
    public markSceneVisited(sceneKey: string): void {
        this.updateState(state => {
            // Add metoda Setu je idempotentní (přidání stejného klíče vícekrát nemá efekt).
            state.visitedScenes.add(sceneKey);
        }, 'markSceneVisited');
    }

    /**
     * Zruší označení scény jako navštívené.
     * Odebere klíč scény ze Setu `state.visitedScenes`.
     * Používá `updateState`.
     * @param sceneKey Klíč scény.
     */
    public unmarkSceneVisited(sceneKey: string): void {
        this.updateState(state => {
            // Delete metoda Setu nic nedělá, pokud prvek neexistuje.
            state.visitedScenes.delete(sceneKey);
        }, 'unmarkSceneVisited');
    }

    /**
     * Vyčistí seznam navštívených scén.
     * Nastaví `state.visitedScenes` na prázdný Set.
     * Používá `updateState`.
     */
    public clearVisitedScenes(): void {
        this.updateState(state => {
            state.visitedScenes.clear(); // Clear metoda Setu.
        }, 'clearVisitedScenes');
    }

    /**
     * Zkontroluje, zda scéna byla navštívena.
     * @param sceneKey Klíč scény.
     * @returns True, pokud klíč scény existuje v Setu `state.visitedScenes`.
     */
    public hasVisitedScene(sceneKey: string): boolean {
        return this.state.visitedScenes.has(sceneKey);
    }

    /**
     * Vrátí počet navštívených scén.
     * @returns Počet prvků v Setu `state.visitedScenes`.
     */
    public getVisitedScenesCount(): number {
        return this.state.visitedScenes.size;
    }


    /**
     * Nastaví seznam klíčů na nejvyšší úrovni stavu, které budou persistovány při serializaci.
     * Tato konfigurace je uložena v GameStateManageru a měla by být předána persistence vrstvě
     * při volání serializačních metod.
     * Zajistí, že základní klíče (`visitedScenes`, `variables`) jsou vždy zahrnuty.
     * Emituje událost `persistentKeysChanged`.
     * @param keys Seznam klíčů k nastavení. Měla by to být pole stringů.
     */
    public setPersistentKeys(keys: string[]): void {
        // Vytvoří novou kopii pole pro zajištění neměnnosti pole perzistentních klíčů (externě).
        // Zároveň zajistí, že vstup je pole.
        this.persistentKeys = Array.isArray(keys) ? [...keys] : [];
        // Zajistí, že základní klíče jsou v novém seznamu.
        this.ensureDefaultPersistentKeys();

        // Emitování události o změně perzistentních klíčů s kopií aktuálního seznamu.
        this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
    }

    /**
     * Vrátí seznam klíčů na nejvyšší úrovni stavu, které budou persistovány při serializaci.
     * Tato konfigurace je uložena v GameStateManageru.
     * @returns Kopie pole perzistentních klíčů.
     */
    public getPersistentKeys(): string[] {
        // Vrací kopii pole, aby se externí kód nemohl měnit interní pole přímo.
        return [...this.persistentKeys];
    }

    /**
     * Přidá klíč do seznamu perzistentních klíčů, pokud tam ještě není.
     * Vytvoří nové pole perzistentních klíčů a nahradí stávající.
     * Emituje událost `persistentKeysChanged`, pokud klíč byl přidán.
     * @param key Klíč k přidání.
     */
    public addPersistentKey(key: string): void {
        if (typeof key !== 'string' || key.length === 0) {
            console.warn("GameStateManager: Cannot add invalid persistent key.", key);
            return;
        }
        if (!this.persistentKeys.includes(key)) {
            // Vytvoření nového pole s přidaným klíčem.
            this.persistentKeys = [...this.persistentKeys, key];

            // Emitování události o změně perzistentních klíčů.
            this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
        }
    }

    /**
     * Odebere klíč ze seznamu perzistentních klíčů, pokud tam je.
     * Základní klíče (`visitedScenes`, `variables`) nelze odebrat pomocí této metody.
     * Vytvoří nové pole perzistentních klíčů a nahradí stávající.
     * Emituje událost `persistentKeysChanged`, pokud klíč byl odebrán.
     * @param key Klíč k odebrání.
     */
    public removePersistentKey(key: string): void {
        if (typeof key !== 'string' || key.length === 0) {
            console.warn("GameStateManager: Cannot remove invalid persistent key.", key);
            return;
        }
        // Kontrola, zda se nejedná o základní perzistentní klíč, který by měl být vždy uložen.
        if (key === 'visitedScenes' || key === 'variables') {
            console.warn(`GameStateManager: Cannot remove default persistent key "${key}". These keys are required for basic state persistence.`);
            return;
        }

        const index = this.persistentKeys.indexOf(key);
        if (index !== -1) {
            // Vytvoření nového pole bez odebraného klíče.
            this.persistentKeys = [
                ...this.persistentKeys.slice(0, index),
                ...this.persistentKeys.slice(index + 1)
            ];

            // Emitování události o změně perzistentních klíčů.
            this.eventEmitter.emit('persistentKeysChanged', { keys: [...this.persistentKeys] });
        }
    }

    /**
     * Emituje událost `stateChanged` s informacemi o předchozím a novém stavu a zdroji změny.
     * Voláno interně po každé změně stavu provedené pomocí `updateState`, `setState`, `applyPersistentState` nebo `resetState`.
     * @param previousState Předchozí stav (reference na objekt před změnou). Null při aplikaci prvního stavu (např. v konstruktoru).
     * @param newState Nový aktuální stav (reference na nový objekt po změně).
     * @param source Zdroj změny.
     * @private
     */
    private emitStateChanged(previousState: GameState<T> | null, newState: GameState<T>, source?: string): void {
        this.eventEmitter.emit('stateChanged', {
            previousState, // Odkaz na předchozí stav (neměnný díky Immeru)
            newState,      // Odkaz na nový stav (neměnný díky Immeru nebo přímé nahrazení)
            source         // Zdroj změny
        });
    }

    /**
     * Registruje posluchače pro události GameStateManageru.
     * @template K Typ klíče události definované v `GameStateManagerEvents`.
     * @param event Typ události (např. 'stateChanged', 'persistentKeysChanged').
     * @param listener Funkce volaná při emitování události. Přijímá datový typ `T[K]`.
     */
    public on<K extends keyof GameStateManagerEvents<T>>(
        event: K,
        listener: (data: GameStateManagerEvents<T>[K]) => void
    ): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * Odregistruje posluchače pro události GameStateManageru.
     * @template K Typ klíče události definované v `GameStateManagerEvents`.
     * @param event Typ události.
     * @param listener Funkce, která byla registrována.
     */
    public off<K extends keyof GameStateManagerEvents<T>>(
        event: K,
        listener: (data: GameStateManagerEvents<T>[K]) => void
    ): void {
        this.eventEmitter.off(event, listener);
    }

    /**
     * Vrátí referenci na callback, který byl registrován v konstruktoru pro volání před serializací.
     * Tento callback by měl být volán z kódu, který provádí serializaci stavu (např. SaveManager nebo StateConverter).
     * @returns Callback `onBeforeSerialize` nebo undefined.
     */
    public getOnBeforeSerializeCallback(): ((state: GameState<T>) => void) | undefined {
        return this.onBeforeSerialize;
    }

    /**
     * Vrátí referenci na callback, který byl registrován v konstruktoru pro volání po deserializaci a aplikaci stavu.
     * Tento callback by měl být volán z kódu, který provede aplikaci deserializovaného stavu
     * (např. SaveManager po volání `applyPersistentState`).
     * @returns Callback `onAfterDeserialize` nebo undefined.
     */
    public getOnAfterDeserializeCallback(): ((state: GameState<T>) => void) | undefined {
        return this.onAfterDeserialize;
    }
}