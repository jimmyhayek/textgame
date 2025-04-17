# @pabitel/plugin-choices

Plugin pro podporu voleb (choices) v Pabitel.js textovém herním enginu.

## Přehled

Plugin choices implementuje tradiční mechanismus výběru voleb v textových hrách. Umožňuje definovat explicitní volby ve scénách a poskytuje API pro jejich zpracování.

## Instalace

```bash
# Pomocí yarn
yarn add @pabitel/plugin-choices

# Pomocí npm
npm install @pabitel/plugin-choices
```

## Použití

### Základní použití

```typescript
import { createGameEngine, defineScene, defineScenes, createSceneLoader } from '@pabitel/core';
import { ChoicesPlugin, Choice } from '@pabitel/plugin-choices';

// Vytvoření enginu
const engine = createGameEngine({
  sceneLoader: /* ... */,
  initialState: { /* ... */ }
});

// Registrace pluginu
const choicesPlugin = new ChoicesPlugin();
engine.registerPlugin(choicesPlugin);

// Definice scén s volbami
const forestScene = defineScene({
  title: 'Les',
  content: 'Jsi v lese plném vysokých stromů.',
  choices: [
    {
      label: 'Jít na sever',
      scene: 'forest/north'
    },
    {
      label: 'Prohledat okolí',
      effects: [{ type: 'SET_VARIABLE', variable: 'foundMap', value: true }],
      response: 'Našel jsi starou mapu!'
    },
    {
      label: 'Vrátit se zpět',
      scene: 'village',
      condition: (state) => state.variables.hasItem === true
    }
  ]
});

// Spuštění hry
await engine.start('forest');

// Získání dostupných voleb
const choices = choicesPlugin.getAvailableChoices();
console.log(choices.map(choice => choicesPlugin.getChoiceLabel(choice)));

// Výběr volby podle indexu
await choicesPlugin.selectChoice(0);
```

### Naslouchání událostem

Plugin emituje několik událostí, které můžete využít k interakci s UI:

```typescript
// Naslouchání na dostupné volby
engine.on('choices:availableChoices', (data) => {
  console.log('Dostupné volby:', data.choices);
  renderChoices(data.choices);
});

// Naslouchání na vybranou volbu
engine.on('choices:choiceSelected', (data) => {
  console.log('Vybrána volba:', data.choice, 'index:', data.index);
});

// Naslouchání na odpověď po výběru volby
engine.on('choices:choiceResponse', (data) => {
  console.log('Odpověď:', data.response);
  showResponse(data.response);
});
```

### Klávesové zkratky

Plugin podporuje klávesové zkratky pro volby:

```typescript
// Definice volby s klávesovou zkratkou
const choices = [
  {
    label: 'Jít na sever (N)',
    scene: 'north',
    shortcut: 'n'
  },
  {
    label: 'Jít na jih (S)',
    scene: 'south',
    shortcut: 's'
  }
];

// Zpracování klávesové zkratky
document.addEventListener('keydown', (event) => {
  choicesPlugin.selectChoiceByShortcut(event.key.toLowerCase());
});
```

## API

### `ChoicesPlugin`

Hlavní třída pluginu.

#### Konstruktor

```typescript
constructor(options: ChoicesPluginOptions = {})
```

**Parametry:**
- `options` - Nastavení pluginu

#### Metody

- `getAvailableChoices()` - Vrátí dostupné volby pro aktuální scénu
- `selectChoice(index)` - Vybere volbu podle indexu
- `selectChoiceByShortcut(shortcut)` - Vybere volbu podle klávesové zkratky
- `getChoiceLabel(choice)` - Získá textový popisek volby
- `isChoiceAvailable(choice)` - Kontroluje, zda je volba dostupná
- `emitAvailableChoices()` - Vynutí emitování události s dostupnými volbami

### `Choice` Interface

Reprezentuje volbu ve scéně.

```typescript
interface Choice {
  label: string | ((state: GameState) => string);
  shortcut?: string;
  scene?: SceneKey | ((state: GameState) => SceneKey);
  condition?: (state: GameState) => boolean;
  effects?: Effect[];
  response?: string | ((state: GameState) => string);
  metadata?: Record<string, any>;
}
```

### `ChoicesPluginOptions` Interface

Možnosti konfigurace pluginu.

```typescript
interface ChoicesPluginOptions {
  emitAvailableChoicesOnSceneChange?: boolean; // Výchozí: true
  enableShortcuts?: boolean; // Výchozí: true
}
```

### Události

Plugin emituje tyto události:

- `choices:availableChoices` - Když jsou dostupné nové volby
- `choices:choiceSelected` - Když je vybrána volba
- `choices:choiceProcessed` - Když je volba úplně zpracována
- `choices:choiceResponse` - Když volba vrátí textovou odpověď

## Rozšíření typů v Pabitel Core

Plugin rozšiřuje interface `Scene` z `@pabitel/core` o vlastnost `choices`:

```typescript
declare module '@pabitel/core' {
  interface Scene {
    choices?: Choice[];
  }
}
```

## Licence

MIT © Jakub Hájek