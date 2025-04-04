// test/utils/defineContent.test.ts
import { defineScenes } from '../../src/utils/defineContent';
import { Scene } from '../../src/types';

describe('defineContent', () => {
    test('should create scenes definition', () => {
        const sceneA: Scene = {
            id: 'sceneA',
            title: 'Scene A',
            content: 'Content A',
            choices: []
        };

        const sceneB: Scene = {
            id: 'sceneB',
            title: 'Scene B',
            content: 'Content B',
            choices: []
        };

        const scenes = defineScenes({
            'sceneA': sceneA,
            'sceneB': sceneB,
            'dynamicScene': () => Promise.resolve({ default: { id: 'dynamicScene', title: 'Dynamic', content: 'Content', choices: [] } })
        });

        expect(scenes.type).toBe('scenes');
        expect(scenes.content).toHaveProperty('sceneA', sceneA);
        expect(scenes.content).toHaveProperty('sceneB', sceneB);
        expect(typeof scenes.content.dynamicScene).toBe('function');
    });

    test('should preserve scene references', () => {
        const sceneA: Scene = {
            id: 'sceneA',
            title: 'Scene A',
            content: 'Content A',
            choices: []
        };

        const scenes = defineScenes({
            'sceneA': sceneA
        });

        expect(scenes.content.sceneA).toBe(sceneA); // Strict identity check
    });
});