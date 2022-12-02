
/// <reference types="cypress" />

// Add 
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to go to All Settings view in element web.
       */
        gotoAllSettings(): Chainable<Element>;
    }
  }
}

export { };