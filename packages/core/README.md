# @pabitel/core

Core engine pro vytváření modulárních, flexibilních a příběhově zaměřených textových her.

## Přehled

Pabitel Core je minimalistický, ale výkonný framework navržený pro tvorbu interaktivních narativů, textových adventur a her založených na volbách. S důrazem na modularitu a typovou bezpečnost poskytuje základní stavební bloky potřebné k vytváření komplexních příběhových zážitků, aniž by diktoval, jak strukturovat obsah vaší hry.

## Klíčové vlastnosti

- **Minimalistické jádro** - Malé, cílené API obsahující pouze nezbytné součásti
- **Modulární design** - Používejte pouze to, co potřebujete, rozšiřujte pomocí pluginů
- **Typová bezpečnost** - Vytvořeno v TypeScriptu pro robustní vývoj
- **Deklarativní obsah** - Definujte herní obsah jednoduchým, deklarativním způsobem
- **Lazy loading** - Načítejte obsah na vyžádání pro optimální výkon
- **Flexibilní struktura** - Organizujte herní obsah jakýmkoliv způsobem
- **Systém pluginů** - Snadno rozšiřujte engine o vlastní funkcionalitu

## Instalace

```bash
# Pomocí yarn
yarn add @pabitel/core

# Pomocí npm
npm install @pabitel/core
```

## Základní použití

Zde je jednoduchý příklad, který ukazuje, jak vytvořit základní hru:

```typescript
import { createGameEngine, defineScene, defineScenes, createSceneLoader } from '@pabitel/core';

// Definice scén
const startScene = defineScene({
    title: 'Začátek',
    content: 'Probudíš se v malé místnosti. Na severu jsou dveře a na východě okno.',
    choices: [
        {
            content: 'Projít dveřmi',
            scene: 'corridor'
        },
        {
            content: 'Podívat se z okna',
            scene: 'window-view'
        }
    ]
});

const corridorScene = defineScene({
    title: 'Temná chodba',
    content: 'Vstoupíš do dlouhé, temné chodby.',
    choices: [
        {
            content: 'Vrátit se do místnosti',
            scene: 'start'
        }
    ]
});

const windowViewScene = defineScene({
    title: 'Pohled z okna',
    content: 'Z okna vidíš krásnou krajinu.',
    choices: [
        {
            content: 'Odstoupit od okna',
            scene: 'start'
        }
    ]
});

// Registrace scén
const scenes = defineScenes({
    'start': startScene,
    'corridor': corridorScene,
    'window-view': windowViewScene
});

// Vytvoření herního enginu
const sceneLoader = createSceneLoader(scenes);
const engine = createGameEngine({
    sceneLoader
});

// Spuštění hry
engine.start('start').then(() => {
    console.log('Hra začala ve scéně:', engine.getCurrentScene()?.title);
    console.log(engine.getCurrentScene()?.content);
    console.log('Dostupné volby:');
    engine.getAvailableChoices().forEach((choice, index) => {
        console.log(`${index}. ${choice.content}`);
    });
});
```

## Základní koncepty

### Scény a volby

Základními stavebními bloky každé hry vytvořené s Pabitel Core jsou scény a volby. Scéna představuje jednu "stránku" nebo "obrazovku" vaší hry, zatímco volby jsou možnosti dostupné hráči.

```typescript
interface Scene {
  title: string;
  content: string | ((state: GameState) => string);
  choices: Choice[];
  onEnter?: (state: GameState, engine: GameEngine) => void;
  onExit?: (state: GameState, engine: GameEngine) => void;
  metadata?: Record<string, any>;
}

interface Choice {
  content: string | ((state: GameState) => string);
  scene?: SceneKey | ((state: GameState) => SceneKey);
  condition?: (state: GameState) => boolean;
  effects?: Effect[];
  metadata?: Record<string, any>;
}
```

### Content Loadery a klíče

Pabitel Core používá systém klíčů založený na cestách pro identifikaci obsahu, podobně jako funguje routování založené na souborech v moderních webových frameworcích. To umožňuje intuitivní organizaci herního obsahu:

```typescript
// Scény jsou identifikovány svými klíči, které mohou být podobné cestám
const scenes = defineScenes({
  'forest/entrance': entranceScene,
  'forest/clearing': clearingScene,
  'village/square': squareScene
});
```

### Herní stav

Herní stav sleduje vše, co se děje ve vaší hře, včetně proměnných, navštívených scén a jakýchkoli dalších dat, která chcete sledovat.

```typescript
interface GameState {
  visitedScenes: Set<string>;
  variables: Record<string, any>;
  [key: string]: any;
}
```

### Efekty

Efekty jsou akce, které mění herní stav. Mohou být spuštěny volbami, scénami nebo jinými herními událostmi.

