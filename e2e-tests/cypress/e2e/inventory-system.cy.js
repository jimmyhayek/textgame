// cypress/e2e/inventory-system.cy.js
describe('Inventory System', () => {
  beforeEach(() => {
    cy.visit('/');

    // Navigate to a scene where we can find items
    cy.get('button').contains(/left|forest/i).click();
  });

  it('allows picking up items', () => {
    // Look for an item to pick up
    cy.get('button').contains(/search|look|examine/i).click();

    // Find and take an item
    cy.get('button').contains(/take|pick up|grab/i).click();

    // Check if the inventory shows the item (implementation-dependent)
    // This assumes there's some kind of inventory display
    cy.get('[data-testid="inventory"]').should('contain', 'Map');
  });

  it('allows using items from inventory', () => {
    // First get an item
    cy.get('button').contains(/search|look|examine/i).click();
    cy.get('button').contains(/take|pick up|grab/i).click();

    // Navigate to where the item can be used
    cy.get('button').contains(/back|return/i).click();
    cy.get('button').contains(/right/i).click();

    // Use the item
    cy.get('button').contains(/use|unlock|open/i).click();

    // Verify the item was used successfully
    cy.get('.scene-content').should('contain', /opened|unlocked|accessed/i);
  });
});

// This test is for future integration with the inventory plugin
describe('Advanced Inventory Features', { tags: ['@future'] }, () => {
  it('handles item combinations', () => {
    cy.visit('/');

    // Find first item
    cy.get('button').contains(/left|forest/i).click();
    cy.get('button').contains(/search|look|examine/i).click();
    cy.get('button').contains(/take|pick up|grab/i).click();

    // Find second item
    cy.get('button').contains(/back|return/i).click();
    cy.get('button').contains(/back|return/i).click();
    cy.get('button').contains(/right/i).click();
    cy.get('button').contains(/search|look|examine/i).click();
    cy.get('button').contains(/take|pick up|grab/i).click();

    // Open inventory and combine items (implementation-dependent)
    cy.get('[data-testid="inventory-button"]').click();
    cy.get('[data-testid="item-1"]').click();
    cy.get('[data-testid="item-2"]').click();
    cy.get('[data-testid="combine-button"]').click();

    // Verify new item is created
    cy.get('[data-testid="inventory"]').should('contain', 'Combined Item');
  });
});