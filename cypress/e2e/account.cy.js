describe('Account Details Page', () => {
  // Use the test account from the twin network
  const testAccountAddress = Cypress.env('testAccount') || '9A710919B1A1E67EDA335269C0085C91';

  beforeEach(() => {
    // Visit the account details page with our test account
    cy.visit(`/account/${testAccountAddress}`);
    
    // Wait for account data to load
    cy.get('[data-testid="account-details"]', { timeout: 10000 }).should('be.visible');
  });

  // ... existing code ...
  it('displays account header with address', () => {
    cy.get('[data-testid="account-address"]').should('be.visible');
    cy.get('[data-testid="copy-address-button"]').should('be.visible');
  });

  it('displays account balance information', () => {
    cy.get('[data-testid="account-balance"]').should('be.visible');
    cy.get('[data-testid="account-balance-units"]').should('be.visible');
  });

  it('displays resources section', () => {
    cy.get('[data-testid="resources-section"]').should('be.visible');
    cy.get('[data-testid="resources-count"]').should('be.visible');
  });

  it('can select different resource types', () => {
    // Get the first resource type button and click it
    cy.get('[data-testid="resource-type-button"]').first().click();
    
    // Verify the selected resource is displayed
    cy.get('[data-testid="selected-resource"]').should('be.visible');
    cy.get('[data-testid="resource-json-data"]').should('be.visible');
    
    // Check if the URL was updated to include the resource type
    cy.url().should('include', '/resources/');
  });

  it('maintains resource selection when navigating with browser controls', () => {
    // Select a resource type
    cy.get('[data-testid="resource-type-button"]').first().click();
    
    // Get the selected resource type from the URL
    cy.url().then(url => {
      const resourceType = url.split('/resources/')[1];
      
      // Go back to account page
      cy.go('back');
      cy.url().should('not.include', '/resources/');
      
      // Go forward to resource page
      cy.go('forward');
      cy.url().should('include', `/resources/${resourceType}`);
      cy.get('[data-testid="selected-resource"]').should('be.visible');
    });
  });

  it('allows navigation back to home page', () => {
    cy.get('[data-testid="back-button"]').click();
    cy.url().should('not.include', '/account/');
    cy.get('[data-testid="blockchain-metrics"]').should('be.visible');
  });
});