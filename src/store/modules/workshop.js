export default {
    namespaced: true,
    state: {
        baseConfig: null,
        lastPushedConfig: null,
        remoteConfigSHA: null,
        config: null,
        pushed: false,
        remoteRepository: "",
        customized: false,
        episodes: [],
        errors: [],
        outstandingChanges: []
    },
    mutations: {
        setBaseConfig: function(store, cfg) {store.baseConfig = cfg},
        updateConfig: function(store, cfg) {store.config = cfg},
        setPushed: function(store, value) {store.pushed = value},
        setRemote: function(store, value) {store.remoteRepository = value},
        setRemoteConfigSHA: function(store, value) {store.remoteConfigSHA = value},
        updateLastPushedConfig: function(store) {store.lastPushedConfig = store.config},
        setCustomized: function(store, value) {store.customized = value},
        setEpisodes: function(store, value) {store.episodes = value},
        addEpisode: function(store, value) {store.episodes.push(value)},
        addOutstandingChange: function(store, value) {store.outstandingChanges.push(value)},
        clearOutstandingChanges: function(store) {store.outstandingChanges = []},
        addError: function(state, e) {state.errors.push(e)}
    },
    getters: {

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
                nsContext.dispatch('fetchEpisodes');
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
                        return r.json();
                    })
                    .then(j => {
                        const cfg = atob(j.base64);
                        nsContext.commit('updateConfig', cfg);
                        nsContext.commit('setBaseConfig', cfg);
                        nsContext.commit('setRemoteConfigSHA', j.sha);
                        nsContext.dispatch('registerPush');
                        nsContext.commit('setRemote', payload.repository);
                        nsContext.commit('setCustomized', true);
                        console.log(`Initialised workshop from remote ${payload.user}/${payload.repository}`);
                        nsContext.dispatch('fetchEpisodes');
                    })
                    .catch(e => {
                        console.error(e);
                        nsContext.commit('addError', e);
                    });
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
                    .catch(e => {
                        console.error(e);
                        nsContext.commit('addError', e);
                    });
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
                        nsContext.commit('setCustomized', true);
                    })
                    .catch(e => {
                        console.error(e);
                        nsContext.commit('addError', e);
                    });
            }
        },
        fetchEpisodes(nsContext) {
            fetch(`/.netlify/functions/githubAPI`, {
                method: "POST",
                headers: {task: "fetchEpisodes"},
                body: JSON.stringify({
                    token: nsContext.rootState.github.token,
                    user: nsContext.rootState.github.login,
                    repository: nsContext.state.remoteRepository
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`fetchEpisodes received ${r.statusText} (${r.status})`);
                    return r.json();
                })
                .then(json => {
                    nsContext.commit('setEpisodes', json.episodes.map(e => {
                        e.content = atob(e.content);
                        return e;
                    }));
                })
                .catch(e => {
                    console.error(e);
                    nsContext.commit('addError', e);
                });
        },
        updateEpisode(nsContext, payload) {
            // Update local
            nsContext.commit('setEpisodes', nsContext.state.episodes.map(e =>
                e.url === payload.episode.url? payload.episode : e
            ));

            if(payload.push)
                fetch(`/.netlify/functions/githubAPI`, {
                    method: "POST",
                    headers: {task: "updateFile"},
                    body: JSON.stringify({
                        token: nsContext.rootState.github.token,
                        file: payload.episode
                    })
                })
                    .then(r => {
                        if(r.status !== 200)
                            throw new Error(`updateEpisode received ${r.statusText} (${r.status})`);
                        return r.json();
                    })
                    .then(json => {
                        // TODO: handle update response (update local episode)
                        console.log({updateEpisodeResponse: json})
                    })
                    .catch(e => {
                        console.error(e);
                        nsContext.commit('addError', e);
                    });
            else
                nsContext.commit('addOutstandingChange', {type: "episode", url: payload.episode.url});
        }
    }
};