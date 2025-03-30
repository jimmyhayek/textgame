import { GameEngine } from '@textgame/core';
import { gameScenes } from './scenes.js';

// DOM elements
const sceneTitle = document.getElementById('scene-title');
const sceneContent = document.getElementById('scene-content');
const choicesContainer = document.getElementById('choices-container');
const gameStatus = document.getElementById('game-status');

// Initialize the game engine
const gameEngine = new GameEngine({
  scenes: gameScenes,
  initialState: {
    variables: {
      playerName: 'Adventurer',
      hasMap: false
    }
  }
});

// Expose the game instance for E2E testing
window.gameInstance = gameEngine;

// Update UI with current scene
function updateUI() {
  const currentScene = gameEngine.getCurrentScene();

  if (!currentScene) {
    console.error('No current scene!');
    return;
  }

  // Update title
  sceneTitle.textContent = currentScene.title;

  // Update content
  const gameState = gameEngine.getState();
  let content = currentScene.content;

  if (typeof content === 'function') {
    content = content(gameState);
  }

  sceneContent.textContent = content;

  // Update choices
  choicesContainer.innerHTML = '';

  const choices = gameEngine.getAvailableChoices();
  choices.forEach(choice => {
    const button = document.createElement('button');
    button.classList.add('choice-button');

    let choiceText = choice.text;
    if (typeof choiceText === 'function') {
      choiceText = choiceText(gameState);
    }

    button.textContent = choiceText;
    button.addEventListener('click', () => {
      gameEngine.selectChoice(choice.id);
    });

    choicesContainer.appendChild(button);
  });

  // Update game status
  gameStatus.textContent = `Visited scenes: ${gameState.visitedScenes.size}`;
}

// Set up event listeners
gameEngine.on('sceneChanged', () => {
  updateUI();
});

gameEngine.on('stateChanged', () => {
  updateUI();
});

// Start the game
document.addEventListener('DOMContentLoaded', () => {
  gameEngine.start('start');
});