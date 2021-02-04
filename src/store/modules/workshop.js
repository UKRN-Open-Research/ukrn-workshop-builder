export default {
    namespaced: true,
    state: {
        baseConfig: null,
        lastPushedConfig: null,
        remoteConfigSHA: null,
        config: null,
        pushed: false,
        remoteRepository: "",
        customized: false
    },
    mutations: {
        setBaseConfig: function(store, cfg) {store.baseConfig = cfg},
        updateConfig: function(store, cfg) {store.config = cfg},
        setPushed: function(store, value) {store.pushed = value},
        setRemote: function(store, value) {store.remoteRepository = value},
        setRemoteConfigSHA: function(store, value) {store.remoteConfigSHA = value},
        updateLastPushedConfig: function(store) {store.lastPushedConfig = store.config},
        setCustomized: function(store, value) {store.customized = value}
    },
    actions: {
        registerPush (nsContext, sha) {
            nsContext.commit('setPushed', true);
            if(sha)
                nsContext.commit('setRemoteConfigSHA', sha);
            nsContext.commit('updateLastPushedConfig');
        },
        initWorkshop: {
            root: true,
            handler (nsContext, payload) {
                // Customise workshop template text
                nsContext.commit('updateConfig', payload);
                nsContext.commit('setBaseConfig', payload);
                console.log(`Initialised workshop`)
            }
        },
        loadRemoteWorkshop: {
            root: true,
            handler (nsContext, payload) {
                // Fetch repo config from GitHub backend
                fetch(`/.netlify/functions/githubAPI`, {
                    method: "POST",
                    headers: {task: "fetchConfig"},
                    body: JSON.stringify({
                        token: nsContext.rootState.github.token,
                        ...payload
                    })
                })
                    .then(r => {
                        if(r.status !== 200)
                            throw new Error(`loadRemoteWorkshop received ${r.statusText} (${r.status})`);
                        console.log(r)
                        return r.json();
                    })
                    .then(j => {
                        const cfg = atob(j.base64);
                        nsContext.commit('updateConfig', cfg);
                        nsContext.commit('setBaseConfig', cfg);
                        nsContext.commit('setRemoteConfigSHA', j.sha);
                        nsContext.dispatch('registerPush');
                        nsContext.commit('setRemote', payload.repository);
                        console.log(`Initialised workshop from remote ${payload.user}/${payload.repository}`);
                    })
                    .catch(e => console.error(e));
            }
        },
        pushWorkshopToGitHub: {
            root: true,
            handler (nsContext, payload) {
                console.log(`Pushing workshop!`);
                fetch(`/.netlify/functions/githubAPI`, {
                    method: "POST",
                    headers: {task: "createRepository"},
                    body: JSON.stringify({
                        token: nsContext.rootState.github.token,
                        ...payload
                    })
                })
                    .then(r => {
                        if(r.status !== 200)
                            throw new Error(`Push workshop received ${r.statusText} (${r.status})`);
                        console.log(r)
                        return r.json();
                    })
                    .then(j => {
                        nsContext.dispatch('registerPush');
                        nsContext.commit('setRemote', j.name);
                    })
                    .catch(e => console.error(e));
            }
        },
        commitWorkshopConfigChanges: {
            root: true,
            handler (nsContext) {
                console.log("Pushing updated _config.yml to GitHub")
                fetch(`/.netlify/functions/githubAPI`, {
                    method: "POST",
                    headers: {task: "updateConfig"},
                    body: JSON.stringify({
                        config: btoa(nsContext.state.config),
                        token: nsContext.rootState.github.token,
                        user: nsContext.rootState.github.login,
                        repository: nsContext.state.remoteRepository
                    })
                })
                    .then(r => {
                        if(r.status !== 200)
                            throw new Error(`commitWorkshopConfigChanges received ${r.statusText} (${r.status})`);
                        return r.json();
                    })
                    .then(json => {
                        nsContext.dispatch('registerPush', json.sha);
                    })
                    .catch(e => console.error(e));
            }
        }
    }
};