import { GameState } from '../state/types';
import { Effect, EffectProcessor, EffectType, BuiltInEffectType } from './types';
import { produce } from '../utils/immer';
import { createDefaultEffectProcessors } from './processors';

const NAMESPACE_SEPARATOR = ':';

/**
 * Manažer efektů pro zpracování herních efektů
 */
export class EffectManager {
  /**
   * Mapa procesorů efektů podle typu
   */
  private effectProcessors: Map<string, EffectProcessor> = new Map();

  /**
   * Záložní procesor pro neznámé typy efektů
   */
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
   * @private
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
   * Registruje výchozí efektové procesory
   * @private
   */
  private registerDefaultEffects(): void {
    const defaultProcessors = createDefaultEffectProcessors();

    // Registrujeme všechny výchozí procesory
    this.registerEffectProcessors(defaultProcessors);
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
   * @private
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