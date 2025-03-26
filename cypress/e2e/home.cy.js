/* eslint-disable no-undef */
describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/');
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
}); 