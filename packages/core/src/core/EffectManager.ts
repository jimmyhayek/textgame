import {
  Effect,
  EffectProcessor,
  GameState,
  EffectType,
  BuiltInEffectType,
  BatchEffect,
  SequenceEffect,
  ConditionalEffect,
  RepeatEffect
} from '../types';
import { produce } from '../utils/immer';

// Konstanta pro oddělení jmenného prostoru
const NAMESPACE_SEPARATOR = ':';

/**
 * Manažer efektů pro zpracování herních efektů
 */
export class EffectManager {
  private effectProcessors: Map<string, EffectProcessor> = new Map();
  private fallbackProcessor: EffectProcessor | null = null;

  /**
   * Vytvoří novou instanci EffectManager
   *
   * @param options Možnosti konfigurace
   */
  constructor(options: { registerDefaultEffects?: boolean } = {}) {
    const { registerDefaultEffects = true } = options;

    if (registerDefaultEffects) {
      this.registerDefaultEffects();
    }
  }

  /**
   * Zpracuje jeden efekt s využitím příslušného procesoru
   *
   * @param effect Efekt ke zpracování
   * @param draftState Návrh herního stavu pro modifikaci
   */
  private processSingleEffect(effect: Effect, draftState: GameState): void {
    const processor = this.effectProcessors.get(effect.type);

    if (processor) {
      processor(effect, draftState);
    } else if (this.fallbackProcessor) {
      this.fallbackProcessor(effect, draftState);
    } else {
      console.warn(`No processor registered for effect type '${effect.type}'`);
    }
  }

  /**
   * Získá hodnotu podle cesty v objektu
   *
   * @param obj Objekt, ve kterém hledáme
   * @param path Cesta k hodnotě (formát: 'prop1.prop2.prop3')
   * @returns Nalezená hodnota nebo undefined
   */
  private getValueByPath<T>(obj: Record<string, any>, path: string): T | undefined {
    return path.split('.').reduce((current, part) =>
        current && typeof current === 'object' ? current[part] : undefined, obj) as T | undefined;
  }

  /**
   * Nastaví hodnotu podle cesty v objektu
   *
   * @param obj Objekt, který modifikujeme
   * @param path Cesta k hodnotě (formát: 'prop1.prop2.prop3')
   * @param value Hodnota k nastavení
   */
  private setValueByPath(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    const last = parts.pop()!;
    const target = parts.reduce((current, part) => {
      if (!(part in current)) {
        // Pokud následující část je číslo, vytvoříme pole, jinak objekt
        current[part] = /^\d+$/.test(parts[parts.indexOf(part) + 1] || '') ? [] : {};
      }
      return current[part];
    }, obj);
    target[last] = value;
  }

