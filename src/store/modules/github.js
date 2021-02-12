const queryString = require('query-string');
export default {
    namespaced: true,
    state: {
        user: {},
        errors: [],
        loginInProgress: false
    },
    getters: {
        lastError(state) {
            const Es = state.errors.length;
            return Es? state.errors[Es - 1] : null
        },
        login(state) {return state.user.login},
        code() {return queryString.parse(window.location.search).code},
        token() {return queryString.parse(window.location.search).token}
    },
    mutations: {
        setUser (state, name) {state.user = name},
        setLoginFlag (state, f) {state.loginInProgress = f},
        addError (state, e) {state.errors.push(e)}
    },
    actions: {
        logout() {
            const URL = queryString.parseUrl(window.location.href);
            const redirect = queryString.stringifyUrl({
                url: URL.url, query: {...URL.query, code: null, token: null, logout: true}
            }, {skipNull: true});
            window.location = redirect;
        },
        redeemCode (nsContext) {
            if(nsContext.state.loginInProgress)
                return;
            if(nsContext.state.code === "")
                return nsContext.commit('addError', "Cannot login with empty code");
            nsContext.commit('setLoginFlag', true);
            fetch(
                '/.netlify/functions/githubAPI',
                {method: "POST", headers: {"task": "redeemCode", "github-code": nsContext.getters.code}}
            )
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`GitHub login received ${r.statusText} (${r.statusCode})`);
                    return r.json();
                })
                .then(r => {
                    console.log(r)
                    if(!r.access_token)
                        throw new Error(`Response had no token ${r}`);
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
        processToken (nsContext, token) {
            const URL = queryString.parseUrl(window.location.href);
            const redirect = queryString.stringifyUrl({
                url: URL.url, query: {...URL.query, code: null, token: token, logout: false}
            }, {skipNull: true});
            window.location = redirect;
        },
        getUserDetails(nsContext) {
            nsContext.commit('setLoginFlag', true);
            return fetch('/.netlify/functions/githubAPI', {
                method: "POST", headers: {task: "getUserDetails"},
                body: JSON.stringify({token: nsContext.getters.token})
            })
                .then(r => {
                    if(r.status !== 200) {
                        nsContext.dispatch('logout');
                        throw new Error(`Could not retrieve user details, logging out.`);
                    }
                    return r.json();
                })
                .then(user => nsContext.commit('setUser', user))
                .then(() => nsContext.commit('setLoginFlag', false))
                .then(() => nsContext.dispatch('workshop/findRepositories',
                    {owner: nsContext.getters.login}, {root: true}))
            .catch(e => {
                console.error(e);
                nsContext.commit('addError', e);
                nsContext.commit('setLoginFlag', false);
                nsContext.dispatch('logout');
            })
        }
    }
};