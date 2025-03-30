import { GameEngine, Plugin, GameState } from '@textgame/core';

export interface SaveData {
    timestamp: number;
    name: string;
    gameState: any; // Serialized game state
    screenshot?: string; // Optional base64 encoded screenshot
    currentSceneId: string;
    playtime: number; // In seconds
}

export interface SaveSystemState {
    lastSaveTime: number | null;
    autoSaveEnabled: boolean;
    autoSaveInterval: number; // In seconds
    playtimeStart: number;
    currentPlaytime: number; // In seconds
}

export class SaveSystemPlugin implements Plugin {
    public name = 'save-system';
    private engine: GameEngine | null = null;
    private autoSaveTimer: number | null = null;
    private playtimeTimer: number | null = null;
    private storagePrefix = 'textgame_save_';

    // Default settings
    private defaultSettings = {
        autoSaveEnabled: true,
        autoSaveInterval: 300, // 5 minutes
    };

    initialize(engine: GameEngine): void {
        this.engine = engine;

        // Initialize save system state
        engine.getStateManager().updateState(state => {
            if (!state.saveSystem) {
                state.saveSystem = {
                    lastSaveTime: null,
                    autoSaveEnabled: this.defaultSettings.autoSaveEnabled,
                    autoSaveInterval: this.defaultSettings.autoSaveInterval,
                    playtimeStart: Date.now(),
                    currentPlaytime: 0
                };
            }
        });

        // Start tracking playtime
        this.startPlaytimeTracking();

        // Setup auto-save if enabled
        this.setupAutoSave();

        // Listen for game start and scene changes
        engine.on('gameStarted', this.onGameStarted.bind(this));
        engine.on('sceneChanged', this.onSceneChanged.bind(this));
    }

    private onGameStarted(): void {
        // Reset playtime when a new game starts
        if (this.engine) {
            this.engine.getStateManager().updateState(state => {
                if (state.saveSystem) {
                    state.saveSystem.playtimeStart = Date.now();
                    state.saveSystem.currentPlaytime = 0;
                }
            });
        }
    }

    private onSceneChanged(scene: any): void {
        // Potentially trigger auto-save on scene changes
        if (this.engine && this.getAutoSaveEnabled()) {
            const state = this.engine.getState();

            // Check if scene is marked as a checkpoint or if it's a new scene
            const isCheckpoint = scene.metadata?.checkpoint === true;
            const isNewScene = !state.visitedScenes || state.visitedScenes.size <= 1;

            if (isCheckpoint || isNewScene) {
                this.autoSave();
            }
        }
    }

    private startPlaytimeTracking(): void {
        // Update playtime every second
        this.playtimeTimer = window.setInterval(() => {
            if (this.engine) {
                this.engine.getStateManager().updateState(state => {
                    if (state.saveSystem) {
                        const now = Date.now();
                        const elapsed = Math.floor((now - state.saveSystem.playtimeStart) / 1000);
                        state.saveSystem.currentPlaytime = elapsed;
                    }
                });
            }
        }, 1000);
    }

    private setupAutoSave(): void {
        if (!this.engine) return;

        const state = this.engine.getState();
        const enabled = state.saveSystem?.autoSaveEnabled || false;
        const interval = state.saveSystem?.autoSaveInterval || this.defaultSettings.autoSaveInterval;

        if (enabled) {
            this.autoSaveTimer = window.setInterval(() => {
                this.autoSave();
            }, interval * 1000);
        }
    }

    private autoSave(): void {
        // Only auto-save if the feature is enabled
        if (!this.engine || !this.getAutoSaveEnabled()) return;

        // Get current scene ID
        const currentScene = this.engine.getCurrentScene();
        if (!currentScene) return;

        // Create save data
        const saveData: SaveData = {
            timestamp: Date.now(),
            name: 'Auto-save',
            gameState: this.engine.getStateManager().serialize(),
            currentSceneId: currentScene.id,
            playtime: this.getPlaytime()
        };

        // Save to local storage with special auto-save key
        localStorage.setItem(`${this.storagePrefix}auto`, JSON.stringify(saveData));

        // Update last save time
        this.engine.getStateManager().updateState(state => {
            if (state.saveSystem) {
                state.saveSystem.lastSaveTime = Date.now();
            }
        });

        // Emit save event
        this.engine.emit('gameSaved', {
            slot: 'auto',
            saveData
        });
    }

    // Public methods

