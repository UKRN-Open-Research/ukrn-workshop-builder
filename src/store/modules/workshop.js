const Base64 = require('js-base64');
const YAML = require('yaml');
export default {
    namespaced: true,
    // State should only be manipulated internally
    state: {
        // Repositories {object[]}
        repositories: [],
        // Files {object[]}
        files: [],
        // Error stack {string[]}
        errors: [],
        // Busy flags {string[]}
        busyFlags: []
    },
    // Mutations should only be called internally
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
        setBusyFlag(store, {flag, value}) {
            if(value && !store.busyFlags.includes(flag))
                store.busyFlags.push(flag);
            else
                store.busyFlags = store.busyFlags.filter(s => s !== flag);
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
    },
    // Getters are used to retrieve the state from the front end
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
            let yamlParseError = null;
            let body = null;
            try{
                const parsed = YAML.parseAllDocuments(textContent);
                const yamlText = textContent.substring(...parsed[0].range);
                body = parsed.length > 1?
                    textContent.substring(...parsed[1].range) : null;
                yaml = YAML.parse(yamlText);
            } catch(e) {
                body = textContent;
                yaml = {};
                yamlParseError = e;
            }
            return {
                ...file,
                content: textContent, yaml, yamlParseError, body,
                busyFlag: () => getters.isBusy(url),
                hasChanged: () => getters.hasChanged(url)
            }
        },
        /**
         * Return Files matched by a specified filter_function
         * @param state
         * @param getters
         * @return {function(*=): *}
         * @constructor
         */
        FilesByFilter: (state, getters) => filter_function => {
            return state.files.filter(filter_function).map(f => getters.File(f.url))
        },
        /**
         * Return a Repository object from a URL with its Files included. If empty, return the main repository.
         * @param state
         * @return {function([url: string]): {files: []}}
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
            const files = getters.FilesByFilter(f => f.url.indexOf(url) !== -1);
            // Check for a config file
            const configFiles = files.filter(f => f.path === '_config.yml');
            const episodes = files.filter(f => /^_episodes/.test(f.path));
            return {...repository, files, episodes,
                busyFlag: () => getters.isBusy(url),
                config: configFiles.length? configFiles[0] : null};
        },
        /**
         * Return Repositories matched by a specified filter_function
         * @param state
         * @param getters
         * @return {function(*=): *}
         * @constructor
         */
        RepositoriesByFilter: (state, getters) => filter_function => {
            return state.repositories.filter(filter_function).map(r => getters.Repository(r.url))
        },
        isBusy: state => url => state.busyFlags.includes(url),
        hasChanged: state => url => {
            const files = state.files.filter(f => f.url === url);
            if(!files.length)
                throw new Error(`Cannot read hasChanged of unknown file: ${url}`);
            return files[0].remoteContent !== files[0].content;
        },
        lastError(state) {
            if(state.errors.length)
                return state.errors[state.errors.length - 1];
            return null;
        },
        /**
         * Return a list of the parse errors in the current config file
         * @param state
         * @return {function(...[*]=): string[]}
         */
        listConfigErrors: state => config => {
            const existing = state.files.filter(f => f.url === config.url);
            if(!existing.length)
                throw new Error(`Cannot determine validity of unknown config: ${config.url}`);
            const errors = [];
            if(!config.yaml)
                return ['no-yaml'];
            if(!config.yaml.title)
                errors.push('no-title');
            else if(config.yaml.title === "My workshop")
                errors.push('default-title');
            if(!config.yaml['workshop-topic'])
                errors.push('no-topic');
            else if(config.yaml['workshop-topic'] === "TOPIC NOT SET")
                errors.push('default-topic');
            return errors;
        },
        isConfigValid: (state, getters) => config => {
            return !getters.listConfigErrors(config).length;
        }
    },
    // Actions are used to manipulate the state from the front end
    actions: {
        /**
         * Add a repository to the store
         * @param store
         * @param url {string}
         * @param ownerLogin {string} Name of the repository's owner
         * @param name {string} Name of the repository on GitHub
         * @param topics {string[]} Repository GitHub topics
         * @param isMain {boolean} Whether the repository is the main repository we are working on
         */
        addRepository(nsContext, {url, ownerLogin, name, topics, isMain = false}) {
            if(isMain) {
                const main = nsContext.state.repositories.filter(r => r.isMain);
                if (main.length && main[0].url !== url)
                    throw new Error(`Cannot have multiple main repositories.\nPlease delete the existing main repository before adding another.`);
            }
            nsContext.commit('setItem', {
                array: 'repositories',
                item: {url, ownerLogin, name, topics, isMain}
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
            nsContext.commit('setBusyFlag', {flag: url, value: true});
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'pushFile'},
                body: JSON.stringify({
                    url: file.url,
                    path: file.path,
                    content: file.content,
                    sha: file.sha,
                    token: nsContext.rootGetters['github/token']
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
                    nsContext.commit('setBusyFlag', {flag: url, value: false});
                    return nsContext.getters.File(url);
                })
                .catch(e => {
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', {flag: url, value: false});
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
            nsContext.commit('setBusyFlag', {flag, value: true});
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'createRepository'},
                body: JSON.stringify({
                    name, template, token: nsContext.rootGetters['github/token']
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
                    topics: json.topics,
                    isMain: true
                }))
                .then(() => nsContext.getters.Repository())
                .then(R => nsContext.dispatch('findRepositoryFiles', {url: R.url}))
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
            nsContext.commit('setBusyFlag', {flag, value: true});
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'findRepositories'},
                body: JSON.stringify({
                    topics, owner, token: nsContext.rootGetters['github/token']
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
                                topics: j.topics,
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
            nsContext.commit('setBusyFlag', {flag: url, value: true});
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'findRepositoryFiles'},
                body: JSON.stringify({
                    url, includeEpisodes, includeConfig,
                    token: nsContext.rootGetters['github/token']
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
                    nsContext.commit('setBusyFlag', {flag: url, value: false});
                    return nsContext.getters.Repository(url);
                })
                .catch(e => {
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', {flag: url, value: false});
                    console.error(e);
                    return null;
                })
        },
        /**
         * Set the Open Research topics of a repository
         * @param nsContext
         * @param topics {string[]}
         * @return {null|Promise<any>}
         */
        setTopics(nsContext, {topics}) {
            const main = nsContext.getters.Repository();
            if(!main)
                throw new Error(`Cannot set topics without a main repository.`);
            const unknownTopics = topics.filter(t => !nsContext.rootState.topicList.includes(t));
            if(unknownTopics.length)
                throw new Error(`Cannot set unknown topics: ${unknownTopics.join(', ')}`);
            if(nsContext.getters.isBusy(main.url))
                return null;
            nsContext.commit('setBusyFlag', {flag: main.url, value: true});
            const topicSet = {};
            nsContext.rootState.topicList.forEach(
                t => topicSet[t] = topics.includes(t)
            );
            return fetch("/.netlify/functions/githubAPI", {
                method: "POST", headers: {task: 'setTopics'},
                body: JSON.stringify({
                    url: main.url, topics: topicSet,
                    token: nsContext.rootGetters['github/token']
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        return null;
                    return r.json();
                })
                .then(() => nsContext.commit('setBusyFlag', {flag: main.url, value: false}))
                .then(() => nsContext.dispatch('findRepositories', {topics}))
                .catch(e => {
                    nsContext.commit('addError', e);
                    nsContext.commit('setBusyFlag', {flag: main.url, value: false});
                    console.error(e);
                    return null;
                })
        },
        saveRepositoryChanges(nsContext) {
            return Promise.allSettled(nsContext.getters.Repository().files
                .filter(F => F.hasChanged())
                .map(F => nsContext.dispatch('pushFile', F.url))
            )
                .then(results => {
                    const failures = results.filter(r => r === null).length;
                    return {
                        successes: results.length - failures,
                        failures: failures
                    };
                })
        }
    }
};