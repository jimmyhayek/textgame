// test/core/PluginManager.test.ts
import { PluginManager } from '../../src/core/PluginManager';
import { Plugin } from '../../src/types';

describe('PluginManager', () => {
    let pluginManager: PluginManager;
    let mockEngine: any;

    beforeEach(() => {
        mockEngine = { id: 'mockEngine' };
        pluginManager = new PluginManager(mockEngine);
    });

    test('should register plugin', () => {
        const mockPlugin: Plugin = {
            name: 'testPlugin',
            initialize: jest.fn()
        };

        pluginManager.registerPlugin(mockPlugin);

        expect(mockPlugin.initialize).toHaveBeenCalledWith(mockEngine);
        expect(pluginManager.getPlugin('testPlugin')).toBe(mockPlugin);
    });

    test('should warn when registering duplicate plugin', () => {
        const mockPlugin: Plugin = {
            name: 'duplicatePlugin',
            initialize: jest.fn()
        };

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        pluginManager.registerPlugin(mockPlugin);
        pluginManager.registerPlugin(mockPlugin);

        expect(consoleSpy).toHaveBeenCalled();
        expect(mockPlugin.initialize).toHaveBeenCalledTimes(1);

        consoleSpy.mockRestore();
    });

    test('should unregister plugin', () => {
        const mockPlugin: Plugin = {
            name: 'unregisterPlugin',
            initialize: jest.fn(),
            destroy: jest.fn()
        };

        pluginManager.registerPlugin(mockPlugin);
        pluginManager.unregisterPlugin('unregisterPlugin');

        expect(mockPlugin.destroy).toHaveBeenCalled();
        expect(pluginManager.getPlugin('unregisterPlugin')).toBeUndefined();
    });

    test('should do nothing when unregistering non-existent plugin', () => {
        expect(() => {
            pluginManager.unregisterPlugin('nonExistentPlugin');
        }).not.toThrow();
    });

    test('should get all registered plugins', () => {
        const plugin1: Plugin = { name: 'plugin1', initialize: jest.fn() };
        const plugin2: Plugin = { name: 'plugin2', initialize: jest.fn() };

        pluginManager.registerPlugin(plugin1);
        pluginManager.registerPlugin(plugin2);

        const allPlugins = pluginManager.getAllPlugins();

        expect(allPlugins).toHaveLength(2);
        expect(allPlugins).toContain(plugin1);
        expect(allPlugins).toContain(plugin2);
    });
});