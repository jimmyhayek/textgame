# Architektura Pabitel - Přehled

## Úvod

Pabitel je modulární framework pro tvorbu interaktivních textových her a narativních zážitků. Jeho architektura je navržena s důrazem na flexibilitu, rozšiřitelnost a typovou bezpečnost, což umožňuje vývojářům vytvářet širokou škálu textových her - od jednoduchých lineárních příběhů až po komplexní hry s dynamickým stavem a bohatou interakcí.

## Architektonické principy

Návrh Pabitel frameworku se řídí následujícími principy:

1. **Modulárnost** - Systém je rozdělen do jasně oddělených modulů s definovanými zodpovědnostmi
2. **Volné propojení** - Moduly spolu komunikují především prostřednictvím událostí a definovaných rozhraní
3. **Imutabilita** - Herní stav je zpracováván jako imutabilní data, což umožňuje přehlednější správu stavu a funkce jako Undo/Redo
4. **Typová bezpečnost** - Silné typování díky TypeScriptu, které minimalizuje chyby při vývoji
5. **Deklarativní přístup** - Preference deklarativních popisů před imperativním kódem
6. **Rozšiřitelnost** - Snadné přidávání nové funkcionality prostřednictvím pluginů bez modifikace jádra
7. **Konzistence** - Konzistentní API a vzory napříč celým frameworkem

## Hlavní komponenty

Framework je rozdělen do následujících klíčových modulů:

### Engine

Centrální komponenta, která orchestruje všechny ostatní části systému. Poskytuje hlavní API pro vytvoření a řízení hry.

**Zodpovědnosti:**
- Inicializace a koordinace ostatních modulů
- Řízení životního cyklu hry (start, konec)
- Poskytování přístupu k ostatním modulům
- Zpracování vysokoúrovňových chyb

### Event

Systém událostí, který umožňuje volné propojení komponent a rozšiřitelnost frameworku.

**Zodpovědnosti:**
- Propagace událostí v systému
- Registrace a správa posluchačů
- Typově bezpečné předávání dat mezi komponentami

### GameState

Správa herního stavu, která zajišťuje konzistentní a předvídatelné chování hry.

**Zodpovědnosti:**
- Ukládání aktuálního stavu hry
- Zpracování změn stavu s podporou pro imutabilitu
- Podpora pro historii změn (Undo/Redo)
- Serializace a deserializace stavu

### Action

Systém akcí, který definuje způsoby, jakými lze modifikovat herní stav.

**Zodpovědnosti:**
- Definice typů akcí a jejich parametrů
- Zpracování akcí a jejich aplikace na stav
- Validace akcí

### Scene

Správa herních scén a přechodů mezi nimi.

**Zodpovědnosti:**
- Definice a načítání herních scén
- Zpracování přechodů mezi scénami
- Volání životních cyklů scén (onEnter, onExit)

### Resource

Načítání a správa herních zdrojů.

**Zodpovědnosti:**
- Načítání herního obsahu
- Správa registrů obsahu
- Podpora pro lazy-loading obsahu

### SaveLoad

Ukládání a načítání herního stavu.

**Zodpovědnosti:**
- Serializace a deserializace herního stavu
- Implementace různých úložišť (lokální úložiště, soubory)
- Správa metadat uložených her
- Automatické ukládání

### Plugin

Systém pro rozšiřování funkcionality frameworku.

**Zodpovědnosti:**
- Registrace a inicializace pluginů
- Poskytování API pro pluginy
- Správa životního cyklu pluginů

### Debug

Nástroje pro logování a diagnostiku.

**Zodpovědnosti:**
- Konzistentní logování napříč frameworkem
- Nastavitelné úrovně logování
- Diagnostické nástroje

### ECS (Entity Component System)

Systém pro modelování herních objektů a jejich chování.

**Zodpovědnosti:**
- Vytváření a správa entit
- Definice a správa komponent (dat)
- Implementace systémů (logiky)
- Efektivní dotazování na entity

## Datové toky

### Hlavní tok dat

1. **Uživatelská interakce** -> Zachycení vstupu (UI vrstva)
2. **Akce** -> Vytvoření akce reprezentující záměr změny stavu
3. **Aplikace akce** -> Engine předá akci příslušnému procesoru
4. **Změna stavu** -> Vytvoření nového imutabilního stavu
5. **Událost o změně** -> Emitování události o změně stavu
6. **Aktualizace UI** -> Reakce na událost a aktualizace uživatelského rozhraní

### Inicializace hry

1. **Vytvoření instance Engine** -> Konfigurace a inicializace
2. **Registrace obsahu** -> Načtení scén, entit a dalších zdrojů
3. **Registrace pluginů** -> Rozšíření funkcionality
4. **Start hry** -> Přechod na výchozí scénu, inicializace stavu

### Přechod mezi scénami

1. **Požadavek na přechod** -> Volání `engine.transitionToScene()`
2. **Zpracování odchodu** -> Volání `onExit` na aktuální scéně
3. **Načtení nové scény** -> Získání scény z resource loaderu
4. **Aplikace přechodu** -> Aktualizace stavu, přidání do historie
5. **Zpracování vstupu** -> Volání `onEnter` na nové scéně
6. **Událost o změně** -> Notifikace o změně scény

## Rozšiřitelnost

Framework je navržen s rozšiřitelností jako klíčovým požadavkem. Toho je dosaženo několika způsoby:

### Pluginy

Hlavní mechanismus pro rozšíření funkcionality. Pluginy mohou:
- Registrovat nové typy akcí
- Přidávat nové ECS komponenty a systémy
- Přidávat nové příkazy a parsery
- Poskytovat specializované funkce pro specifické typy her

### ECS

Entity Component System poskytuje flexibilní způsob, jak modelovat herní objekty a jejich chování:
- Entity jsou lehké objekty sloužící jako kontejnery pro komponenty
- Komponenty jsou čistá data bez logiky
- Systémy implementují logiku, která pracuje s entitami s určitými komponentami

### Event systém

Umožňuje volné propojení komponent:
- Nové moduly mohou naslouchat existujícím událostem bez modifikace původního kódu
- Moduly mohou definovat a emitovat vlastní události

## Integrace s UI frameworky

Pabitel je navržen jako framework nezávislý na UI, což umožňuje integraci s různými UI frameworky. Tato integrace je realizována prostřednictvím adaptérů, které:

1. Poskytují komponenty a hooks/composables specifické pro daný UI framework
2. Zajišťují reaktivitu a správné vykreslování stavu
3. Zpracovávají uživatelské vstupy a převádějí je na akce

## Závěr

Architektura Pabitel frameworku je navržena s důrazem na modularitu, rozšiřitelnost a typovou bezpečnost. Silný důraz na volné propojení komponent skrze události a jasně definovaná rozhraní umožňuje snadné rozšiřování a modifikaci frameworku, zatímco konzistentní API a design vzory napříč moduly zajišťují snadné použití pro vývojáře.

## Další dokumentace

- [Slovník pojmů](./glossary.md)
- [Detaily Event systému](./components/event-system.md)
- [Detaily ECS](./components/ecs.md)
- [Implementace plugin systému](./components/plugin.md)
- [ADR: Volba entity-component-system](./decisions/001-ecs-implementation.md)
