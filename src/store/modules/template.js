/**
 * @class template
 *
 * @description The template store module handles the basic template from which a workshop is created. This is likely to change in future when forking existing workshops becomes an option in the Builder Tool.
 */
export default {
    namespaced: true,
    /**
     * @name State
     * @memberOf template
     * @property master {null|string} Template repository _config.yml file.
     * @property fetchInProgress {boolean} Whether a template fetch is in progress.
     * @property errors {Error[]} List of errors encountered.
     */
    state: {
        master: null,
        fetchInProgress: false,
        errors: []
    },
    /**
     * @name Mutations
     * @memberOf template
     * @type {Object}
     * @mutator {boolean} setSearchFlag=fetchInProgress Set the search flag.
     * @mutator {string} setMaster=master Set the master template content.
     * @mutator {Error} addError=errors Add an error to the log.
     */
    mutations: {
        setSearchFlag: function(state, v) {state.fetchInProgress = v},
        setMaster: function(state, v) {state.master = v},
        addError: function(state, e) {state.errors.push(e)}
    },
    actions: {
        fetchTemplateMaster: {
            root: true,
            /**
             * Fetch the _config.yml file from repo to use as a template.
             * @memberOf template
             * @action fetchTemplateMaster=master
             * @param {StoreContext} nsContext
             * @param {string} repo Repository to use as a template.
             * @returns {Promise<void>|void}
             */
            handler (nsContext, repo) {
                if(nsContext.state.fetchInProgress)
                    return;
                nsContext.commit('setSearchFlag', true);
                return fetch(`https://api.github.com/repos/${repo}/contents/_config.yml`)
                    .then(r => r.json())
                    .then(j => atob(j.content))
                    .then(c => {
                        nsContext.commit('setSearchFlag', false);
                        nsContext.commit('setMaster', c);
                    })
                    .catch(e => {
                        nsContext.commit('setSearchFlag', false);
                        nsContext.commit('addError', e);
                    });
            }
        }
    }
};
