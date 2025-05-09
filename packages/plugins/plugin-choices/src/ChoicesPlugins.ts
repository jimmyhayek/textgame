import { AbstractPlugin, GameState, Scene, SceneKey } from '@pabitel/core';
import {
    Choice,
    ChoicesPluginOptions,
    ChoiceSelectedEventData,
    AvailableChoicesEventData,
    ChoicesPluginEvents
} from './types';

/**
 * Plugin poskytující funkcionalitu pro volby (choices) ve scénách
 */
export class ChoicesPlugin extends AbstractPlugin<ChoicesPluginOptions> {
    /**
     * Vytvoří novou instanci ChoicesPluginu
     *
     * @param options Možnosti konfigurace pluginu
     */
    constructor(options: ChoicesPluginOptions = {}) {
        super('choices', {
            emitAvailableChoicesOnSceneChange: true,
            enableShortcuts: true,
            ...options
        });
    }

    /**
     * Inicializace pluginu
     */
    protected override async onInitialize(): Promise<void> {
        // Naslouchání na změnu scény
        if (this.options.emitAvailableChoicesOnSceneChange) {
            this.registerEventListener('sceneChanged', () => {
                this.emitAvailableChoices();
            });
        }
    }

    /**
     * Vrátí všechny dostupné volby pro aktuální scénu
     *
     * @returns Pole dostupných voleb
     */
    public getAvailableChoices(): Choice[] {
        if (!this.engine) return [];

        const currentScene = this.engine.getCurrentScene() as Scene;
        if (!currentScene || !currentScene.choices) return [];

        const state = this.engine.getState();

        return currentScene.choices.filter(choice => {
            if (!choice.condition) return true;
            return choice.condition(state);
        });
    }

    /**
     * Emituje událost s dostupnými volbami
     */
    public emitAvailableChoices(): void {
        if (!this.engine) return;

        const choices = this.getAvailableChoices();
        const sceneKey = this.engine.getCurrentSceneKey();

        if (!sceneKey) return;

        const eventData: AvailableChoicesEventData = {
            choices,
            sceneKey
        };

        this.emitNamespacedEvent(ChoicesPluginEvents.AVAILABLE_CHOICES, eventData);
    }

    /**
     * Vybere volbu podle indexu
     *
     * @param index Index volby k výběru
     * @returns Promise, který se vyřeší na true, pokud byla volba úspěšně zpracována
     */
    public async selectChoice(index: number): Promise<boolean> {
        if (!this.engine) return false;

        const choices = this.getAvailableChoices();
        if (index < 0 || index >= choices.length) {
            console.warn(`Choice with index ${index} not found.`);
            return false;
        }

        const choice = choices[index];

        // Emituje událost o vybrané volbě
        const eventData: ChoiceSelectedEventData = {
            choice,
            index
        };

        this.emitNamespacedEvent(ChoicesPluginEvents.CHOICE_SELECTED, eventData);

        // Zpracování volby
        return await this.processChoice(choice);
    }

    /**
     * Vybere volbu podle klávesové zkratky
     *
     * @param shortcut Klávesová zkratka volby
     * @returns Promise, který se vyřeší na true, pokud byla volba úspěšně zpracována
     */
    public async selectChoiceByShortcut(shortcut: string): Promise<boolean> {
        if (!this.engine || !this.options.enableShortcuts) return false;

        const choices = this.getAvailableChoices();
        const index = choices.findIndex(choice => choice.shortcut === shortcut);

        if (index === -1) {
            return false;
        }

        return await this.selectChoice(index);
    }

    /**
     * Zpracuje volbu - aplikuje efekty, zobrazí odpověď a přejde na další scénu
     *
     * @param choice Volba ke zpracování
     * @returns Promise, který se vyřeší na true, pokud byla volba úspěšně zpracována
     * @private
     */
    private async processChoice(choice: Choice): Promise<boolean> {
        if (!this.engine) return false;

        const state = this.engine.getState();

        // Zpracování textové odpovědi
        if (choice.response) {
            const response = typeof choice.response === 'function'
                ? choice.response(state)
                : choice.response;

            this.emitNamespacedEvent(ChoicesPluginEvents.CHOICE_RESPONSE, { response });
        }

        // Aplikace efektů
        if (choice.effects && choice.effects.length > 0) {
            this.applyEffects(choice.effects);
        }

        // Přechod na další scénu
        if (choice.scene) {
            const nextSceneKey = typeof choice.scene === 'function'
                ? choice.scene(this.engine.getState())
                : choice.scene;

            const success = await this.transitionToScene(nextSceneKey);

            // Emitujeme události o dokončení zpracování volby
            this.emitNamespacedEvent(ChoicesPluginEvents.CHOICE_PROCESSED, { choice, success });

            return success;
        }

        // Pokud volba nemá scénu, považujeme zpracování za úspěšné
        this.emitNamespacedEvent(ChoicesPluginEvents.CHOICE_PROCESSED, { choice, success: true });

        return true;
    }

    /**
     * Získá text volby, vyhodnotí dynamické labely
     *
     * @param choice Volba k získání textu
     * @returns Text volby
     */
    public getChoiceLabel(choice: Choice): string {
        if (!this.engine) return '';

        if (typeof choice.label === 'function') {
            return choice.label(this.engine.getState());
        }

        return choice.label;
    }

    /**
     * Vrátí, zda je volba dostupná podle její podmínky
     *
     * @param choice Volba ke kontrole
     * @returns True, pokud je volba dostupná
     */
    public isChoiceAvailable(choice: Choice): boolean {
        if (!this.engine) return false;

        if (!choice.condition) return true;

        return choice.condition(this.engine.getState());
    }
}