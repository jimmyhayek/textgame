import { AbstractPlugin, GameState } from '@pabitel/core';
import { Command, CommandPluginOptions, CommandProcessResult } from './types';
import Fuse from 'fuse.js';

/**
 * Plugin pro zpracování textových příkazů s využitím Fuse.js pro fuzzy matching
 *
 * Přidává možnost interakce s herním světem pomocí textových příkazů
 * namísto nebo jako doplněk k volbám.
 */
export class CommandPlugin extends AbstractPlugin<CommandPluginOptions> {

    /**
     * Instance Fuse.js pro vyhledávání
     */
    private fuse: Fuse<{ command: Command; pattern: string }> | null = null;

    /**
     * Vytvoří novou instanci CommandPluginu
     *
     * @param options Nastavení pluginu
     */
    constructor(options: CommandPluginOptions = {}) {
        super('commands', {
            fuseOptions: {
                threshold: 0.3,
                ignoreLocation: true,
                useExtendedSearch: true,
                includeScore: true,
                keys: ['pattern']
            },
            ignoreCase: true,
            normalizeDiacritics: true,
            defaultFallbackResponse: "I don't understand that command.",
            ...options
        });
    }

    /**
     * Zpracuje textový příkaz od uživatele
     *
     * @param input Vstup od uživatele
     * @returns Výsledek zpracování příkazu
     */
    public async processCommand(input: string): Promise<CommandProcessResult> {
        if (!this.engine) {
            return { success: false, response: 'Plugin is not initialized.' };
        }

        // Normalizace vstupu
        const normalizedInput = this.normalizeInput(input);
        if (!normalizedInput) {
            return { success: false, response: 'Invalid input.' };
        }

        // Získání aktuálního stavu a scény
        const state = this.engine.getState();
        const currentScene = this.engine.getCurrentScene();
        if (!currentScene) {
            return { success: false, response: 'No active scene.' };
        }

        // Získání dostupných příkazů pro aktuální scénu
        const availableCommands = this.getAvailableCommands();

        // Vyhledání nejlepší shody pomocí Fuse.js
        const match = this.findBestMatch(normalizedInput, availableCommands);

        // Pokud nebyla nalezena shoda
        if (!match) {
            // Použití specifické fallback odpovědi ze scény, pokud existuje
            if (currentScene.fallbackResponse) {
                const response = typeof currentScene.fallbackResponse === 'function'
                    ? currentScene.fallbackResponse(input, state)
                    : currentScene.fallbackResponse;

                return { success: false, response };
            }

            // Použití výchozí fallback odpovědi
            const defaultResponse = typeof this.options.defaultFallbackResponse === 'function'
                ? this.options.defaultFallbackResponse(input, state)
                : this.options.defaultFallbackResponse || "I don't understand that command.";

            return { success: false, response: defaultResponse };
        }

        // Zpracování nalezeného příkazu
        return await this.executeCommand(match.command, state, match.pattern, match.score);
    }

    /**
     * Normalizuje vstupní text
     *
     * @param input Vstupní text
     * @returns Normalizovaný text
     */
    private normalizeInput(input: string): string {
        if (!input || typeof input !== 'string') {
            return '';
        }

        let normalized = input.trim();

        // Normalizace velikosti písmen
        if (this.options.ignoreCase) {
            normalized = normalized.toLowerCase();
        }

        // Normalizace diakritiky
        if (this.options.normalizeDiacritics) {
            normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        return normalized;
    }

    /**
     * Najde nejlepší shodu mezi vstupem a dostupnými příkazy pomocí Fuse.js
     *
     * @param input Normalizovaný vstup
     * @param commands Dostupné příkazy
     * @returns Nejlepší shoda nebo undefined, pokud nebyla nalezena
     */
    private findBestMatch(input: string, commands: Command[]): {
        command: Command;
        pattern: string;
        score: number;
    } | undefined {
        // Pokud nemáme žádné příkazy, nemůžeme najít shodu
        if (commands.length === 0) {
            return undefined;
        }

        // Vytvoříme vyhledávací data pro Fuse.js
        const searchData: { command: Command; pattern: string }[] = [];
        for (const command of commands) {
            for (const pattern of command.patterns) {
                const normalizedPattern = this.normalizeInput(pattern);
                searchData.push({ command, pattern: normalizedPattern });
            }
        }

        // Vytvoříme nebo aktualizujeme Fuse.js instanci
        this.fuse = new Fuse(searchData, this.options.fuseOptions as Fuse.IFuseOptions<{ command: Command; pattern: string }>);

        // Vyhledáme nejlepší shodu
        const searchResults = this.fuse.search(input);

        // Pokud nemáme žádné výsledky, vrátíme undefined
        if (searchResults.length === 0) {
            return undefined;
        }

        // Vrátíme nejlepší shodu
        const bestMatch = searchResults[0];
        const { command, pattern } = bestMatch.item;

        // Skóre je v Fuse.js mezi 0-1, kde 0 je přesná shoda
        // Pro konzistenci s naším API konvertujeme na 0-1, kde 1 je přesná shoda
        const score = bestMatch.score ? 1 - bestMatch.score : 1;

        return { command, pattern, score };
    }

    /**
     * Vykoná příkaz
     *
     * @param command Příkaz k vykonání
     * @param state Aktuální stav hry
     * @param pattern Vzor, který vedl k rozpoznání příkazu
     * @param score Skóre shody
     * @returns Výsledek zpracování příkazu
     */
    private async executeCommand(
        command: Command,
        state: GameState,
        pattern: string,
        score: number
    ): Promise<CommandProcessResult> {
        if (!this.engine) {
            return {
                success: false,
                response: 'Plugin is not initialized.',
                command,
                matchDetails: { pattern, score }
            };
        }

        // Získání odpovědi
        let response: string | undefined;
        if (command.response) {
            response = typeof command.response === 'function'
                ? command.response(state)
                : command.response;
        }

        // Aplikace efektů
        if (command.effects && command.effects.length > 0) {
            // Použijeme nové API enginu pro aplikaci efektů
            this.engine.applyEffects(command.effects);
        }

        // Přechod na další scénu, pokud je specifikována
        let success = true;
        if (command.scene) {
            let nextSceneKey: string;

            if (typeof command.scene === 'function') {
                nextSceneKey = command.scene(state);
            } else {
                nextSceneKey = command.scene;
            }

            // Použijeme nové API enginu pro přechod na další scénu
            success = await this.engine.transitionToScene(nextSceneKey);
        }

        // Emitujeme událost o zpracování příkazu
        this.emitNamespacedEvent('commandProcessed', {
            command,
            response,
            pattern,
            score,
            success
        });

        return {
            success,
            response,
            command,
            matchDetails: { pattern, score }
        };
    }

    /**
     * Získá všechny dostupné příkazy v aktuální scéně
     *
     * @returns Pole dostupných příkazů
     */
    public getAvailableCommands(): Command[] {
        if (!this.engine) return [];

        const state = this.engine.getState();
        const currentScene = this.engine.getCurrentScene();
        if (!currentScene) return [];

        // Získáme příkazy z aktuální scény
        const sceneCommands = currentScene.commands || [];

        // Filtrace příkazů podle podmínek
        return sceneCommands.filter(command => {
            if (!command.condition) return true;
            return command.condition(state);
        });
    }

    /**
     * Čištění zdrojů při odregistrování pluginu
     */
    protected override async onDestroy(): Promise<void> {
        this.fuse = null;
    }
}