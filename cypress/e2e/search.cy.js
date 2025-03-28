describe('Search Functionality', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForBlockchainData();
  });

  it('has a working search bar', () => {
    cy.get('[data-testid="search-bar"]').should('be.visible');
    cy.get('[data-testid="search-button"]').should('be.visible');
  });

  it('searches for an account address', () => {
    // Get an actual transaction from the list to extract a sender address
    cy.get('[data-testid="transaction-row"]')
      .first()
      .find('[data-testid="transaction-sender"]')
      .invoke('text')
      .then((address) => {
        // Use the sender address for search
        if (address && address.startsWith('0x')) {
          // Enter the address in the search bar
          cy.get('[data-testid="search-bar"]').type(address);
          cy.get('[data-testid="search-button"]').click();
          
          // Verify we navigate to the account page
          cy.url().should('include', '/account/');
          cy.get('[data-testid="account-details"]').should('be.visible');
          cy.get('[data-testid="account-address"]').should('contain', address);
        } else {
          // If no real address found, use a mock address
          const mockAddress = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          cy.get('[data-testid="search-bar"]').type(mockAddress);
          cy.get('[data-testid="search-button"]').click();
          
          // Verify we navigate to the account page or get appropriate error
          cy.url().should('include', '/account/');
        }
      });
  });

  it('searches for a transaction hash', () => {
    // Get an actual transaction hash from the list
    cy.get('[data-testid="transaction-row"]')
      .first()
      .find('[data-testid="transaction-hash"]')
      .invoke('text')
      .then((hash) => {
        // Use the transaction hash for search
        if (hash && hash.startsWith('0x')) {
          // Enter the hash in the search bar
          cy.get('[data-testid="search-bar"]').type(hash);
          cy.get('[data-testid="search-button"]').click();
          
          // Verify we navigate to the transaction page
          cy.url().should('include', '/tx/');
          cy.get('[data-testid="transaction-details"]').should('be.visible');
          cy.get('[data-testid="transaction-hash"]').should('contain', hash);
        } else {
          // If no real hash found, use a mock hash
          const mockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          cy.get('[data-testid="search-bar"]').type(mockHash);
          cy.get('[data-testid="search-button"]').click();
          
          // Verify we navigate to the transaction page or get appropriate error
          cy.url().should('include', '/tx/');
        }
      });
  });

  it('shows error for invalid search input', () => {
    // Search for an invalid input
    cy.get('[data-testid="search-bar"]').type('invalid search input');
    cy.get('[data-testid="search-button"]').click();
    
    // Verify error message is displayed
    cy.get('[data-testid="search-error"]').should('be.visible');
  });

  it('can search using keyboard enter key', () => {
    // Get a transaction hash for search
    cy.get('[data-testid="transaction-row"]')
      .first()
      .find('[data-testid="transaction-hash"]')
      .invoke('text')
      .then((hash) => {
        if (hash && hash.startsWith('0x')) {
          // Enter the hash in the search bar and press Enter
          cy.get('[data-testid="search-bar"]').type(hash).type('{enter}');
          
          // Verify navigation
          cy.url().should('include', '/tx/');
        } else {
          // Use mock hash if needed
          const mockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          cy.get('[data-testid="search-bar"]').type(mockHash).type('{enter}');
          cy.url().should('include', '/tx/');
        }
      });
  });
});

// Custom command to wait for blockchain data (reusing from home.cy.js)
Cypress.Commands.add('waitForBlockchainData', () => {
  // Wait for the skeleton loaders to disappear or for actual data to appear
  cy.get('[data-testid="blockchain-metrics"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="transactions-list"]', { timeout: 10000 }).should('be.visible');
}); 