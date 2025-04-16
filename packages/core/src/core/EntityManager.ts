// src/core/EntityManager.ts

import { v4 as uuidv4 } from 'uuid';
import {
    Entity,
    EntityId,
    EntityType,
    EntityTag,
    EntityComponent,
    EntityQuery,
    CreateEntityOptions,
    EntityEventType
} from '../types/entity';
import { GameState } from '../types/state';
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';

/**
 * Spravuje herní entity, jejich komponenty a tagy
 * Entity jsou objekty ve hře jako postavy, předměty, lokace atd.
 * Každá entita může mít komponenty, které definují její vlastnosti a chování
 */
export class EntityManager {
    private eventEmitter: EventEmitter;
    private stateManager: StateManager;

    /**
     * Vytvoří novou instanci EntityManager
     *
     * @param stateManager Manažer herního stavu
     * @param eventEmitter Emitor událostí
     */
    constructor(stateManager: StateManager, eventEmitter: EventEmitter) {
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;

        // Inicializace entitního systému v herním stavu, pokud ještě neexistuje
        this.stateManager.updateState(state => {
            if (!state.entities) {
                state.entities = {
                    byId: {}
                };
            }
        });
    }

    /**
     * Vytvoří novou entitu
     *
     * @param type Typ entity
     * @param options Možnosti pro vytvoření entity
     * @returns Nově vytvořená entita
     */
    public createEntity(type: EntityType, options: CreateEntityOptions = {}): Entity {
        const id = options.id || this.generateEntityId(type);
        const now = Date.now();

        const entity: Entity = {
            id,
            type,
            tags: new Set(options.tags || []),
            components: { ...options.components } || {},
            createdAt: now,
            updatedAt: now
        };

        this.stateManager.updateState(state => {
            state.entities.byId[id] = entity;
        });

        this.eventEmitter.emit(EntityEventType.CREATED, { entity });

        return entity;
    }

    /**
     * Získá entitu podle ID
     *
     * @param entityId ID entity
     * @returns Entita nebo undefined, pokud neexistuje
     */
    public getEntity(entityId: EntityId): Entity | undefined {
        return this.stateManager.getState().entities.byId[entityId];
    }

    /**
     * Aktualizuje entitu
     *
     * @param entityId ID entity
     * @param updateFn Funkce pro aktualizaci entity
     * @returns True, pokud byla entita aktualizována, jinak false
     */
    public updateEntity(
        entityId: EntityId,
        updateFn: (entity: Entity) => void
    ): boolean {
        const exists = this.entityExists(entityId);
        if (!exists) return false;

        this.stateManager.updateState(state => {
            const entity = state.entities.byId[entityId];

            // Aplikace aktualizační funkce
            updateFn(entity);

            // Aktualizace časového razítka
            entity.updatedAt = Date.now();
        });

        this.eventEmitter.emit(EntityEventType.UPDATED, {
            entityId,
            entity: this.getEntity(entityId)
        });

        return true;
    }

    /**
     * Odstraní entitu
     *
     * @param entityId ID entity
     * @returns True, pokud byla entita odstraněna, jinak false
     */
    public removeEntity(entityId: EntityId): boolean {
        const entity = this.getEntity(entityId);
        if (!entity) return false;

        this.stateManager.updateState(state => {
            delete state.entities.byId[entityId];
        });

        this.eventEmitter.emit(EntityEventType.DELETED, { entityId, entity });

        return true;
    }

    /**
     * Přidá komponentu k entitě
     *
     * @param entityId ID entity
     * @param componentName Název komponenty
     * @param data Data komponenty
     * @returns True, pokud byla komponenta přidána, jinak false
     */
    public addComponent(
        entityId: EntityId,
        componentName: string,
        data: EntityComponent
    ): boolean {
        return this.updateEntity(entityId, entity => {
            entity.components[componentName] = { ...data };

            this.eventEmitter.emit(EntityEventType.COMPONENT_ADDED, {
                entityId,
                componentName,
                data
            });
        });
    }

    /**
     * Aktualizuje komponentu entity
     *
     * @param entityId ID entity
     * @param componentName Název komponenty
     * @param updateFn Funkce pro aktualizaci dat komponenty
     * @returns True, pokud byla komponenta aktualizována, jinak false
     */
    public updateComponent(
        entityId: EntityId,
        componentName: string,
        updateFn: (data: EntityComponent) => void
    ): boolean {
        const entity = this.getEntity(entityId);
        if (!entity || !entity.components[componentName]) return false;

        return this.updateEntity(entityId, entity => {
            const component = entity.components[componentName];
            updateFn(component);

            this.eventEmitter.emit(EntityEventType.COMPONENT_UPDATED, {
                entityId,
                componentName,
                data: component
            });
        });
    }

    /**
     * Získá komponentu entity
     *
     * @param entityId ID entity
     * @param componentName Název komponenty
     * @returns Data komponenty nebo undefined, pokud neexistuje
     */
    public getComponent<T extends EntityComponent = EntityComponent>(
        entityId: EntityId,
        componentName: string
    ): T | undefined {
        const entity = this.getEntity(entityId);
        return entity?.components[componentName] as T | undefined;
    }

    /**
     * Odstraní komponentu z entity
     *
     * @param entityId ID entity
     * @param componentName Název komponenty
     * @returns True, pokud byla komponenta odstraněna, jinak false
     */
    public removeComponent(entityId: EntityId, componentName: string): boolean {
        const entity = this.getEntity(entityId);
        if (!entity || !entity.components[componentName]) return false;

        return this.updateEntity(entityId, entity => {
            const component = entity.components[componentName];
            delete entity.components[componentName];

            this.eventEmitter.emit(EntityEventType.COMPONENT_REMOVED, {
                entityId,
                componentName,
                data: component
            });
        });
    }

