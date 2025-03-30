import { GameEngine, Plugin, GameState, Effect } from '@textgame/core';

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    usable?: boolean;
    combinable?: boolean;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface InventoryState {
    items: InventoryItem[];
}

// Define custom effect types for inventory actions
export const INVENTORY_EFFECTS = {
    ADD_ITEM: 'ADD_ITEM',
    REMOVE_ITEM: 'REMOVE_ITEM',
    USE_ITEM: 'USE_ITEM',
    COMBINE_ITEMS: 'COMBINE_ITEMS'
};

export class InventoryPlugin implements Plugin {
    public name = 'inventory';
    private engine: GameEngine | null = null;

    initialize(engine: GameEngine): void {
        this.engine = engine;

        // Initialize inventory state if not present
        engine.getStateManager().updateState(state => {
            if (!state.inventory) {
                state.inventory = {
                    items: []
                };
            }
        });

        // Register effect processors
        engine.registerEffectProcessor(INVENTORY_EFFECTS.ADD_ITEM, this.addItemEffect.bind(this));
        engine.registerEffectProcessor(INVENTORY_EFFECTS.REMOVE_ITEM, this.removeItemEffect.bind(this));
        engine.registerEffectProcessor(INVENTORY_EFFECTS.USE_ITEM, this.useItemEffect.bind(this));
        engine.registerEffectProcessor(INVENTORY_EFFECTS.COMBINE_ITEMS, this.combineItemsEffect.bind(this));
    }

    private addItemEffect(effect: Effect, state: GameState): void {
        const { item } = effect;
        if (!state.inventory) {
            state.inventory = { items: [] };
        }

        // Check if item already exists in inventory
        const existingItemIndex = state.inventory.items.findIndex(i => i.id === item.id);

        if (existingItemIndex === -1) {
            state.inventory.items.push(item);
            this.engine?.emit('itemAdded', { item });
        }
    }

    private removeItemEffect(effect: Effect, state: GameState): void {
        const { itemId } = effect;
        if (!state.inventory) return;

        const itemIndex = state.inventory.items.findIndex(item => item.id === itemId);

        if (itemIndex !== -1) {
            const removedItem = state.inventory.items[itemIndex];
            state.inventory.items.splice(itemIndex, 1);
            this.engine?.emit('itemRemoved', { item: removedItem });
        }
    }

    private useItemEffect(effect: Effect, state: GameState): void {
        const { itemId, target } = effect;
        if (!state.inventory) return;

        const item = state.inventory.items.find(item => item.id === itemId);

        if (item && item.usable) {
            this.engine?.emit('itemUsed', { item, target });

            // If the item is consumed on use, remove it
            if (effect.consume) {
                this.removeItemEffect({ type: INVENTORY_EFFECTS.REMOVE_ITEM, itemId }, state);
            }
        }
    }

    private combineItemsEffect(effect: Effect, state: GameState): void {
        const { itemId1, itemId2, resultItem } = effect;
        if (!state.inventory) return;

        const item1Index = state.inventory.items.findIndex(item => item.id === itemId1);
        const item2Index = state.inventory.items.findIndex(item => item.id === itemId2);

        if (item1Index !== -1 && item2Index !== -1) {
            const item1 = state.inventory.items[item1Index];
            const item2 = state.inventory.items[item2Index];

            if (item1.combinable && item2.combinable) {
                // Remove the original items
                this.removeItemEffect({ type: INVENTORY_EFFECTS.REMOVE_ITEM, itemId: itemId1 }, state);
                this.removeItemEffect({ type: INVENTORY_EFFECTS.REMOVE_ITEM, itemId: itemId2 }, state);

                // Add the resulting item
                this.addItemEffect({ type: INVENTORY_EFFECTS.ADD_ITEM, item: resultItem }, state);

                this.engine?.emit('itemsCombined', {
                    items: [item1, item2],
                    result: resultItem
                });
            }
        }
    }

    // Public methods that can be used by the game

    public getInventory(state: GameState): InventoryItem[] {
        return state.inventory?.items || [];
    }

    public hasItem(state: GameState, itemId: string): boolean {
        return state.inventory?.items.some(item => item.id === itemId) || false;
    }

    public getItem(state: GameState, itemId: string): InventoryItem | undefined {
        return state.inventory?.items.find(item => item.id === itemId);
    }

    public addItem(item: InventoryItem): void {
        if (!this.engine) return;

        this.engine.getStateManager().updateState(state => {
            this.addItemEffect({ type: INVENTORY_EFFECTS.ADD_ITEM, item }, state);
        });

        this.engine.emit('stateChanged', this.engine.getState());
    }

    public removeItem(itemId: string): void {
        if (!this.engine) return;

        this.engine.getStateManager().updateState(state => {
            this.removeItemEffect({ type: INVENTORY_EFFECTS.REMOVE_ITEM, itemId }, state);
        });

        this.engine.emit('stateChanged', this.engine.getState());
    }

    public useItem(itemId: string, target?: string, consume: boolean = false): void {
        if (!this.engine) return;

        this.engine.getStateManager().updateState(state => {
            this.useItemEffect({
                type: INVENTORY_EFFECTS.USE_ITEM,
                itemId,
                target,
                consume
            }, state);
        });

        this.engine.emit('stateChanged', this.engine.getState());
    }

    public combineItems(itemId1: string, itemId2: string, resultItem: InventoryItem): void {
        if (!this.engine) return;

        this.engine.getStateManager().updateState(state => {
            this.combineItemsEffect({
                type: INVENTORY_EFFECTS.COMBINE_ITEMS,
                itemId1,
                itemId2,
                resultItem
            }, state);
        });

        this.engine.emit('stateChanged', this.engine.getState());
    }

    destroy(): void {
        this.engine = null;
    }
}