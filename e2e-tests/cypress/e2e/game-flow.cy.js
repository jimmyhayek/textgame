// cypress/e2e/game-flow.cy.js
describe('Basic Game Flow', () => {
  beforeEach(() => {
    cy.visit('/');

    // Wait for the game to load
    cy.get('h1', { timeout: 10000 }).should('be.visible');
  });

  it('navigates through the game flow', () => {
    // Should start at the beginning with expected title
    cy.get('h1').should('contain', 'The Adventure Begins');

    // Should have two initial choices
    cy.get('button').should('have.length', 2);
    cy.get('button').eq(0).should('contain', 'Take the left path');
    cy.get('button').eq(1).should('contain', 'Take the right path');

    // Choose the left path
    cy.get('button').contains('Take the left path').click();

    // Should transition to the forest scene
    cy.get('h1').should('contain', 'The Forest');
    cy.get('.scene-content').should('contain', 'dark forest');

    // Should have options to explore or go back
    cy.get('button').should('have.length', 2);
    cy.get('button').contains('Explore deeper');
    cy.get('button').contains('Return to crossroads');

    // Go back to the crossroads
    cy.get('button').contains('Return to crossroads').click();

    // Should be back at the start
    cy.get('h1').should('contain', 'The Adventure Begins');

    // Now take the right path
    cy.get('button').contains('Take the right path').click();

    // Verify we're on a different path now
    cy.get('h1').should('not.contain', 'The Forest');
  });
});

describe('Game State Persistence', () => {
  it('maintains state across scene transitions', () => {
    cy.visit('/');

    // Navigate to where we can find an item
    cy.get('button').contains(/left|forest/i).click();
    cy.get('button').contains(/explore|deeper/i).click();

    // Find an item that changes state
    cy.get('button').contains(/search|look|examine/i).click();
    cy.get('button').contains(/take|pick up|grab/i).click();

    // Go back to the beginning
    cy.get('button').contains(/back|return/i).click();
    cy.get('button').contains(/back|return/i).click();

    // Now take the right path which may require the item
    cy.get('button').contains(/right/i).click();

    // Should see evidence that we have the item
    cy.get('.scene-content').should('not.contain', 'You need an item to proceed');

    // Should be able to continue
    cy.get('button').should('be.visible');
  });
});

// Tests specific to visual elements
describe('UI Components', () => {
  it('displays the game UI correctly', () => {
    cy.visit('/');

    // Check basic UI structure
    cy.get('h1').should('be.visible'); // Title
    cy.get('.scene-content').should('be.visible'); // Content
    cy.get('button').should('be.visible'); // Choices

    // UI should be responsive
    cy.viewport(375, 667); // Mobile size
    cy.get('h1').should('be.visible');
    cy.get('button').should('be.visible');

    // Return to desktop size
    cy.viewport(1280, 720);
  });
});

// Framework-specific tests that can be conditionally run
describe('Framework-Specific Features', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('loads the game engine correctly', () => {
    // This verifies internal game state is working
    // This assumes there is some element showing visited scenes
    cy.get('button').first().click();
    cy.get('button').contains(/back|return/i).click();

    // After returning to the start, the visitedScenes count should be 3
    // 1. Initial scene, 2. Second scene, 3. Back to initial
    cy.get('[data-testid="status"]').should('contain', '3');
  });
});