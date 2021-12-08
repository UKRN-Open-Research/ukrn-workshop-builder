const queryString = require('query-string');

/**
 * @typedef GHBuildStatus
 * @property created_at {string} A date string giving the time the build was created.
 * @property status {string} A string describing the status of the build.
 * @property error {Object} An object describing the error with the build, if any.
 */

/**
 * @class github
 * @description The github store module handles GitHub login and build status checks.
 */
export default {
    namespaced: true,
    /**
     * @name State
     * @memberOf github
     * @property user {null|{login: string}} The currently logged in user.
     * @property errors {Error[]} List of errors encountered.
     * @property loginInProgress {boolean} Whether a login request is in progress.
     * @property buildStatusChecks {number[]} When build status checks are scheduled in the future.
     * @property lastBuildStatusCheck {null|number} When the last build status check was conducted.
     * @property buildStatus {null|GHBuildStatus} The result of the last build status check.
     */
    state: {
        user: {},
        errors: [],
        loginInProgress: false,
        buildStatusChecks: [],
        lastBuildStatusCheck: null,
        buildStatus: null
    },
    /**
     * @name Getters
     * @memberOf github
     * @type {Object}
     * @getter {Error} lastError=errors Returns the most recent error encountered.
     * @getter {string} login=user.login Returns the current user's login name.
     * @getter {boolean} loginInProgress=loginInProgress Whether a login attempt is currently in progress.
     * @getter {string} code The current GitHub login code.
     * @getter {string} token The current GitHub authorisation token.
     */
    getters: {
        lastError(state) {
            const Es = state.errors.length;
            return Es? state.errors[Es - 1] : null
        },
        login(state) {return state.user.login},
        loginInProgress(state) {return state.loginInProgress},
        code() {return queryString.parse(window.location.search).code},
        token() {return queryString.parse(window.location.search).token}
    },
    /**
     * @name Mutations
     * @memberOf github
     * @type {Object}
     * @mutator {Object} setUser=user Set the currently logged in user.
     * @mutator {boolean} setLoginFlag=loginInProgress Set the login in progress flag.
     * @mutator {number} addBuildStatusCheck=buildStatusChecks Schedule a build status check for a time in the future.
     * @mutator removeBuildStatusCheck=buildStatusChecks Mark the first scheduled build status check as complete.
     * @mutator {GHBuildStatus} updateBuildStatus=buildStatus Set the last build status.
     * @mutator {Error} addError=errors Add an error to the error list.
     */
    mutations: {
        setUser (state, name) {state.user = name},
        setLoginFlag (state, f) {state.loginInProgress = f},
        addBuildStatusCheck(state, check) {state.buildStatusChecks.push(check)},
        removeBuildStatusCheck(state) {
            state.lastBuildStatusCheck = state.buildStatusChecks.shift()
        },
        updateBuildStatus(state, status) {state.buildStatus = status},
        addError (state, e) {state.errors.push(e)}
    },
    actions: {
        /**
         * Trigger a logout operation by directing the window to the base page. Login information is controlled by querystring information, so wiping this from the location bar logs the user out. Because this triggers a window redirect, it should never return.
         * @memberOf github
         * @action logout=none
         * @method logout
         */
        logout() {
            const URL = queryString.parseUrl(window.location.href);
            window.location = queryString.stringifyUrl({
                url: URL.url,
                query: {
                    ...URL.query,
                    code: null,
                    token: null,
                    logout: true
                }
            }, {skipNull: true});
        },
        /**
         * Exchange a GitHub login code for a token that will allow API operations to be authorised by the given user. Because this function issues a location redirect it should not return.
         * @memberOf github
         * @action redeemCode=none
         * @param {StoreContext} nsContext
         */
        redeemCode(nsContext) {
            if (nsContext.getters.loginInProgress)
                return;
            if (nsContext.getters.code === "")
                return nsContext.commit('addError', "Cannot login with empty code");
            nsContext.commit('setLoginFlag', true);
            return fetch(
                '/.netlify/functions/githubAPI',
                {method: "POST",
                    headers: {
                        "task": "redeemCode",
                        "github-code": nsContext.getters.code
                    }
                }
            )
                .then(r => {
                    if (r.status !== 200)
                        throw new Error(`GitHub login received ${r.statusText} (${r.statusCode})`);
                    return r.json();
                })
                .then(r => {
                    console.log(r)
                    if (!r.access_token)
                        throw new Error(`Response had no token.`);
                    nsContext.dispatch('processToken', r.access_token);
                    nsContext.commit('setLoginFlag', false);
                })
                .catch(e => {
                    console.error(e);
                    nsContext.commit('addError', e);
                    nsContext.commit('setLoginFlag', false);
                    nsContext.dispatch('logout');
                })
        },
        /**
         * Store a provided token as part of the location querystring. Because this function issues a location redirect, it should not return.
         * @memberOf github
         * @action processToken=none
         * @param {StoreContext} nsContext
         * @param {string} token Token to include in the querystring.
         */
        processToken(nsContext, token) {
            const URL = queryString.parseUrl(window.location.href);
            const redirect = queryString.stringifyUrl({
                url: URL.url,
                query: {
                    ...URL.query,
                    code: null,
                    token: token,
                    logout: false
                }
            }, {skipNull: true});
            window.location = redirect;
        },
        /**
         * Retrieve the details of the logged in user from GitHub. On success, triggers the workshop module's GitHub search for the user's UKRN workshop repositories.
         * @memberOf github
         * @action getUserDetails=user,loginInProgress,workshop.repositories
         * @param {StoreContext} nsContext
         * @throws If the user details cannot be retrieved, this function triggers a logout operation.
         * @returns {Promise<void>}
         */
        getUserDetails(nsContext) {
            nsContext.commit('setLoginFlag', true);
            return fetch('/.netlify/functions/githubAPI', {
                method: "POST",
                headers: {task: "getUserDetails"},
                body: JSON.stringify({token: nsContext.getters.token})
            })
                .then(r => {
                    if (r.status !== 200) {
                        throw new Error(`Could not retrieve user details, logging out.`);
                    }
                    return r.json();
                })
                .then(user => nsContext.commit('setUser', user))
                .then(() => nsContext.commit('setLoginFlag', false))
                .then(() => nsContext.dispatch('workshop/findRepositories',
                    {owner: nsContext.getters.login}, {root: true}))
                .then(() => nsContext.dispatch('workshop/findTemplates', {}, {root: true}))
                .catch(e => {
                    console.error(e);
                    nsContext.commit('addError', e);
                    nsContext.commit('setLoginFlag', false);
                    nsContext.dispatch('logout');
                })
        },
        /**
         * Register a new build status check to take place in the future. If another build status check is scheduled for after the current time, don't add a new check.
         * @memberOf github
         * @action registerBuildCheck=buildStatusChecks
         * @param {StoreContext} nsContext
         * @param payload {Object}
         * @param [payload.delay=180000] {number} The delay before the build status check is executed. Defaults to 3 minutes.
         * @returns {void|number} The reference for the timeout.
         */
        registerBuildCheck(nsContext, {delay=180000}) {
            let lastCheck = null;
            if(nsContext.state.buildStatusChecks.length)
                lastCheck = nsContext.state.buildStatusChecks[nsContext.state.buildStatusChecks.length - 1];
            // If there's already a check scheduled for beyond the target time, don't add another
            if(lastCheck && lastCheck > performance.now() + delay)
                return;

            // Set the check time to five minutes after the latest check
            const time = (lastCheck? lastCheck : performance.now()) + delay;
            nsContext.commit('addBuildStatusCheck', time);
            // Set the timeout
            return setTimeout(() => nsContext.dispatch('getBuildStatus'), time - performance.now());
        },
        /**
         * Execute a build status check.
         * @memberOf github
         * @action getBuildStatus=buildStatus,buildStatusChecks
         * @param {StoreContext} nsContext
         * @returns {Promise<void>}
         */
        getBuildStatus(nsContext) {
            nsContext.commit('removeBuildStatusCheck');
            return fetch('/.netlify/functions/githubAPI', {
                method: "POST",
                headers: {task: "getLastBuild"},
                body: JSON.stringify({
                    url: nsContext.rootGetters['workshop/Repository']().url,
                    token: nsContext.getters.token
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`getBuildStatus received ${r.statusText} (${r.status})`)
                    return r.json();
                })
                .then(status => nsContext.commit('updateBuildStatus', status))
                .catch(e => nsContext.commit('addError', e))
        }
    }
};
