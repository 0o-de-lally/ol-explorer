/* eslint-disable no-undef */
describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for initial data loading to complete
    cy.waitForBlockchainData();
  });

  it('should display the title', () => {
    cy.get('h1').contains('OL Explorer', { matchCase: false });
  });

  it('should show the blockchain stats section', () => {
    cy.get('[data-testid="blockchain-stats"]').should('exist');
  });

  it('should display a list of transactions', () => {
    cy.get('[data-testid="transactions-table"]').should('exist');
  });

  it('displays blockchain metrics', () => {
    cy.get('[data-testid="blockchain-metrics"]').should('be.visible');
    cy.get('[data-testid="block-height"]').should('be.visible');
    cy.get('[data-testid="epoch"]').should('be.visible');
    cy.get('[data-testid="chain-id"]').should('be.visible');
  });

  it('displays transaction list', () => {
    cy.get('[data-testid="transactions-list"]').should('be.visible');
    cy.get('[data-testid="transaction-row"]').should('have.length.at.least', 1);
  });

  it('allows refreshing transactions', () => {
    cy.get('[data-testid="refresh-button"]').click();
    cy.get('[data-testid="transactions-list"]').should('be.visible');
  });

  it('navigates to transaction details when clicking on a transaction', () => {
    cy.get('[data-testid="transaction-row"]').first().click();
    cy.url().should('include', '/tx/');
    cy.get('[data-testid="transaction-details"]').should('be.visible');
  });
});

// Custom command to wait for blockchain data
Cypress.Commands.add('waitForBlockchainData', () => {
  // Wait for the skeleton loaders to disappear or for actual data to appear
  cy.get('[data-testid="blockchain-metrics"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="transactions-list"]', { timeout: 10000 }).should('be.visible');
}); 