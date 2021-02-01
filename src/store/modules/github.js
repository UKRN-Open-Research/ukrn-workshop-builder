export default {
    namespaced: true,
    state: {
        code: "",
        login: "",
        repository: "",
        token: "",
        errors: [],
        loginInProgress: false
    },
    computed: {
        lastError: function() {
            const Es = this.state.errors.length;
            return Es? this.state.errors[Es - 1] : null
        }
    },
    mutations: {
        setCode (state, code) {state.code = code},
        setLogin (state, name) {state.login = name},
        setLoginFlag (state, f) {state.loginInProgress = f},
        setRepository (state, r) {state.repository = r},
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
                '/.netlify/functions/getToken',
                {method: "POST", headers: {github: nsContext.state.code}}
            )
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`${r.statusText} (${r.status})`);
                    return r.json()
                })
                .then(r => {
                    console.log(r)
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
            nsContext.commit('setRepository', payload.repository || "");
            nsContext.commit('setToken', payload.token || "");
        }
    }
};