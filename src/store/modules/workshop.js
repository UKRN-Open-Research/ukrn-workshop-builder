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
        remoteEpisodes: [],
        outstandingChanges: [],
        busyFlag: false,
        errors: []
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
        addRemoteEpisodes: function(store, value) {value.episodes.forEach(e => {
            const episodes = store.remoteEpisodes.filter(ep => ep.url === e.url);
            if(episodes)
                episodes[0] = e;
            else
                store.remoteEpisodes.push(e);
        })},
        addOutstandingChange: function(store, value) {store.outstandingChanges.push(value)},
        /**
         * Clear the outstanding changes for a file (or all files)
         * @param store {object} current store
         * @param [url=null] {string|null} url of the file with changes to clear
         */
        clearOutstandingChanges: function(store, url = null) {
            if(url === null)
                store.outstandingChanges = [];
            else
                store.outstandingChanges = store.outstandingChanges.filter(c => c.url !== url);
        },
        /**
         * Update a file's SHA
         * @param store {object} current store
         * @param value {{url: string, sha: string}} file URL and new SHA
         */
        updateSHA(store, value) {
            console.log({updateSHA: value})
            if(value.url === store.config.url) {
                store.remoteConfigSHA = value.sha;
                return;
            }
            try {
                store['episodes'].filter(e => e.url === value.url)[0].sha = value.sha;
            } catch(e) {
                console.error(e);
            }
        },
        setBusyFlag: function(store, value) {store.busyFlag = value},
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
            /**
             * Load a remote workshop and then fetch the episodes in that workshop
             * @param nsContext {object} namespaced context
             * @param payload {{user: string, token: string, repository: string, callback: function(error: string)}}
             */
            handler (nsContext, payload) {
                if(nsContext.busyFlag)
                    return;
                nsContext.commit('setBusyFlag', true);
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
                        nsContext.commit('clearOutstandingChanges');
                        console.log(`Initialised workshop from remote ${payload.user}/${payload.repository}`);
                        nsContext.commit('setBusyFlag', false);
                        nsContext.dispatch('fetchEpisodes', {callback: payload.callback});
                    })
                    .catch(e => {
                        console.error(e);
                        nsContext.commit('addError', e);
                        nsContext.commit('setBusyFlag', false);
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
        /**
         * Fetch the episodes in a repository
         * @param nsContext {object} namespaced context
         * @param payload {{callback: function(error?: string|null, message?: string|null), repository?: string|null}}
         *  Callback function. Repository defaults to the user's remote repository, but if supplied will scrape a
         *  different repository and save the episodes in remoteEpisodes, from where they can be installed into the
         *  user's repository.
         */
        fetchEpisodes(nsContext, payload) {
            if(nsContext.state.busyFlag)
                return;
            nsContext.commit('setBusyFlag', true);
            const repository = payload.repository || nsContext.state.remoteRepository;
            const saveAction = payload.repository? 'addRemoteEpisodes' : 'setEpisodes';
            fetch(`/.netlify/functions/githubAPI`, {
                method: "POST",
                headers: {task: "fetchEpisodes"},
                body: JSON.stringify({
                    token: nsContext.rootState.github.token,
                    user: nsContext.rootState.github.login,
                    repository
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`fetchEpisodes received ${r.statusText} (${r.status})`);
                    return r.json();
                })
                .then(json => {
                    nsContext.commit(saveAction, json.episodes.map(e => {
                        e.content = atob(e.content);
                        return e;
                    }));
                    // Clear outstanding changes for each episode we just loaded
                    json.episodes.map(e => e.url).forEach(url => nsContext.commit('clearOutstandingChanges', url));
                    nsContext.commit('setBusyFlag', false);
                    if(typeof payload.callback === "function")
                        payload.callback(null);
                })
                .catch(e => {
                    console.error(e);
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', false);
                    if(typeof payload.callback === "function")
                        payload.callback(e);
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
                        file: {...payload.episode, content: btoa(payload.episode.content)}
                    })
                })
                    .then(r => {
                        if(r.status !== 200)
                            throw new Error(`updateEpisode received ${r.statusText} (${r.status})`);
                    })
                    .catch(e => {
                        console.error(e);
                        nsContext.commit('addError', e);
                        nsContext.commit('addOutstandingChange', {type: "episodes", url: payload.episode.url});
                    });
            else
                nsContext.commit('addOutstandingChange', {type: "episodes", url: payload.episode.url});
        },
        /**
         * Send local changes to the remote repository
         * @param nsContext {object} namespaced context
         * @param payload {{callback: function(error: {null|string}, details?: {null|string})}} request details
         */
        commitChanges(nsContext, payload) {
            if(nsContext.state.busyFlag)
                return;
            nsContext.commit('setBusyFlag', true);
            let successes = 0;
            Promise.all(nsContext.state.outstandingChanges.map(c => {
                const matches = nsContext.state[c.type].filter(x => x.url === c.url);
                if(!matches)
                    throw new Error(`commitChanges cannot find file ${c.url} (type: ${c.type})`);
                const file = matches[0];
                console.log(`commitChanges to ${file.name}`)
                return fetch('/.netlify/functions/githubAPI', {
                    method: "POST", headers: {task: "updateFile"},
                    body: JSON.stringify({
                        token: nsContext.rootState.github.token,
                        file: {...file, content: btoa(file.content)}
                    })
                })
                    .then(r => {
                        if (r.status !== 200)
                            throw new Error(`commitChanges received ${r.statusText} (${r.status})`);
                        return r.json();
                    })
                    .then(json => {
                        successes++;
                        nsContext.commit('updateSHA', {url: json.content.url, sha: json.content.sha});
                        nsContext.commit('clearOutstandingChanges', c.url);
                    })
                    .catch(e => {
                        console.log(`Error while updating ${c.url}: ${e}`)
                    })
            }))
                .then(() => {
                    if (nsContext.state.outstandingChanges.length)
                        throw new Error(`Failed to commit changes to all files. Successes: ${successes}, Failures: ${nsContext.state.outstandingChanges.length}`)
                })
                .then(() => {
                    if(typeof payload.callback === "function")
                        payload.callback(null, `Saved changes to ${successes} files.`);
                    nsContext.commit('setBusyFlag', false);
                })
                .catch(e => {
                    if(typeof payload.callback === "function") payload.callback(
                        e.message? `Error committing changes: ${e.message}` : e
                    )
                    nsContext.commit('setBusyFlag', false);
                });
        },
        /**
         *
         * @param nsContext {object} namespaced context
         * @param payload {{episode: object}} remote episode to install
         */
        installRemoteEpisode(nsContext, payload) {
            console.log(`Installing ${payload.episode.metadata.name} from ${payload.episode.metadata.url}`)
        }
    }
};