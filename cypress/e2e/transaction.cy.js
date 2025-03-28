describe('Transaction Details Page', () => {
  // Use the test transaction hash from the twin network
  const testTransactionHash = Cypress.env('testTransaction') || '0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18';

  beforeEach(() => {
    // Visit the transaction details page directly with our test transaction
    cy.visit(`/tx/${testTransactionHash}`);
    cy.get('[data-testid="transaction-details"]', { timeout: 10000 }).should('be.visible');
  });

  // ... existing code ...
  it('displays transaction details', () => {
    cy.get('[data-testid="transaction-details"]').should('be.visible');
    cy.get('[data-testid="transaction-hash"]').should('be.visible');
    cy.get('[data-testid="transaction-status"]').should('be.visible');
  });

  it('displays transaction information card', () => {
    cy.get('[data-testid="transaction-info-card"]').should('be.visible');
    cy.get('[data-testid="transaction-type"]').should('be.visible');
    cy.get('[data-testid="transaction-timestamp"]').should('be.visible');
    cy.get('[data-testid="transaction-sender"]').should('be.visible');
    cy.get('[data-testid="transaction-gas-used"]').should('be.visible');
  });

  it('displays transaction events section if available', () => {
    // Check if events section exists and if so, verify its content
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="transaction-events"]').length > 0) {
        cy.get('[data-testid="transaction-events"]').should('be.visible');
        cy.get('[data-testid="event-item"]').should('have.length.at.least', 1);
      }
    });
  });

  it('allows navigation back to home page', () => {
    cy.get('[data-testid="back-button"]').click();
    cy.url().should('not.include', '/tx/');
    cy.get('[data-testid="blockchain-metrics"]').should('be.visible');
  });
});

// Custom command to wait for blockchain data (reusing from home.cy.js)
Cypress.Commands.add('waitForBlockchainData', () => {
  // Wait for the skeleton loaders to disappear or for actual data to appear
  cy.get('[data-testid="blockchain-metrics"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="transactions-list"]', { timeout: 10000 }).should('be.visible');
});