/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to go to All Settings view in element web.
       */
      gotoAllSettings(): Chainable<Element>;
      /**
       * A very hacky way to use promises in Cypress
       */
      resolveFromPromise(p: any): Chainable<any>;
    }
  }
}

export {};
