/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

require('dotenv').config()

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
    console.log('Running cypress plugins')
    // `on` is used to hook into various events Cypress emits
    // `config` is the resolved Cypress config

    // copy any needed variables from process.env to config.env
    config.env.GITHUB_USERNAME = process.env.CYPRESS_GITHUB_USERNAME
    config.env.GITHUB_PASSWORD = process.env.CYPRESS_GITHUB_PASSWORD

    // do not forget to return the changed config object!
    return config
}
