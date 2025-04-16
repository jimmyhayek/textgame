// src/types/entity.ts

import { GameState } from './state';

/**
 * Jedinečný identifikátor entity
 */
export type EntityId = string;

/**
 * Typ entity (např. "character", "container", "item", atd.)
 */
export type EntityType = string;

/**
 * Tag pro kategorizaci entit
 */
export type EntityTag = string;

/**
 * Komponenta entity - obsahuje specifická data
 */
export interface EntityComponent {
    [key: string]: any;
}

/**
 * Reprezentace herní entity
 */
export interface Entity {
    /**
     * Jedinečný identifikátor entity
     */
    id: EntityId;

    /**
     * Typ entity
     */
    type: EntityType;

    /**
     * Seznam tagů pro kategorizaci
     */
    tags: Set<EntityTag>;

    /**
     * Komponenty entity - specifické části funkcionality
     */
    components: Record<string, EntityComponent>;

    /**
     * Časové razítko vytvoření entity
     */
    createdAt: number;

    /**
     * Časové razítko poslední modifikace entity
     */
    updatedAt: number;
}

/**
 * Možnosti pro vytvoření nové entity
 */
export interface CreateEntityOptions {
    /**
     * Vlastní ID entity (volitelné)
     * Pokud není specifikováno, bude vygenerováno
     */
    id?: EntityId;

    /**
     * Počáteční komponenty entity
     */
    components?: Record<string, EntityComponent>;

    /**
     * Počáteční tagy entity
     */
    tags?: EntityTag[];

    /**
     * Metadata entity
     */
    meta?: Record<string, any>;
}

/**
 * Filtr pro vyhledávání entit
 */
export interface EntityQuery {
    /**
     * Filtrovat podle typu entity
     */
    type?: EntityType | EntityType[];

    /**
     * Filtrovat podle přítomnosti komponent
     */
    hasComponents?: string[];

    /**
     * Filtrovat podle tagů
     */
    hasTags?: EntityTag[];

    /**
     * Vlastní predikát pro filtrování
     */
    predicate?: (entity: Entity) => boolean;
}

/**
 * Typy událostí emitovaných EntityManager
 */
export enum EntityEventType {
    CREATED = 'entity:created',
    UPDATED = 'entity:updated',
    DELETED = 'entity:deleted',
    COMPONENT_ADDED = 'entity:component:added',
    COMPONENT_UPDATED = 'entity:component:updated',
    COMPONENT_REMOVED = 'entity:component:removed',
    TAG_ADDED = 'entity:tag:added',
    TAG_REMOVED = 'entity:tag:removed'
}

/**
 * Rozšíření GameState o entitní systém
 */
declare module './state' {
    interface GameState {
        /**
         * Entitní systém - ukládá všechny entity ve hře
         */
        entities: {
            byId: Record<EntityId, Entity>;
        };
    }
}