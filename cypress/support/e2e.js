// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // This is useful when testing against real APIs that might have issues
  console.log('Uncaught exception:', err.message);
  return false;
});

// Add data-testid to the list of preferred selectors
Cypress.SelectorPlayground.defaults({
  selectorPriority: ['data-testid', 'id', 'class', 'tag', 'attributes', 'nth-child'],
});

// Configure some global behavior
beforeEach(() => {
  // Set up session instead of preserving cookies
  cy.session('app-session', () => {
    // Any setup needed for the session can go here
    // For example, simulating a login or setting localStorage
  });
  
  // Visit the page (moved this outside the cy.session to avoid duplicates)
  cy.visit('/', {
    onBeforeLoad(win) {
      // Simulate slow API responses in test mode
      if (win.Cypress) {
        win.MOCK_API_DELAY = 500; // milliseconds
      }
    },
  });
});

// Add custom assertions
// Example: Assert that a blockchain address is valid
chai.Assertion.addMethod('validBlockchainAddress', function () {
  const address = this._obj;
  const addressRegex = /^0x[a-fA-F0-9]{64}$/;
  this.assert(
    addressRegex.test(address),
    `expected #{this} to be a valid blockchain address`,
    `expected #{this} to not be a valid blockchain address`
  );
}); 