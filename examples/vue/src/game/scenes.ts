import { Scene, GameState } from '@textgame/core';

export const gameScenes: Scene[] = [
    {
        id: 'start',
        title: 'The Adventure Begins',
        content: 'You stand at a crossroads. The path to your left leads into a dark forest, while the right path winds toward distant mountains.',
        choices: [
            {
                id: 'forest',
                text: 'Take the left path',
                nextScene: 'forest'
            },
            {
                id: 'mountains',
                text: 'Take the right path',
                nextScene: 'mountains'
            }
        ]
    },
    {
        id: 'forest',
        title: 'The Forest',
        content: 'You find yourself in a dark forest. Tall trees tower above you, their branches forming a dense canopy that blocks most of the sunlight.',
        choices: [
            {
                id: 'explore_forest',
                text: 'Explore deeper',
                nextScene: 'deep_forest'
            },
            {
                id: 'return_crossroads',
                text: 'Return to crossroads',
                nextScene: 'start'
            }
        ]
    },
    {
        id: 'deep_forest',
        title: 'Deep in the Forest',
        content: 'The forest grows denser. You hear rustling in the undergrowth around you. A narrow path winds between the trees.',
        choices: [
            {
                id: 'examine_clearing',
                text: 'Search the area',
                nextScene: 'forest_clearing'
            },
            {
                id: 'return_forest',
                text: 'Return to the forest edge',
                nextScene: 'forest'
            }
        ]
    },
    {
        id: 'forest_clearing',
        title: 'Forest Clearing',
        content: 'You discover a small clearing. Sunlight streams down through a break in the canopy. In the center of the clearing, you notice something glinting in the sunlight.',
        choices: [
            {
                id: 'take_map',
                text: 'Pick up the item',
                nextScene: 'found_map',
                effects: [
                    {
                        type: 'SET_VARIABLE',
                        variable: 'hasMap',
                        value: true
                    }
                ]
            },
            {
                id: 'ignore_item',
                text: 'Leave it alone',
                nextScene: 'deep_forest'
            }
        ]
    },
    {
        id: 'found_map',
        title: 'Found an Item',
        content: 'You pick up what appears to be an old map. It shows details of the mountain path, indicating a hidden pass.',
        choices: [
            {
                id: 'return_to_forest',
                text: 'Return to the deep forest',
                nextScene: 'deep_forest'
            }
        ]
    },
    {
        id: 'mountains',
        title: 'The Mountain Path',
        content: (state: GameState) => {
            if (state.variables.hasMap) {
                return 'The mountain path winds upward. Thanks to your map, you notice a hidden trail that seems to lead to a secret pass.';
            }
            return 'The mountain path winds upward. The terrain is rough and difficult to navigate. You feel like you\'re missing something that could help your journey.';
        },
        choices: [
            {
                id: 'climb_mountains',
                text: 'Continue climbing',
                nextScene: 'mountain_peak'
            },
            {
                id: 'secret_pass',
                text: 'Take the hidden trail',
                nextScene: 'secret_mountain_pass',
                condition: (state: GameState) => state.variables.hasMap === true
            },
            {
                id: 'return_crossroads',
                text: 'Return to crossroads',
                nextScene: 'start'
            }
        ]
    },
    {
        id: 'mountain_peak',
        title: 'Mountain Peak',
        content: 'After a grueling climb, you reach a mountain peak. The view is breathtaking, but there doesn\'t seem to be a way forward from here.',
        choices: [
            {
                id: 'return_mountains',
                text: 'Return to the mountain path',
                nextScene: 'mountains'
            }
        ]
    },
    {
        id: 'secret_mountain_pass',
        title: 'Secret Mountain Pass',
        content: 'Using the map, you navigate the hidden trail and discover a secret pass through the mountains. The path leads to a beautiful valley beyond.',
        choices: [
            {
                id: 'explore_valley',
                text: 'Explore the valley',
                nextScene: 'valley'
            },
            {
                id: 'return_mountains',
                text: 'Return to the mountain path',
                nextScene: 'mountains'
            }
        ]
    },
    {
        id: 'valley',
        title: 'The Hidden Valley',
        content: 'You\'ve discovered a lush, hidden valley untouched by time. Congratulations on finding one of the game\'s secret areas!',
        choices: [
            {
                id: 'return_pass',
                text: 'Return through the mountain pass',
                nextScene: 'secret_mountain_pass'
            }
        ]
    }
];