```typescript
// Definice volby s efekty
{
  content: 'Vzít meč',
  scene: 'cave/entrance',
  effects: [
    { 
      type: 'SET_VARIABLE', 
      variable: 'hasSword', 
      value: true 
    },
    { 
      type: 'INCREMENT_VARIABLE', 
      variable: 'inventory_count', 
      value: 1 
    }
  ]
}
```

### Volby bez přechodů mezi scénami

Volby nemusí vždy vést k nové scéně. Můžete vytvořit volby, které pouze aplikují efekty a zůstanou na aktuální scéně:

```typescript
const forestScene = defineScene({
  title: 'Les',
  content: 'Jsi v hustém lese...',
  choices: [
    {
      content: 'Prohledat okolí',
      // Bez vlastnosti scene - pouze efekty
      effects: [
        { type: 'SET_VARIABLE', variable: 'foundMap', value: true }
      ]
    },
    {
      content: 'Pokračovat hlouběji',
      scene: 'forest/clearing'
    }
  ]
});
```

### Pluginy

Systém pluginů umožňuje rozšířit engine o vlastní funkcionalitu. Pluginy mohou přidávat nové typy obsahu, efekty nebo jiné funkce.

```typescript
import { AbstractPlugin } from '@pabitel/core';

// Vytvoření vlastního pluginu
class InventoryPlugin extends AbstractPlugin {
    constructor() {
        super('inventory', {});
    }

    protected override setupLoaders() {
        // Nastavení content loaderů pro předměty
        const itemLoader = new GenericContentLoader();
        this.loaders.set('items', itemLoader);
    }

    protected override registerEffectProcessors() {
        this.engine?.registerEffectProcessor('ADD_ITEM', (effect, state) => {
            if (!state.inventory) {
                state.inventory = [];
            }
            state.inventory.push(effect.item);
        });
    }
}

// Použití pluginu
const inventoryPlugin = new InventoryPlugin();
const engine = createGameEngine({
    sceneLoader,
    plugins: [inventoryPlugin]
});
```

## Dostupné pluginy

Framework obsahuje několik oficiálních pluginů pro rozšíření základní funkcionality:

### @pabitel/plugin-choices

Plugin pro správu voleb, který poskytuje bohatší možnosti interakce ve hře.

```typescript
import { ChoicesPlugin } from '@pabitel/plugin-choices';

const choicesPlugin = new ChoicesPlugin();
engine.registerPlugin(choicesPlugin);
```

### @pabitel/plugin-commands

Plugin pro implementaci textových příkazů, který umožňuje hráčům zadávat příkazy podobně jako v klasických textových adventurách.

```typescript
import { CommandPlugin } from '@pabitel/plugin-commands';

const commandPlugin = new CommandPlugin();
engine.registerPlugin(commandPlugin);
```

### @pabitel/plugin-local-storage

Plugin pro ukládání herního stavu do localStorage prohlížeče.

```typescript
import { LocalStorageSaveStorage } from '@pabitel/plugin-local-storage';

const saveStorage = new LocalStorageSaveStorage();
const saveManager = createSaveManager(engine, { storage: saveStorage });
```

## Pokročilé použití

Pabitel Core obsahuje další pokročilé funkce a možnosti:

### Správa stavu

Framework poskytuje pokročilé možnosti správy stavu:

```typescript
// Získání proměnné ze stavu
const hasMap = engine.getStateManager().getVariable('hasMap', false);

// Nastavení proměnné ve stavu
engine.getStateManager().setVariable('hasMap', true);

// Aktualizace celého stavu
engine.getStateManager().updateState(state => {
  state.variables.health -= 10;
  state.variables.visitedPlaces.push('forest');
});
```

### Systém událostí

Můžete reagovat na různé události v enginu:

```typescript
// Naslouchání na změnu scény
engine.on('sceneChanged', data => {
  console.log('Přechod na novou scénu:', data.sceneKey);
});

// Naslouchání na změnu stavu
engine.on('stateChanged', state => {
  updateUI(state);
});

// Naslouchání na události pluginu
engine.on('choices:choiceSelected', data => {
  playSound('click');
});
```

### Ukládání a načítání her

Framework obsahuje vestavěný systém pro ukládání a načítání her:

```typescript
// Uložení hry
await engine.saveGame('save_slot_1', { name: 'Uložení hry v lese' });

// Načtení hry
await engine.loadGame('save_slot_1');

// Rychlé uložení/načtení
await engine.getSaveManager().quickSave();
await engine.getSaveManager().quickLoad();
```

### Entitní systém

Pro složitější hry můžete využít entitní systém:

```typescript
// Vytvoření entity
const playerEntity = engine.getEntityManager().createEntity('player', {
  name: 'Hráč',
  health: 100,
  inventory: []
});

// Získání entity
const player = engine.getEntityManager().getEntity('player');

// Aktualizace entity
engine.getEntityManager().updateEntity('player', entity => {
  entity.health -= 10;
});
```

## Licence

MIT © Jakub Hájek