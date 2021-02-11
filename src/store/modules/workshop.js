const Base64 = require('js-base64');
const YAML = require('yaml');
export default {
    namespaced: true,
    state: {
        // Repositories indexed by their URLs
        repositories: [],
        // Files indexed by their URLs
        files: [],
        // Error stack
        errors: [],
        // Busy flags indexed by their URLs or names
        busyFlags: []

        /*baseConfig: null,
        lastPushedConfig: null,
        remoteConfigSHA: null,
        config: null,
        pushed: false,
        remoteRepository: "",
        customized: false,
        episodes: [],
        remoteEpisodes: [],
        outstandingChanges: [],
        busyFlag: false*/
    },
    mutations: {
        setItem(store, {array, item}) {
            const existing = store[array].filter(i => i.url === item.url);
            if(existing.length)
                store[array] = store[array].map(
                    i => i.url === item.url? item : i
                );
            else
                store[array].push(item);
        },
        setBusyFlag(store, {url, value}) {
            if(value)
                store.busyFlags.push(url);
            else
                store.busyFlags = store.busyFlags.filter(s => s !== url);
        },
        setMainRepository(store, {url}) {
            if(!store.repositories.filter(r => r.url === url).length)
                throw new Error(`Cannot set unknown repository as main: ${url}`);
            // Unset main flag for current main repository
            store.repositories = store.repositories.map(r => {
                return {...r, isMain: r.url === url}
            });
        },
        addError: function(state, e) {state.errors.push(e)}
        /*setBaseConfig: function(store, cfg) {store.baseConfig = cfg},
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
        /!**
         * Clear the outstanding changes for a file (or all files)
         * @param store {object} current store
         * @param [url=null] {string|null} url of the file with changes to clear
         *!/
        clearOutstandingChanges: function(store, url = null) {
            if(url === null)
                store.outstandingChanges = [];
            else
                store.outstandingChanges = store.outstandingChanges.filter(c => c.url !== url);
        },
        /!**
         * Update a file's SHA
         * @param store {object} current store
         * @param value {{url: string, sha: string}} file URL and new SHA
         *!/
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
        },*/
    },
    getters: {
        /**
         * Return a File object from a URL with decoded content, busyflag, YAML content breakdown, and file properties
         * @param state
         * @return {function(*=): {busyFlag: *, content: string, yaml: {...:*}, body: string|null}}
         * @constructor
         */
        File: (state, getters) => url => {
            const match = state.files.filter(f => f.url === url);
            if(!match.length)
                throw new Error(`Store has no file with URL: ${url}`);
            const file = match[0];
            // Process file content
            const textContent = Base64.decode(file.content);
            let yaml = null;
            let body = null;
            try{
                const parsed = YAML.parseAllDocuments(textContent);
                const yamlText = textContent.substring(...parsed[0].range);
                body = parsed.length > 1?
                    textContent.substring(...parsed[1].range) : null;
                yaml = YAML.parse(yamlText);
            } catch(e) {
                state.commit('addError', e)
            }
            return {
                ...file,
                content: textContent, yaml, body,
                busyFlag: () => getters.isBusy(url)
            }
        },
        /**
         * Return a Repository object from a URL with its Files included. If empty, return the main repository.
         * @param state
         * @return {function(*=): {files: []}}
         * @constructor
         */
        Repository: (state, getters) => url => {
            if(!url) {
                const main = state.repositories.filter(r => r.isMain);
                if(!main.length)
                    return null;
                url = main[0].url;
            }
            const match = state.repositories.filter(r => r.url === url);
            if(!match.length)
                throw new Error(`Store has no repository with URL: ${url}`);
            const repository = match[0];
            // Collect repository files
            const files = state.files
                .filter(f => f.url.indexOf(url) !== -1)
                .map(f => getters.File(f.url));
            // Check for a config file
            const configFile = files.filter(f => f.path === '_config.yml');
            return {...repository, files,
                busyFlag: () => getters.isBusy(url),
                config: configFile.length? getters.File(configFile[0].url) : null};
        },
        isBusy: state => url => state.busyFlags.includes(url),
        lastError(state) {
            if(state.errors.length)
                return state.errors[state.errors.length - 1];
            return null;
        }
    },
    actions: {
        /**
         * Add a repository to the store
         * @param store
         * @param url {string}
         * @param ownerLogin {string} Name of the repository's owner
         * @param name {string} Name of the repository on GitHub
         * @param isMain {boolean} Whether the repository is the main repository we are working on
         */
        addRepository(nsContext, {url, ownerLogin, name, isMain = false}) {
            if(isMain) {
                const main = nsContext.state.repositories.filter(r => r.isMain);
                if (main.length && main[0].url !== url)
                    throw new Error(`Cannot have multiple main repositories.\nPlease delete the existing main repository before adding another.`);
            }
            nsContext.commit('setItem', {
                array: 'repositories',
                item: {url, ownerLogin, name, isMain}
            });
        },
        /**
         * Add a file to the store
         * @param store {object}
         * @param url {string} GitHub API URL of file
         * @param content {string} Base64-encoded string.
         * @param sha {string} hash of the latest commit on the file
         * @param path {string} path from the repository root
         * @param [remoteContent=null] {string|null} Base64-encoded string. If not set, remoteContent is set to content
         * @param [overwrite=false] {boolean} If not set, throws an error trying to overwrite existing file
         */
        addFile(nsContext, {url, content, sha, path, remoteContent = null, overwrite = false}) {
            if(nsContext.state.files.filter(f => f.url === url).length && !overwrite)
                throw new Error('Attempt to overwrite existing file.\nTo overwrite files specify overwrite=true in the payload.');
            if(!Base64.isValid(content))
                throw new Error('payload.content must be a valid Base64-encoded string');
            nsContext.commit('setItem', {
                array: 'files',
                item: {url, content, sha, path, remoteContent: remoteContent || content}
            });
        },
        /**
         * Set a file's content
         * @param nsContext
         * @param url {string} URL of the file
         * @param content {string} content to set
         * @param encode {boolean} whether to have the back end encode the file in Base64
         */
        setFileContent(nsContext, {url, content, encode = true}) {
            if(encode)
                content = Base64.encode(content);
            if(!Base64.isValid(content))
                throw new Error('payload.content must be a valid Base64-encoded string');
            const files = nsContext.state.files.filter(f => f.url === url);
            if(!files.length)
                throw new Error(`Attempt to update content of unknown file: ${url}`)
            nsContext.commit('setItem', {
                array: 'files',
                item: {...files[0], content: content}
            });
        },
        /**
         * Set a file's content by specifying YAML + body
         * @param nsContext
         * @param url {string} URL of the file
         * @param yaml {*[]} YAML key-value pairs of content to set
         * @param [body=null] {string|null} body content
         */
        setFileContentFromYAML(nsContext, {url, yaml, body = null}) {
            let content = `---\n${YAML.stringify(yaml)}\n---\n${body}`;
            return nsContext.dispatch('setFileContent', {url, content, encode: true});
        },
        /**
         * Push a file to its remote repository and replace the current file with the remote version on success (keeps files sync'd with remote). Returns the newly sync'd file.
         * @param nsContext
         * @param url {string}
         * @return {null|Promise<function(*=): {busyFlag: *, content: string}>}
         */
        pushFile(nsContext, {url}) {
            const files = nsContext.state.files.filter(f => f.url === url);
            if(!files.length)
                throw new Error(`Attempted to update unknown file ${url}`);
            const file = files[0];
            if(nsContext.getters.isBusy(url))
                return null;
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'pushFile'},
                body: JSON.stringify({
                    content: file.content,
                    sha: file.sha,
                    token: nsContext.rootState.github.token
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        return null;
                    return r.json();
                })
                .then(json => nsContext.dispatch('addFile', {
                        url: json.url,
                        content: json.content,
                        sha: json.sha,
                        path: json.path,
                        overwrite: true
                    }))
                .then(() => {
                    nsContext.commit('setBusyFlag', {url, value: false});
                    return nsContext.getters.File(url);
                })
                .catch(e => {
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', {url, value: false});
                    console.error(e);
                    return null;
                })
        },
        /**
         * Create a repository (as the main repository)
         * @param nsContext
         * @param name {string}
         * @param template {string}
         * @return {null|Promise<function(*=): {files: *[]}>}
         */
        createRepository(nsContext, {name, template}) {
            if(!name)
                throw new Error('Cannot create a repository without a name');
            if(!template)
                throw new Error('Cannot create a repository without a template');
            const flag = "createRepository";
            if(nsContext.getters.isBusy(flag))
                return null;
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'createRepository'},
                body: JSON.stringify({
                    name, template, token: nsContext.rootState.github.token
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        return null;
                    return r.json();
                })
                .then(json => nsContext.dispatch('addRepository', {
                        url: json.url,
                        name: json.name,
                        ownerLogin: json.owner.login,
                        isMain: true
                    }))
                .then(() => {
                    nsContext.commit('setBusyFlag', {flag, value: false});
                    return nsContext.getters.Repository();
                })
                .catch(e => {
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', {flag, value: false});
                    console.error(e);
                    return null;
                })
        },
        /**
         * Find repositories matching search terms and create new repositories. Returns a list of the new repositories. This will never overwrite the main repository.
         * @param nsContext {object}
         * @param [topics] {string[]}
         * @param [owner] {string}
         * @return {null|Promise<function(*=): {files: *[]}>[]}
         */
        findRepositories(nsContext, {topics, owner}) {
            const flag = "findRepositories";
            if(nsContext.getters.isBusy(flag))
                return null;
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'findRepositories'},
                body: JSON.stringify({
                    topics, owner, token: nsContext.rootState.github.token
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        return null;
                    return r.json();
                })
                .then(async json => {
                    const urls = json.map(j => j.url);
                    const main = nsContext.getters.Repository();
                    const mainURL = main? main.url : "";
                    await Promise.all(
                        json.filter(j => j.url !== mainURL)
                            .map(j => nsContext.dispatch('addRepository', {
                                url: j.url,
                                ownerLogin: j.owner.login,
                                name: j.name
                            }))
                    );
                    nsContext.commit('setBusyFlag', {flag, value: false});
                    return urls.map(r => nsContext.getters.Repository(r));
                })
                .catch(e => {
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', {flag, value: false});
                    console.error(e);
                    return null;
                })
        },
        /**
         * Find files for a repository and return the repository with new files pulled.
         * @param nsContext {object}
         * @param url {string} Repository URL
         * @param includeEpisodes {boolean} Whether to search episode files
         * @param includeConfig {boolean} Whether to search config files
         * @param overwrite {boolean} Whether to overwrite existing files
         * @return {null|Promise<function(*=): {files: *[]}>}
         */
        findRepositoryFiles(nsContext, {url, includeEpisodes = true, includeConfig = true, overwrite = true}) {
            if(!nsContext.getters.Repository(url))
                throw new Error(`Cannot fetch files for unknown repository: ${url}`)
            if(nsContext.getters.isBusy(url))
                return null;
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'findRepositoryFiles'},
                body: JSON.stringify({
                    url, includeEpisodes, includeConfig,
                    token: nsContext.rootState.github.token
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        return null;
                    return r.json();
                })
                .then(async json => {
                    await Promise.all(json.map(j => nsContext.dispatch('addFile', {
                        url: j.url, content: j.content, sha: j.sha, path: j.path,
                        overwrite
                    })));
                    nsContext.commit('setBusyFlag', {url, value: false});
                    return nsContext.getters.Repository(url);
                })
                .catch(e => {
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', {url, value: false});
                    console.error(e);
                    return null;
                })
        },/*
        loadRemoteWorkshop: {
            root: true,
            /!**
             * Load a remote workshop and then fetch the episodes in that workshop
             * @param nsContext {object} namespaced context
             * @param payload {{user: string, token: string, repository: string, callback: function(error: string)}}
             *!/
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
        /!**
         * Fetch the episodes in a repository
         * @param nsContext {object} namespaced context
         * @param payload {{callback: function(error?: string|null, message?: string|null), repository?: string|null}}
         *  Callback function. Repository defaults to the user's remote repository, but if supplied will scrape a
         *  different repository and save the episodes in remoteEpisodes, from where they can be installed into the
         *  user's repository.
         *!/
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
        /!**
         * Send local changes to the remote repository
         * @param nsContext {object} namespaced context
         * @param payload {{callback: function(error: {null|string}, details?: {null|string})}} request details
         *!/
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
        /!**
         *
         * @param nsContext {object} namespaced context
         * @param payload {{episode: object}} remote episode to install
         *!/
        installRemoteEpisode(nsContext, payload) {
            console.log(`Installing ${payload.episode.metadata.name} from ${payload.episode.metadata.url}`)
        }*/
    }
};