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
        cy.visit('/')
    })

    it('offers a login screen', () => {
        // The homescreen should have a button that allows the user to log in
        // to the app.
        cy.get('button.github-login').should('have.text', 'Log in to GitHub')
    })

    it('prompts for login', () => {
        // The button should, when clicked, take us to GitHub's site to
        // authorise the application on the user's behalf.
        cy.get('button.github-login')
            .click()

        cy.contains('Sign in to GitHub to continue')
    })
})
