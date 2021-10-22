/// <reference types="cypress" />

/* Cypress test of basic website functionality.
This spec file contains tests that reproduce the basic functionality of the
Workshop Builder Tool. It should be able to delete any
existing test repositories, then log into the Tool with a GitHub ID, create the
test repositories, and edit and update them as necessary to illustrate that the
basic functionality is there.

The tests should check that the workshops actually build, and that the user is
notified of the build.
*/
describe('remove existing CI-test-workshop', () => {
    beforeEach(() => {
        // Cypress starts out with a blank slate for each test
        // so we must tell it to visit our website with the `cy.visit()` command.
        // Since we want to visit the same URL at the start of all our tests,
        // we include it in our beforeEach function so that it runs before each test
        cy.visit('https://ukrn-wb.netlify.app/')
    })

    it('offers a login screen', () => {
        // We use the `cy.get()` command to get all elements that match the selector.
        // Then, we use `should` to assert that there are two matched items,
        // which are the two default items.
        cy.get('.button').should('have.text', 'Log in to GitHub')
    })

    context('once logged in', () => {
        beforeEach(() => {
            // Since we want to perform multiple tests that start with logging
            // in, we put it in the beforeEach hook so that it runs at the
            // start of every test.
            cy.contains('Log in to GitHub')
                .click()
        })
    })
})
