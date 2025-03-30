// cypress/support/e2e.js

// Import commands.js
import './commands';

// Import cypress-grep for filtering tests
import 'cypress-grep';

// Import localStorage commands
import 'cypress-localstorage-commands';

// Log information about the current test environment
before(() => {
  cy.log(`Testing on URL: ${Cypress.config('baseUrl')}`);

  // Detect which framework example we're testing
  cy.window().then((win) => {
    let framework = 'Unknown';

    if (win.document.querySelector('[data-framework="vanilla"]')) {
      framework = 'Vanilla JS';
    } else if (win.document.querySelector('[data-framework="react"]')) {
      framework = 'React';
    } else if (win.document.querySelector('[data-framework="vue"]')) {
      framework = 'Vue';
    } else if (win.document.querySelector('[data-framework="svelte"]')) {
      framework = 'Svelte';
    }

    cy.log(`Detected framework: ${framework}`);
  });
});

// Add better error messages for common game-related errors
Cypress.on('fail', (error, runnable) => {
  // Check for specific error messages and enhance them
  if (error.message.includes('getState')) {
    error.message = `Game state not accessible. Make sure the game engine is properly initialized and exposed.\n\nOriginal error: ${error.message}`;
  }

  if (error.message.includes('scene')) {
    error.message = `Scene-related error. This might indicate an issue with scene transitions or scene data.\n\nOriginal error: ${error.message}`;
  }

  throw error;
});

// Log the test title before each test
beforeEach(() => {
  const testTitle = Cypress.currentTest.title;
  cy.log(`Running test: ${testTitle}`);
});

// Check for console errors
Cypress.on('window:before:load', (win) => {
  cy.spy(win.console, 'error').as('consoleError');
});

afterEach(() => {
  cy.get('@consoleError').then((consoleError) => {
    if (consoleError.callCount > 0) {
      cy.log(`⚠️ Console errors detected: ${consoleError.callCount}`);
      console.log('Console errors:', consoleError.args);
    }
  });
});