    /**
     * Přidá tag entitě
     *
     * @param entityId ID entity
     * @param tag Tag k přidání
     * @returns True, pokud byl tag přidán, jinak false
     */
    public addTag(entityId: EntityId, tag: EntityTag): boolean {
        const entity = this.getEntity(entityId);
        if (!entity) return false;

        if (entity.tags.has(tag)) return true; // Tag už existuje

        return this.updateEntity(entityId, entity => {
            entity.tags.add(tag);

            this.eventEmitter.emit(EntityEventType.TAG_ADDED, {
                entityId,
                tag
            });
        });
    }

    /**
     * Odstraní tag z entity
     *
     * @param entityId ID entity
     * @param tag Tag k odstranění
     * @returns True, pokud byl tag odstraněn, jinak false
     */
    public removeTag(entityId: EntityId, tag: EntityTag): boolean {
        const entity = this.getEntity(entityId);
        if (!entity || !entity.tags.has(tag)) return false;

        return this.updateEntity(entityId, entity => {
            entity.tags.delete(tag);

            this.eventEmitter.emit(EntityEventType.TAG_REMOVED, {
                entityId,
                tag
            });
        });
    }

    /**
     * Kontroluje, zda entita má tag
     *
     * @param entityId ID entity
     * @param tag Tag ke kontrole
     * @returns True, pokud entita má tag, jinak false
     */
    public hasTag(entityId: EntityId, tag: EntityTag): boolean {
        const entity = this.getEntity(entityId);
        return !!entity && entity.tags.has(tag);
    }

    /**
     * Kontroluje, zda entita má komponentu
     *
     * @param entityId ID entity
     * @param componentName Název komponenty
     * @returns True, pokud entita má komponentu, jinak false
     */
    public hasComponent(entityId: EntityId, componentName: string): boolean {
        const entity = this.getEntity(entityId);
        return !!entity && componentName in entity.components;
    }

    /**
     * Kontroluje, zda entita existuje
     *
     * @param entityId ID entity
     * @returns True, pokud entita existuje, jinak false
     */
    public entityExists(entityId: EntityId): boolean {
        return !!this.getEntity(entityId);
    }

    /**
     * Vyhledá entity podle zadaných kritérií
     *
     * @param query Kritéria pro filtrování
     * @returns Pole entit, které odpovídají zadaným kritériím
     */
    public findEntities(query: EntityQuery = {}): Entity[] {
        const state = this.stateManager.getState();
        const entities = Object.values(state.entities.byId);

        return entities.filter(entity => {
            // Kontrola typu entity
            if (query.type) {
                if (Array.isArray(query.type)) {
                    if (!query.type.includes(entity.type)) return false;
                } else if (entity.type !== query.type) {
                    return false;
                }
            }

            // Kontrola požadovaných komponent
            if (query.hasComponents && query.hasComponents.length > 0) {
                for (const component of query.hasComponents) {
                    if (!(component in entity.components)) {
                        return false;
                    }
                }
            }

            // Kontrola tagů
            if (query.hasTags && query.hasTags.length > 0) {
                for (const tag of query.hasTags) {
                    if (!entity.tags.has(tag)) {
                        return false;
                    }
                }
            }

            // Kontrola vlastního predikátu
            if (query.predicate && !query.predicate(entity)) {
                return false;
            }

            return true;
        });
    }

    /**
     * Najde první entitu, která odpovídá zadaným kritériím
     *
     * @param query Kritéria pro filtrování
     * @returns První entita, která odpovídá kritériím, nebo undefined
     */
    public findEntity(query: EntityQuery = {}): Entity | undefined {
        return this.findEntities(query)[0];
    }

    /**
     * Najde všechny entity určitého typu
     *
     * @param type Typ entity
     * @returns Pole entit daného typu
     */
    public findEntitiesByType(type: EntityType): Entity[] {
        return this.findEntities({ type });
    }

    /**
     * Najde všechny entity, které mají zadaný tag
     *
     * @param tag Tag k vyhledání
     * @returns Pole entit s daným tagem
     */
    public findEntitiesByTag(tag: EntityTag): Entity[] {
        return this.findEntities({ hasTags: [tag] });
    }

    /**
     * Najde všechny entity, které mají zadanou komponentu
     *
     * @param componentName Název komponenty
     * @returns Pole entit s danou komponentou
     */
    public findEntitiesByComponent(componentName: string): Entity[] {
        return this.findEntities({ hasComponents: [componentName] });
    }

    /**
     * Vrátí všechna ID entit v herním stavu
     *
     * @returns Pole ID entit
     */
    public getAllEntityIds(): EntityId[] {
        return Object.keys(this.stateManager.getState().entities.byId);
    }

    /**
     * Vrátí počet entit v herním stavu
     *
     * @returns Počet entit
     */
    public getEntityCount(): number {
        return this.getAllEntityIds().length;
    }

    /**
     * Odstraní všechny entity
     */
    public clearAllEntities(): void {
        const entityIds = this.getAllEntityIds();

        this.stateManager.updateState(state => {
            state.entities.byId = {};
        });

        for (const id of entityIds) {
            this.eventEmitter.emit(EntityEventType.DELETED, {
                entityId: id,
                entity: null
            });
        }
    }

    /**
     * Generuje jedinečné ID entity na základě typu
     *
     * @param type Typ entity
     * @returns Jedinečné ID entity
     * @private
     */
    private generateEntityId(type: EntityType): EntityId {
        return `${type.toLowerCase()}_${uuidv4().substring(0, 8)}`;
    }
}