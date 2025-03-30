// cypress/e2e/save-system.cy.js
describe('Save System', { tags: ['@future'] }, () => {
  beforeEach(() => {
    // Clear local storage before each test
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('allows saving game progress', () => {
    // Make some progress in the game
    cy.get('button').contains(/left|forest/i).click();
    cy.get('button').contains(/explore|deeper/i).click();

    // Find and take an item to change state
    cy.get('button').contains(/search|look|examine/i).click();
    cy.get('button').contains(/take|pick up|grab/i).click();

    // Save the game (implementation-dependent)
    cy.get('[data-testid="save-button"]').click();
    cy.get('[data-testid="save-slot-1"]').click();

    // Verify save was successful
    cy.get('[data-testid="save-message"]').should('contain', 'Game saved');

    // Optionally verify in localStorage
    cy.getAllLocalStorage().then((result) => {
      const localStorage = result[Cypress.config('baseUrl')];
      // Find a key that contains game save data
      const saveKey = Object.keys(localStorage).find(key => key.includes('save'));
      expect(saveKey).to.exist;
    });
  });

  it('allows loading saved games', () => {
    // First save a game at a specific point
    cy.get('button').contains(/left|forest/i).click();
    cy.get('[data-testid="save-button"]').click();
    cy.get('[data-testid="save-slot-1"]').click();

    // Go to a different path
    cy.get('button').contains(/back|return/i).click();
    cy.get('button').contains(/right/i).click();

    // Now load the saved game
    cy.get('[data-testid="load-button"]').click();
    cy.get('[data-testid="save-slot-1"]').click();

    // Verify we're back in the forest
    cy.get('h1').should('contain', 'The Forest');
  });

  it('persists saved games between sessions', () => {
    // First save a game
    cy.get('button').contains(/left|forest/i).click();
    cy.get('[data-testid="save-button"]').click();
    cy.get('[data-testid="save-slot-1"]').click();

    // Reload the page to simulate a new session
    cy.reload();

    // Check if saved game exists
    cy.get('[data-testid="load-button"]').click();
    cy.get('[data-testid="save-slot-1"]').should('exist');

    // Load the game
    cy.get('[data-testid="save-slot-1"]').click();

    // Verify we're in the correct scene
    cy.get('h1').should('contain', 'The Forest');
  });
});

// Test auto-save functionality
describe('Auto-Save Functionality', { tags: ['@future'] }, () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('automatically saves at checkpoints', () => {
    // Progress through the game
    cy.get('button').contains(/left|forest/i).click();
    cy.get('button').contains(/explore|deeper/i).click();

    // This scene might be a checkpoint that triggers auto-save
    // We're assuming there's some indicator when auto-save happens
    cy.get('[data-testid="auto-save-indicator"]').should('be.visible');

    // Reload the page
    cy.reload();

    // Open load menu
    cy.get('[data-testid="load-button"]').click();

    // Should see auto-save
    cy.get('[data-testid="auto-save-slot"]').should('exist');

    // Load auto-save
    cy.get('[data-testid="auto-save-slot"]').click();

    // Should be in deep forest
    cy.get('.scene-content').should('contain', 'deep forest');
  });
});