    public saveGame(slotId: string, name: string = 'Save'): boolean {
        if (!this.engine) return false;

        const currentScene = this.engine.getCurrentScene();
        if (!currentScene) return false;

        // Create save data
        const saveData: SaveData = {
            timestamp: Date.now(),
            name,
            gameState: this.engine.getStateManager().serialize(),
            currentSceneId: currentScene.id,
            playtime: this.getPlaytime()
        };

        try {
            // Save to local storage
            localStorage.setItem(`${this.storagePrefix}${slotId}`, JSON.stringify(saveData));

            // Update last save time
            this.engine.getStateManager().updateState(state => {
                if (state.saveSystem) {
                    state.saveSystem.lastSaveTime = Date.now();
                }
            });

            // Emit save event
            this.engine.emit('gameSaved', {
                slot: slotId,
                saveData
            });

            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }

    public loadGame(slotId: string): boolean {
        if (!this.engine) return false;

        try {
            // Load from local storage
            const savedDataString = localStorage.getItem(`${this.storagePrefix}${slotId}`);
            if (!savedDataString) return false;

            const saveData: SaveData = JSON.parse(savedDataString);

            // Deserialize game state
            this.engine.getStateManager().deserialize(saveData.gameState);

            // Transition to the saved scene
            this.engine.getSceneManager().transitionToScene(
                saveData.currentSceneId,
                this.engine.getState(),
                this.engine
            );

            // Update playtime
            this.engine.getStateManager().updateState(state => {
                if (state.saveSystem) {
                    state.saveSystem.currentPlaytime = saveData.playtime;
                    state.saveSystem.playtimeStart = Date.now() - (saveData.playtime * 1000);
                }
            });

            // Emit load event
            this.engine.emit('gameLoaded', {
                slot: slotId,
                saveData
            });

            // Emit scene changed event to update UI
            this.engine.emit('sceneChanged', this.engine.getCurrentScene());

            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    }

    public getSaveSlots(): { slot: string; data: SaveData }[] {
        const result = [];

        // Find all save slots in local storage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                try {
                    const slotId = key.substring(this.storagePrefix.length);
                    const saveData = JSON.parse(localStorage.getItem(key) || '');
                    result.push({
                        slot: slotId,
                        data: saveData
                    });
                } catch (error) {
                    console.error('Error parsing save data:', error);
                }
            }
        }

        // Sort by timestamp, newest first
        return result.sort((a, b) => b.data.timestamp - a.data.timestamp);
    }

    public deleteSaveSlot(slotId: string): boolean {
        try {
            localStorage.removeItem(`${this.storagePrefix}${slotId}`);

            // Emit delete event
            if (this.engine) {
                this.engine.emit('saveDeleted', { slot: slotId });
            }

            return true;
        } catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }

    public getPlaytime(): number {
        if (!this.engine) return 0;

        const state = this.engine.getState();
        return state.saveSystem?.currentPlaytime || 0;
    }

    public formatPlaytime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    public getAutoSaveEnabled(): boolean {
        if (!this.engine) return this.defaultSettings.autoSaveEnabled;

        const state = this.engine.getState();
        return state.saveSystem?.autoSaveEnabled ?? this.defaultSettings.autoSaveEnabled;
    }

    public setAutoSaveEnabled(enabled: boolean): void {
        if (!this.engine) return;

        this.engine.getStateManager().updateState(state => {
            if (state.saveSystem) {
                state.saveSystem.autoSaveEnabled = enabled;
            }
        });

        // Clear existing timer
        if (this.autoSaveTimer !== null) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // Setup new timer if enabled
        if (enabled) {
            this.setupAutoSave();
        }
    }

    public setAutoSaveInterval(seconds: number): void {
        if (!this.engine) return;

        this.engine.getStateManager().updateState(state => {
            if (state.saveSystem) {
                state.saveSystem.autoSaveInterval = seconds;
            }
        });

        // Restart auto-save timer if enabled
        if (this.getAutoSaveEnabled()) {
            if (this.autoSaveTimer !== null) {
                clearInterval(this.autoSaveTimer);
            }
            this.setupAutoSave();
        }
    }

    destroy(): void {
        if (this.autoSaveTimer !== null) {
            clearInterval(this.autoSaveTimer);
        }

        if (this.playtimeTimer !== null) {
            clearInterval(this.playtimeTimer);
        }

        this.engine = null;
    }
}