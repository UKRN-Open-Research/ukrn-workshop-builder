export default {
    namespaced: true,
    state: {
        code: "",
        login: "",
        token: "",
        errors: [],
        loginInProgress: false
    },
    getters: {
        lastError(state) {
            const Es = state.errors.length;
            return Es? state.errors[Es - 1] : null
        }
    },
    mutations: {
        setCode (state, code) {state.code = code},
        setLogin (state, name) {state.login = name},
        setLoginFlag (state, f) {state.loginInProgress = f},
        setToken (state, t) {state.token = t},
        addError (state, e) {state.errors.push(e)}
    },
    actions: {
        tryGitHubCode: {
            root: true,
            handler (nsContext, payload) {
                // Set code
                nsContext.commit('setCode', payload);
                if(payload !== "")
                    nsContext.dispatch('redeemCode');
            }
        },
        redeemCode (nsContext) {
            if(nsContext.state.loginInProgress)
                return;
            if(nsContext.state.code === "")
                return nsContext.commit('addError', "Cannot login with empty code");
            nsContext.commit('setLoginFlag', true);
            fetch(
                '/.netlify/functions/githubAPI',
                {method: "POST", headers: {"task": "redeemCode", "github-code": nsContext.state.code}}
            )
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`GitHub login received ${r.statusText} (${r.statusCode})`);
                    return r.json();
                })
                .then(r => {
                    if(!r.token)
                        throw new Error(`Response had no token ${r}`);
                    nsContext.dispatch('readResponse', r);
                    nsContext.commit('setLoginFlag', false);
                })
                .catch(e => {
                    console.error(e);
                    nsContext.commit('addError', e);
                    nsContext.dispatch('readResponse', {});
                    nsContext.commit('setCode', ""); // unset code
                    nsContext.commit('setLoginFlag', false);
                })
        },
        readResponse (nsContext, payload) {
            nsContext.commit('setLogin', payload.login || "");
            nsContext.commit('setToken', payload.token || "");
            // Look up the user's repositories
            if(payload.login && payload.token)
                nsContext.dispatch(
                    'workshop/findRepositories',
                    {owner: payload.login},
                    {root: true}
                );
        }
    }
};