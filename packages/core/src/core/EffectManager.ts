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

export class EffectManager {
  private effectProcessors: Map<string, EffectProcessor> = new Map();
  private fallbackProcessor: EffectProcessor | null = null;

  constructor() {
    this.registerDefaultEffects();
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, part) =>
        current && typeof current === 'object' ? current[part] : undefined, obj);
  }

  private setValueByPath(obj: any, path: string, value: any): void {
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
        const currentValue = this.getValueByPath(draftState, path);
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
        const currentValue = this.getValueByPath(draftState, path);
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
        const currentValue = this.getValueByPath(draftState, path);
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
        console.warn('Cannot divide by zero. Skipping effect.');
        return;
      }

      if (path) {
        const currentValue = this.getValueByPath(draftState, path);
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
        const currentValue = this.getValueByPath(draftState, path);
        this.setValueByPath(draftState, path, !currentValue);
      } else {
        draftState.variables[variable] = !draftState.variables[variable];
      }
    });

    // Operace s poli
    this.registerEffectProcessor(BuiltInEffectType.push, (effect, draftState) => {
      const { array, value, path } = effect;

      if (path) {
        const currentArray = this.getValueByPath(draftState, path);
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

      if (path) {
        const currentArray = this.getValueByPath(draftState, path);
        if (!Array.isArray(currentArray)) return;

        if (byIndex) {
          if (value >= 0 && value < currentArray.length) {
            currentArray.splice(value, 1);
          }
        } else {
          const index = currentArray.indexOf(value);
          if (index !== -1) {
            currentArray.splice(index, 1);
          }
        }
      } else {
        if (!Array.isArray(draftState.variables[array])) return;

        if (byIndex) {
          if (value >= 0 && value < draftState.variables[array].length) {
            draftState.variables[array].splice(value, 1);
          }
        } else {
          const index = draftState.variables[array].indexOf(value);
          if (index !== -1) {
            draftState.variables[array].splice(index, 1);
          }
        }
      }
    });

    // Kompozitní efekty
    this.registerEffectProcessor(BuiltInEffectType.batch, (effect, draftState) => {
      const batchEffect = effect as BatchEffect;

      if (!batchEffect.effects || !Array.isArray(batchEffect.effects)) {
        console.warn('Batch effect requires an array of effects');
        return;
      }

      for (const subEffect of batchEffect.effects) {
        const processor = this.effectProcessors.get(subEffect.type);
        if (processor) {
          processor(subEffect, draftState);
        } else if (this.fallbackProcessor) {
          this.fallbackProcessor(subEffect, draftState);
        } else {
          console.warn(`No processor registered for effect type '${subEffect.type}'`);
        }
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.sequence, (effect, draftState) => {
      const sequenceEffect = effect as SequenceEffect;

      if (!sequenceEffect.effects || !Array.isArray(sequenceEffect.effects)) {
        console.warn('Sequence effect requires an array of effects');
        return;
      }

      // V immer produceStep již máme draftState, proto nemusíme volat produce znovu
      for (const subEffect of sequenceEffect.effects) {
        const processor = this.effectProcessors.get(subEffect.type);
        if (processor) {
          processor(subEffect, draftState);
        } else if (this.fallbackProcessor) {
          this.fallbackProcessor(subEffect, draftState);
        } else {
          console.warn(`No processor registered for effect type '${subEffect.type}'`);
        }
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.conditional, (effect, draftState) => {
      const conditionalEffect = effect as ConditionalEffect;

      if (!conditionalEffect.condition || typeof conditionalEffect.condition !== 'function') {
        console.warn('Conditional effect requires a condition function');
        return;
      }

      if (!conditionalEffect.thenEffects || !Array.isArray(conditionalEffect.thenEffects)) {
        console.warn('Conditional effect requires thenEffects array');
        return;
      }

      // Vytvoříme kopii stavu pro vyhodnocení podmínky
      // Nemůžeme použít přímo draftState pro vyhodnocení, protože je to Proxy
      const stateForCondition = JSON.parse(JSON.stringify(draftState));

      if (conditionalEffect.condition(stateForCondition)) {
        // Aplikujeme 'then' efekty
        for (const subEffect of conditionalEffect.thenEffects) {
          const processor = this.effectProcessors.get(subEffect.type);
          if (processor) {
            processor(subEffect, draftState);
          } else if (this.fallbackProcessor) {
            this.fallbackProcessor(subEffect, draftState);
          } else {
            console.warn(`No processor registered for effect type '${subEffect.type}'`);
          }
        }
      } else if (conditionalEffect.elseEffects && Array.isArray(conditionalEffect.elseEffects)) {
        // Aplikujeme 'else' efekty, pokud existují
        for (const subEffect of conditionalEffect.elseEffects) {
          const processor = this.effectProcessors.get(subEffect.type);
          if (processor) {
            processor(subEffect, draftState);
          } else if (this.fallbackProcessor) {
            this.fallbackProcessor(subEffect, draftState);
          } else {
            console.warn(`No processor registered for effect type '${subEffect.type}'`);
          }
        }
      }
    });

    this.registerEffectProcessor(BuiltInEffectType.repeat, (effect, draftState) => {
      const repeatEffect = effect as RepeatEffect;

      if (!repeatEffect.effect) {
        console.warn('Repeat effect requires an effect to repeat');
        return;
      }

      let count: number;

      if (typeof repeatEffect.count === 'function') {
        // Vytvoříme kopii stavu pro vyhodnocení počtu opakování
        const stateForCount = JSON.parse(JSON.stringify(draftState));
        count = repeatEffect.count(stateForCount);
      } else {
        count = repeatEffect.count;
      }

      if (!Number.isInteger(count) || count < 0) {
        console.warn('Repeat count must be a non-negative integer');
        return;
      }

      const processor = this.effectProcessors.get(repeatEffect.effect.type);

      for (let i = 0; i < count; i++) {
        if (processor) {
          processor(repeatEffect.effect, draftState);
        } else if (this.fallbackProcessor) {
          this.fallbackProcessor(repeatEffect.effect, draftState);
        } else {
          console.warn(`No processor registered for effect type '${repeatEffect.effect.type}'`);
        }
      }
    });
  }

  public registerEffectProcessor(effectType: EffectType, processor: EffectProcessor, namespace?: string): void {
    const namespacePrefix = namespace ? `${namespace}:` : '';
    this.effectProcessors.set(`${namespacePrefix}${effectType}`, processor);
  }

  public unregisterEffectProcessor(effectType: EffectType, namespace?: string): boolean {
    const namespacePrefix = namespace ? `${namespace}:` : '';
    const fullType = `${namespacePrefix}${effectType}`;

    if (this.effectProcessors.has(fullType)) {
      this.effectProcessors.delete(fullType);
      return true;
    }
    return false;
  }

  public registerEffectProcessors(processors: Record<string, EffectProcessor>, namespace?: string): void {
    for (const [type, processor] of Object.entries(processors)) {
      this.registerEffectProcessor(type as EffectType, processor, namespace);
    }
  }

  public unregisterNamespace(namespace: string): number {
    const prefix = `${namespace}:`;
    let count = 0;

    for (const key of this.effectProcessors.keys()) {
      if (key.startsWith(prefix)) {
        this.effectProcessors.delete(key);
        count++;
      }
    }

    return count;
  }

  public setFallbackProcessor(processor: EffectProcessor | null): void {
    this.fallbackProcessor = processor;
  }

  public applyEffect(effect: Effect, state: GameState): GameState {
    const processor = this.effectProcessors.get(effect.type);

    if (processor) {
      return produce(state, (draftState: GameState) => {
        processor(effect, draftState);
      });
    } else if (this.fallbackProcessor) {
      return produce(state, (draftState: GameState) => {
        this.fallbackProcessor!(effect, draftState);
      });
    } else {
      console.warn(`No processor registered for effect type '${effect.type}'`);
      return state;
    }
  }

  public applyEffects(effects: Effect[], state: GameState): GameState {
    if (effects.length === 0) {
      return state;
    }

    return produce(state, (draftState: GameState) => {
      for (const effect of effects) {
        const processor = this.effectProcessors.get(effect.type);
        if (processor) {
          processor(effect, draftState);
        } else if (this.fallbackProcessor) {
          this.fallbackProcessor(effect, draftState);
        } else {
          console.warn(`No processor registered for effect type '${effect.type}'`);
        }
      }
    });
  }

  public hasProcessor(effectType: EffectType, namespace?: string): boolean {
    const namespacePrefix = namespace ? `${namespace}.` : '';
    return this.effectProcessors.has(`${namespacePrefix}${effectType}`);
  }

  public getRegisteredEffectTypes(): string[] {
    return Array.from(this.effectProcessors.keys());
  }
}