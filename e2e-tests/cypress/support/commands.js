// cypress/support/commands.js

// Custom command to check game state
Cypress.Commands.add('getGameState', () => {
  return cy.window().then((win) => {
    // Access the game state through the window object
    // The actual implementation depends on how the game instance is exposed
    return win.gameInstance ? win.gameInstance.getState() : null;
  });
});

// Custom command to make direct game engine calls
Cypress.Commands.add('executeGameAction', (action, ...args) => {
  return cy.window().then((win) => {
    if (win.gameInstance && typeof win.gameInstance[action] === 'function') {
      return win.gameInstance[action](...args);
    }
    throw new Error(`Action "${action}" not found on game instance`);
  });
});

// Custom command to navigate to a specific scene (useful for setting up tests)
Cypress.Commands.add('navigateToScene', (sceneId) => {
  return cy.window().then((win) => {
    if (win.gameInstance && typeof win.gameInstance.getCurrentScene === 'function') {
      const currentScene = win.gameInstance.getCurrentScene();
      if (currentScene && currentScene.id === sceneId) {
        // Already at the target scene
        return;
      }

      // Use debug mode to jump to a specific scene
      if (win.gameDebug && typeof win.gameDebug.jumpToScene === 'function') {
        win.gameDebug.jumpToScene(sceneId);
        return;
      }

      // Fallback: Navigate through UI
      // This is a simplified approach; real implementation would need a path-finding algorithm
      cy.log(`Navigating to scene: ${sceneId}`);
      // Implementation depends on the game structure
    }
  });
});

// Custom command to simulate a delay (for animations or transitions)
Cypress.Commands.add('waitForTransition', (timeout = 500) => {
  cy.wait(timeout); // Simple wait
});

// Command to check if an element contains a specific text with case-insensitive matching
Cypress.Commands.add('containsIgnoreCase', { prevSubject: true }, (subject, text) => {
  const regex = new RegExp(text, 'i');
  return cy.wrap(subject).contains(regex);
});

// Command to simulate game completion
Cypress.Commands.add('completeGame', () => {
  cy.log('Attempting to complete the game');
  // This would be a sequence of actions that complete the game
  // Implementation depends on the specific game being tested
});

// Command to check accessibility of game UI elements
Cypress.Commands.add('checkA11y', (options = {}) => {
  // This would use axe-core or similar to test accessibility
  // Requires additional setup in plugins
  cy.log('Checking accessibility');
});

// Command to verify a saved game slot has data
Cypress.Commands.add('verifySaveSlot', (slotId) => {
  return cy.getAllLocalStorage().then((result) => {
    const baseUrl = Cypress.config('baseUrl');
    const localStorage = result[baseUrl];
    const saveKeyPattern = new RegExp(`save_${slotId}`);
    const saveKey = Object.keys(localStorage).find(key => saveKeyPattern.test(key));

    expect(saveKey, `Save slot ${slotId} should exist`).to.exist;
    const saveData = JSON.parse(localStorage[saveKey]);
    expect(saveData, `Save data for slot ${slotId} should be valid`).to.not.be.null;

    return saveData;
  });
});