  /**
   * Registruje výchozí efektové procesory
   */
  private registerDefaultEffects(): void {
    // Základní operace s proměnnými
    this.registerEffectProcessor(BuiltInEffectType.set, (effect, draftState) => {
      const { variable, value, path } = effect;

      if (path) {
        this.setValueByPath(draftState, path, value);
      } else {
        draftState.variables[variable] = value;
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.increment, (effect, draftState) => {
      const { variable, value = 1, path } = effect;

      if (path) {
        const currentValue = this.getValueByPath<number>(draftState, path);
        const newValue = typeof currentValue !== 'number' ? value : currentValue + value;
        this.setValueByPath(draftState, path, newValue);
      } else {
        if (typeof draftState.variables[variable] !== 'number') {
          draftState.variables[variable] = 0;
        }
        draftState.variables[variable] += value;
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.decrement, (effect, draftState) => {
      const { variable, value = 1, path } = effect;

      if (path) {
        const currentValue = this.getValueByPath<number>(draftState, path);
        const newValue = typeof currentValue !== 'number' ? -value : currentValue - value;
        this.setValueByPath(draftState, path, newValue);
      } else {
        if (typeof draftState.variables[variable] !== 'number') {
          draftState.variables[variable] = 0;
        }
        draftState.variables[variable] -= value;
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.multiply, (effect, draftState) => {
      const { variable, value, path } = effect;

      if (path) {
        const currentValue = this.getValueByPath<number>(draftState, path);
        const newValue = typeof currentValue !== 'number' ? 0 : currentValue * value;
        this.setValueByPath(draftState, path, newValue);
      } else {
        if (typeof draftState.variables[variable] !== 'number') {
          draftState.variables[variable] = 0;
        }
        draftState.variables[variable] *= value;
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.divide, (effect, draftState) => {
      const { variable, value, path } = effect;

      if (value === 0) {
        throw new Error('Cannot divide by zero');
      }

      if (path) {
        const currentValue = this.getValueByPath<number>(draftState, path);
        const newValue = typeof currentValue !== 'number' ? 0 : currentValue / value;
        this.setValueByPath(draftState, path, newValue);
      } else {
        if (typeof draftState.variables[variable] !== 'number') {
          draftState.variables[variable] = 0;
        }
        draftState.variables[variable] /= value;
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.toggle, (effect, draftState) => {
      const { variable, path } = effect;

      if (path) {
        const currentValue = this.getValueByPath<boolean>(draftState, path);
        this.setValueByPath(draftState, path, !currentValue);
      } else {
        draftState.variables[variable] = !draftState.variables[variable];
      }
    });

    // Operace s poli
    this.registerEffectProcessor(BuiltInEffectType.push, (effect, draftState) => {
      const { array, value, path } = effect;

      if (path) {
        const currentArray = this.getValueByPath<any[]>(draftState, path);
        if (!Array.isArray(currentArray)) {
          this.setValueByPath(draftState, path, [value]);
        } else {
          currentArray.push(value);
        }
      } else {
        if (!Array.isArray(draftState.variables[array])) {
          draftState.variables[array] = [];
        }
        draftState.variables[array].push(value);
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.remove, (effect, draftState) => {
      const { array, value, byIndex = false, path } = effect;

      const removeByIndexOrValue = (arr: any[], val: any, useIndex: boolean) => {
        if (useIndex) {
          if (val >= 0 && val < arr.length) {
            arr.splice(val, 1);
          }
        } else if (typeof val === 'object') {
          // Pro objektové hodnoty hledáme podle equality funkce, pokud je poskytnuta
          const equalityFn = effect.equalityFn || ((a: any, b: any) => a === b);
          const index = arr.findIndex(item => equalityFn(item, val));
          if (index !== -1) {
            arr.splice(index, 1);
          }
        } else {
          const index = arr.indexOf(val);
          if (index !== -1) {
            arr.splice(index, 1);
          }
        }
      };

      if (path) {
        const currentArray = this.getValueByPath<any[]>(draftState, path);
        if (Array.isArray(currentArray)) {
          removeByIndexOrValue(currentArray, value, byIndex);
        }
      } else {
        if (Array.isArray(draftState.variables[array])) {
          removeByIndexOrValue(draftState.variables[array], value, byIndex);
        }
      }
    });

    // Kompozitní efekty
    this.registerEffectProcessor(BuiltInEffectType.batch, (effect, draftState) => {
      const batchEffect = effect as BatchEffect;

      if (!batchEffect.effects || !Array.isArray(batchEffect.effects)) {
        throw new Error('Batch effect requires an array of effects');
      }

      for (const subEffect of batchEffect.effects) {
        this.processSingleEffect(subEffect, draftState);
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.sequence, (effect, draftState) => {
      const sequenceEffect = effect as SequenceEffect;

      if (!sequenceEffect.effects || !Array.isArray(sequenceEffect.effects)) {
        throw new Error('Sequence effect requires an array of effects');
      }

      for (const subEffect of sequenceEffect.effects) {
        this.processSingleEffect(subEffect, draftState);
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.conditional, (effect, draftState) => {
      const conditionalEffect = effect as ConditionalEffect;

      if (!conditionalEffect.condition || typeof conditionalEffect.condition !== 'function') {
        throw new Error('Conditional effect requires a condition function');
      }

      if (!conditionalEffect.thenEffects || !Array.isArray(conditionalEffect.thenEffects)) {
        throw new Error('Conditional effect requires thenEffects array');
      }

      // Pro vyhodnocení podmínky použijeme immutable kopii stavu
      const immutableState = produce(draftState, () => {});
      const conditionResult = conditionalEffect.condition(immutableState);

      if (conditionResult) {
        // Aplikujeme 'then' efekty
        for (const subEffect of conditionalEffect.thenEffects) {
          this.processSingleEffect(subEffect, draftState);
        }
      } else if (conditionalEffect.elseEffects && Array.isArray(conditionalEffect.elseEffects)) {
        // Aplikujeme 'else' efekty, pokud existují
        for (const subEffect of conditionalEffect.elseEffects) {
          this.processSingleEffect(subEffect, draftState);
        }
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.repeat, (effect, draftState) => {
      const repeatEffect = effect as RepeatEffect;

      if (!repeatEffect.effect) {
        throw new Error('Repeat effect requires an effect to repeat');
      }

      let count: number;

      if (typeof repeatEffect.count === 'function') {
        // Pro vyhodnocení počtu opakování použijeme immutable kopii stavu
        const immutableState = produce(draftState, () => {});
        count = repeatEffect.count(immutableState);
      } else {
        count = repeatEffect.count;
      }

      if (!Number.isInteger(count) || count < 0) {
        throw new Error('Repeat count must be a non-negative integer');
      }

      for (let i = 0; i < count; i++) {
        this.processSingleEffect(repeatEffect.effect, draftState);
      }
    });
  }

  /**
   * Odregistruje výchozí efektové procesory
   */
  public unregisterDefaultEffects(): void {
    Object.values(BuiltInEffectType).forEach(type => {
      this.effectProcessors.delete(type);
    });
  }

  /**
   * Sestaví kompletní klíč procesoru včetně jmenného prostoru
   *
   * @param effectType Typ efektu
   * @param namespace Jmenný prostor (volitelný)
   * @returns Kompletní klíč procesoru
   */
  private getFullEffectType(effectType: EffectType, namespace?: string): string {
    if (!namespace) {
      return effectType.toString();
    }
    return `${namespace}${NAMESPACE_SEPARATOR}${effectType}`;
  }

  /**
   * Registruje procesor pro daný typ efektu
   *
   * @param effectType Typ efektu
   * @param processor Funkce pro zpracování efektu
   * @param namespace Jmenný prostor (volitelný)
   */
  public registerEffectProcessor(effectType: EffectType, processor: EffectProcessor, namespace?: string): void {
    const fullType = this.getFullEffectType(effectType, namespace);
    this.effectProcessors.set(fullType, processor);
  }

  /**
   * Odregistruje procesor pro daný typ efektu
   *
   * @param effectType Typ efektu
   * @param namespace Jmenný prostor (volitelný)
   * @returns True pokud byl procesor úspěšně odregistrován
   */
  public unregisterEffectProcessor(effectType: EffectType, namespace?: string): boolean {
    const fullType = this.getFullEffectType(effectType, namespace);
    return this.effectProcessors.delete(fullType);
  }

  /**
   * Registruje více procesorů najednou
   *
   * @param processors Objekt mapující typy efektů na procesory
   * @param namespace Jmenný prostor (volitelný)
   */
  public registerEffectProcessors(processors: Record<string, EffectProcessor>, namespace?: string): void {
    for (const [type, processor] of Object.entries(processors)) {
      this.registerEffectProcessor(type as EffectType, processor, namespace);
    }
  }

  /**
   * Odregistruje všechny procesory patřící pod daný jmenný prostor
   *
   * @param namespace Jmenný prostor
   * @returns Počet odregistrovaných procesorů
   */
  public unregisterNamespace(namespace: string): number {
    const prefix = `${namespace}${NAMESPACE_SEPARATOR}`;
    let count = 0;

    for (const key of this.effectProcessors.keys()) {
      if (key.startsWith(prefix)) {
        this.effectProcessors.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Nastaví záložní procesor pro neznámé typy efektů
   *
   * @param processor Záložní procesor nebo null pro deaktivaci
   */
  public setFallbackProcessor(processor: EffectProcessor | null): void {
    this.fallbackProcessor = processor;
  }

  /**
   * Aplikuje efekt na herní stav
   *
   * @param effect Efekt k aplikaci
   * @param state Herní stav
   * @returns Nový herní stav
   */
  public applyEffect(effect: Effect, state: GameState): GameState {
    return produce(state, (draftState: GameState) => {
      this.processSingleEffect(effect, draftState);
    });
  }

  /**
   * Aplikuje více efektů na herní stav
   *
   * @param effects Pole efektů k aplikaci
   * @param state Herní stav
   * @returns Nový herní stav
   */
  public applyEffects(effects: Effect[], state: GameState): GameState {
    if (effects.length === 0) {
      return state;
    }

    return produce(state, (draftState: GameState) => {
      for (const effect of effects) {
        this.processSingleEffect(effect, draftState);
      }
    });
  }

  /**
   * Zkontroluje, zda existuje procesor pro daný typ efektu
   *
   * @param effectType Typ efektu
   * @param namespace Jmenný prostor (volitelný)
   * @returns True pokud procesor existuje
   */
  public hasProcessor(effectType: EffectType, namespace?: string): boolean {
    const fullType = this.getFullEffectType(effectType, namespace);
    return this.effectProcessors.has(fullType);
  }

  /**
   * Vrátí seznam registrovaných typů efektů
   *
   * @returns Pole typů efektů
   */
  public getRegisteredEffectTypes(): string[] {
    return Array.from(this.effectProcessors.keys());
  }
}