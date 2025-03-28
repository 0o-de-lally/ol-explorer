// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to wait for blockchain data to load
Cypress.Commands.add('waitForBlockchainData', () => {
  // Wait for the skeleton loaders to disappear or for actual data to appear
  cy.get('[data-testid="blockchain-metrics"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="transactions-list"]', { timeout: 10000 }).should('be.visible');
});

// Custom command to get a transaction hash from the transaction list
Cypress.Commands.add('getTransactionHash', () => {
  return cy.get('[data-testid="transaction-row"]')
    .first()
    .find('[data-testid="transaction-hash"]')
    .invoke('text');
});

// Custom command to get a sender address from the transaction list
Cypress.Commands.add('getSenderAddress', () => {
  return cy.get('[data-testid="transaction-row"]')
    .first()
    .find('[data-testid="transaction-sender"]')
    .invoke('text');
});

// Custom command to search for a term
Cypress.Commands.add('search', (term) => {
  cy.get('[data-testid="search-bar"]').clear().type(term);
  cy.get('[data-testid="search-button"]').click();
});

// Custom command to select a resource type on the account page
Cypress.Commands.add('selectResourceType', (index = 0) => {
  cy.get('[data-testid="resource-type-button"]')
    .eq(index)
    .click();
  cy.get('[data-testid="selected-resource"]').should('be.visible');
});

// Custom command to verify transaction details are loaded
Cypress.Commands.add('verifyTransactionDetailsLoaded', () => {
  cy.get('[data-testid="transaction-details"]').should('be.visible');
  cy.get('[data-testid="transaction-info-card"]').should('be.visible');
});

// Custom command to verify account details are loaded
Cypress.Commands.add('verifyAccountDetailsLoaded', () => {
  cy.get('[data-testid="account-details"]').should('be.visible');
  cy.get('[data-testid="account-balance"]').should('be.visible');
  cy.get('[data-testid="resources-section"]').should('be.visible');
}); 