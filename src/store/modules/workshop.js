const Base64 = require('js-base64');
const YAML = require('yaml');
const queryString = require('query-string');

/**
 * A File represents a single file on a GitHub repository.
 * @typedef {Object} File
 * @property url {string} GitHub URL of the file.
 * @property path {string} Portion of the file's url after the repository route.
 * @property remoteContent {string} Content of the file on GitHub.
 * @property content {string} Content of the file in the Workshop Builder Tool memory.
 * @property sha {string} SHA-1 hash of the last file state.
 * @property busyFlag {boolean} Whether the File is locked for editing due to ongoing backend activity.
 * @property hasChanged {boolean} Whether the content differs from the remoteContent.
 * @property yaml {Object} YAML portion of the content decomposed into an object.
 * @property yamlParseError {string|null} Most recent error when trying to parse the file YAML.
 * @property body {string} Non-YAML portion of the content.
 */

/**
 * A Repository represents a complete GitHub repository.
 * @typedef {Object} Repository
 * @property url {string} GitHub URL of the repository.
 * @property topics {string[]} GitHub tags for the repository.
 * @property isMain {boolean} Whether this repository is the repository being built by the Workshop Builder Tool.
 * @property name {string} Repository name on GitHub.
 * @property ownerLogin {string} Repository owner login name on GitHub.
 * @property config {File} Configuration file _config.yml.
 * @property files {File[]} Files in the repository.
 * @property episodes {File[]} Episode files in the repository.
 * @property [episode_template] {File} Template for new episodes.
 * @property busyFlag {boolean} Whether the repository is being modified or saved to GitHub.
 * @property extraFiles {Object<string, File|File[]>} Additional non-episode files that can be customised.
 */

/**
 * A GitHub Template repository. Templates are used to create new repositories. When a repository is created form a template, the files from the template are copied, but the git history is not.
 * @typedef {Object} Template
 * @property url {string} GitHub URL of the repository.
 * @property topics {string[]} GitHub tags for the repository.
 * @property name {string} Repository name on GitHub.
 * @property ownerLogin {string} Repository owner login name on GitHub.
 * @property description {string} Repository description on GitHub.
 */

/**
 * The Workshop state object.
 * @name State
 * @memberOf workshop
 * @type {Object}
 * @property {Repository[]} repositories The Repositories loaded from GitHub.
 * @property {File[]} files Files loaded from GitHub.
 * @property {Template[]} templates Template repositories loaded from GitHub.
 * @property {Error[]} errors Errors encountered.
 * @property {string[]} busyFlags URLs marked as currently busy.
 */
const state = {
    // Repositories {object[]}
    repositories: [],
    // Files {object[]}
    files: [],
    // Templates {Template[]}
    templates: [],
    // Error stack {string[]}
    errors: [],
    // Busy flags {string[]}
    busyFlags: []
};

/**
 * The workshop 'setters' object.
 * @name Mutations
 * @memberOf workshop
 * @type {Object}
 * @mutator {{array:string, item:{url:string, ...*:any}}} setItem=files|repositories Change an item in the repositories or files state arrays.
 * @mutator {{array:string, item:{url:string, ...*:any}}} removeItem=files|repositories Remove an item from the repositories or files state arrays.
 * @mutator {{flag: string, value: boolean}} setBusyFlag=busyFlags Set or unset a busy flag by item URL.
 * @mutator {{url:string, ...*:any}} setMainRepository=repositories Set the repository with the specified URL as the main repository.
 * @mutator {{Error}} addError=errors Add an error to the list of encountered errors.
 */
const mutations = {
    setItem(store, {array, item}) {
        // Strip the branch identifier if it exists
        item.url = queryString.parseUrl(item.url).url;
        if(!store[array] || !(store[array] instanceof Array))
            throw new Error(`Cannot set unknown store item type ${array}`)
        const existing = store[array].filter(i => i.url === item.url);
        if(existing.length)
            store[array] = store[array].map(
                i => i.url === item.url? item : i
            );
        else
            store[array].push(item);
    },
    removeItem(store, {array, item}) {
        if(!store[array] || !(store[array] instanceof Array))
            throw new Error(`Cannot remove unknown store item type ${array}`)
        store[array] = store[array].filter(i => i.url !== item.url)
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
};

/**
 * Workshop getter object.
 * @name Getters
 * @memberOf workshop
 * @type {Object}
 * @getter {function(url:string):File} File=files Returns a function to retrieve a File specified by a URL.
 * @getter {function(filter:function):File[]} Returns a function to retrieve all Files matching the specified Array.filter function.
 * @getter {function(?url:string):Repository} Repository=repositories Returns a function to retrieve a Repository specified by a URL. If no URL is supplied, returns the current main repository.
 * @getter {function(filter:function):Repository[]} Returns a function to retrieve all Repositories matching the specified Array.filter function.
 * @getter {function(url:string):boolean} isBusy=busyFlags Returns a function to determine whether a busy flag has been set on the item with the specified URL.
 * @getter {function(url:string):boolean} hasChanged Returns a function to determine whether the file with the specified URL has changed from its GitHub representation.
 * @getter {Error} lastError=errors Return the most recent error encountered.
 * @getter {{?yaml:string, ?title:string, ?topic:string}} listConfigErrors Return the configuration errors detected in a the main repository config file.
 * @getter {function(config:File):boolean} isConfigValid Return a function to determine whether a specified configuration file is valid.
 */
const getters = {
    /****
     * Return a File object from a URL with decoded content, busyflag, YAML content breakdown, and file properties
     */
    File: (state, getters) => url => {
        const match = state.files.filter(f => f.url === url);
        if(!match.length)
            throw new Error(`Store has no file with URL: ${url}`);
        const file = match[0];
        return {
            ...file,
            busyFlag: () => getters.isBusy(url),
            hasChanged: () => getters.hasChanged(url)
        }
    },
    /****
     * Return Files matched by a specified filter_function
     */
    FilesByFilter: (state, getters) => filter_function => {
        return state.files.filter(filter_function).map(f => getters.File(f.url))
    },
    /****
     * Return a Repository object from a URL with its Files included. If empty, return the main repository.
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
        const files = getters.FilesByFilter(f => fileInRepository(f.url, url));
        // Check for a config file
        const configFiles = files.filter(f => f.path === '_config.yml');
        const extraFiles = {
            intro: null,
            setup_files: [],
            optional_intro_sections: [],
            notes: null
        };
        if(configFiles.length) {
            extraFiles.intro = getRepoIntroFile(files, configFiles[0].yaml.topic);
            // Setup files
            files.map(f => {
                const name = /^_includes\/install_instructions\/([^/.]+)\.html$/.exec(f.path);
                if(name)
                    if(configFiles[0].yaml.setup_files.includes(name[1]))
                        extraFiles.setup_files.push(f);
            });
            // Optional intro files
            files.map(f => {
                const name = /^_includes\/intro\/optional\/([^/.]+)\.md$/.exec(f.path);
                if(name)
                    if(configFiles[0].yaml.optional_intro_sections.includes(name[1]))
                        extraFiles.optional_intro_sections.push(f);
            });
        }
        const notesFiles = files.filter(f => f.path === 'notes.md');
        if(notesFiles.length)
            extraFiles.notes = notesFiles[0];
        const episodes = files
            .filter(f => /^_episodes/.test(f.path))
            .filter(i => !i.yaml['ukrn_wb_rules'] || !i.yaml['ukrn_wb_rules'].includes('hidden'));
        const episode_template = files.filter(i => i.yaml['ukrn_wb_rules'] && i.yaml['ukrn_wb_rules'].includes('template'));
        return {
            ...repository, files, episodes,
            episode_template: episode_template.length? episode_template[0] : null,
            busyFlag: () => getters.isBusy(url),
            config: configFiles.length? configFiles[0] : null,
            extraFiles
        };
    },
    /****
     * Return Repositories matched by a specified filter_function
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
    /****
     * Return a list of the parse errors in the current config file
     */
    listConfigErrors: state => config => {
        const existing = state.files.filter(f => f.url === config.url);
        if(!existing.length)
            throw new Error(`Cannot determine validity of unknown config: ${config.url}`);
        const errors = {};
        if(!config.yaml)
            return {yaml: "The config must have YAML content signified by ---"};
        if(!config.yaml.workshop_id)
            errors.id = "The workshop must have an identifier";
        if(!config.yaml.title)
            errors.title = "The title cannot be blank";
        if(!config.yaml.topic)
            errors.topic = "The topic cannot be empty";
        return errors;
    },
    isConfigValid: (state, getters) => config => {
        return !Object.keys(getters.listConfigErrors(config)).length;
    }
};


const actions = {
    /**
     * Add a repository to the store.
     * @memberOf workshop
     * @action addRepository=repositories
     * @param {StoreContext} nsContext
     * @param repository {Repository} The repository to add to the store.
     * @return {void}
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
        nsContext.commit('setBusyFlag', {flag: url, value: false});
    },
    /**
     * Add a file to the store.
     * @memberOf workshop
     * @action addFile=files
     * @param {StoreContext} nsContext
     * @param file {File} File to add. If overwriting an existing file, File.overwrite must be set to true.
     * @return {void}
     */
    addFile(nsContext, {url, content, sha, path, remoteContent = null, overwrite = false}) {
        if(nsContext.state.files.filter(f => f.url === url).length && !overwrite)
            throw new Error('Attempt to overwrite existing file.\nTo overwrite files specify overwrite=true in the payload.');
        if(!Base64.isValid(content))
            throw new Error('payload.content must be a valid Base64-encoded string');
        content = Base64.decode(content);
        if(remoteContent !== null && !Base64.isValid(remoteContent))
            throw new Error('payload.remoteContent must be a valid Base64-encoded string');
        else if(remoteContent !== null)
            remoteContent = Base64.decode(remoteContent);
        nsContext.commit('setItem', {
            array: 'files',
            item: {
                url, content, sha, path, remoteContent: remoteContent || content,
                ...parseYAML(content)
            }
        });
    },
    /**
     * Set a file's content.
     * @memberOf workshop
     * @action setFileContent=files
     * @param {StoreContext} nsContext
     * @param file {File} Updated file with content to set.
     * @return {Promise<File>} The updated file.
     */
    setFileContent(nsContext, {url, content}) {
        const files = nsContext.state.files.filter(f => f.url === url);
        if(!files.length)
            throw new Error(`Attempt to update content of unknown file: ${url}`)
        nsContext.commit('setItem', {
            array: 'files',
            item: {...files[0], content: content, ...parseYAML(content)}
        });
    },
    /**
     * Set a file's content by specifying YAML + body.
     * @memberOf workshop
     * @action setFileContentFromYAML=files
     * @param {StoreContext} nsContext
     * @param file {File} Updated file with yaml and body set.
     * @return {Promise<File>} The updated file.
     */
    setFileContentFromYAML(nsContext, {url, yaml, body = null}) {
        if(body)
            body = body.replace(/^\n+/, '');
        let content = `---\n${YAML.stringify(yaml)}\n---\n${body}`;
        return nsContext.dispatch('setFileContent', {url, content});
    },
    /**
     * Duplicate a file.
     * @memberOf workshop
     * @action duplicateFile=files
     * @param {StoreContext} nsContext
     * @param {File} File to copy.
     * @return {Promise<File>} The newly created copy.
     */
    duplicateFile(nsContext, {url}) {
        const fileMatches = nsContext.state.files.filter(i => i.url === url);
        if(!fileMatches.length)
            throw new Error(`Cannot duplicate unknown file: ${url}`);
        const file = fileMatches[0];
        // Find a free path
        const match = /^(?<name>.+)\.(?<ext>[^.]+)$/.exec(file.path);
        let newPath;
        let newURL;
        let i = 0;
        do {
            newPath = `${match.groups.name}_${(++i).toString()}.${match.groups.ext}`;
            newURL = file.url.replace(file.path, newPath);
        } while(nsContext.state.files.filter(f => f.url === newURL).length);
        // Add the new copy
        const item = {
            ...file,
            ...parseYAML(file.content),
            url: newURL,
            path: newPath,
            remoteContent: ""
        };
        nsContext.commit('setItem', {array: 'files', item});
        return nsContext.getters.File(newURL);
    },
    /**
     * Push a file to its remote repository and replace the current file with the remote version on success (keeps files sync'd with remote). Returns the newly sync'd file.
     * @memberOf workshop
     * @action pushFile=files
     * @param {StoreContext} nsContext
     * @param file {File} File to push to GitHub.
     * @return {Promise<File|null>} The file, or null on error.
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
                content: Base64.encode(file.content),
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
            // Update topics if we updated the topic in the config file
            .then(async F => {
                if(F.path === '_config.yml') {
                    const repo = nsContext.getters.Repository();
                    if(repo && !repo.topics.includes(F.yaml.topic))
                        await nsContext.dispatch('setTopics', {topics: [F.yaml.topic]});
                }
                nsContext.dispatch('github/registerBuildCheck', {}, {root: true});
                return F;
            })
            .catch(e => {
                nsContext.commit('addError', e);
                nsContext.commit('setBusyFlag', {flag: url, value: false});
                console.error(e);
                return null;
            })
    },
    /**
     * Upload an image file to GitHub.
     * @memberOf workshop
     * @action uploadImage
     * @param {StoreContext} nsContext
     * @param payload {{path:string, file:Object}}
     * @return {Promise<string|boolean>} sha of overwritten file or true on success, or false on failure
     */
    async uploadImage(nsContext, {path, file}) {
        try {
            console.log({path, file})
            const repo = nsContext.getters.Repository();
            if(!repo)
                throw new Error('Cannot upload image without a main repository');
            const url = `${repo.url}/contents${path}`;
            const sha = await fetch('/.netlify/functions/githubAPI', {
                method: "POST", headers: {task: 'pullItem'},
                body: JSON.stringify({
                    url, token: nsContext.rootGetters['github/token']
                })
            })
                .then(r => r.json())
                .then(r => r.sha)
                .catch(() => {});

            await fetch('/.netlify/functions/githubAPI', {
                method: "POST", headers: {task: 'pushFile'},
                body: JSON.stringify({
                    url, sha,
                    path: path.substring(1), // strip leading /
                    content: /data:\w+\/\w+;base64,([\w\W]+)$/.exec(file.miniurl)[1],
                    token: nsContext.rootGetters['github/token']
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`uploadImage(${path}) received ${r.statusText} (${r.status})`);
                });
            return sha || true;
        }
        catch(e) {
            nsContext.commit('addError', e);
            console.error(e);
            return false;
        }
    },
    /**
     * Pull a URL from GitHub and return the result directly.
     * @memberOf workshop
     * @action pullURL
     * @param {StoreContext} nsContext
     * @param payload {url:string} Object with a target URL to pull from GitHub.
     * @return {Promise<object|null>}
     */
    pullURL(nsContext, {url}) {
        if(nsContext.getters.isBusy(url))
            return null;
        return fetch("/.netlify/functions/githubAPI", {
            method: "POST", headers: {task: "pullItem"},
            body: JSON.stringify({url, token: nsContext.rootGetters['github/token']})
        })
            .then(r => {
                if(r.status !== 200)
                    throw new Error(`pullItem received ${r.statusText} (${r.status})`)
                nsContext.commit('setBusyFlag', {flag: url, value: false});
                return r.json();
            })
            .catch(e => {
                nsContext.commit('addError', e);
                nsContext.commit('setBusyFlag', {flag: url, value: false});
                console.error(e);
                return null;
            })
    },
    /**
     * Create a repository (as the main repository).
     * @memberOf workshop
     * @action createRepository=repositories
     * @param {StoreContext} nsContext
     * @param payload {{name:string, template:string}} Repository template to create under given name.
     * @return {Promise<Repository|null>} Newly create Repository.
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
                    throw new Error(`createRepository received ${r.statusText} (${r.status})`)
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
                nsContext.dispatch('github/registerBuildCheck', {}, {root: true});
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
     * Load repositories matching search terms from GitHub. Returns a list of the new repositories. This will never overwrite the main repository.
     * @memberOf workshop
     * @action findRepositories=repositories
     * @param {StoreContext} nsContext
     * @param payload {{?topics:string, ?owner:string}} Search parameters to use in the GitHub search.
     * @return {Promise<Repository[]|null>}
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
                    throw new Error(`findRepositories received ${r.statusText} (${r.status})`)
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
     * @memberOf workshop
     * @action findRepositoryFiles=files
     * @param {StoreContext} nsContext
     * @param payload {Object}
     * @param payload.url {string} URL of the Repository whose files should be retrieved from GitHub..
     * @param [payload.includeEpisodes = true] {boolean} Whether to search episode files.
     * @param [payload.includeExtraFiles = true] {boolean} Whether to search config files.
     * @param [payload.overwrite = true] {boolean} Whether to overwrite existing files.
     * @return {Promise<Repository|null>} The repository with its newly-fetched files.
     */
    findRepositoryFiles(nsContext, {url, includeEpisodes = true, includeExtraFiles = true, overwrite = true}) {
        if(!nsContext.getters.Repository(url))
            throw new Error(`Cannot fetch files for unknown repository: ${url}`)
        if(nsContext.getters.isBusy(url))
            return null;
        nsContext.commit('setBusyFlag', {flag: url, value: true});
        let extraFiles = null;
        if(includeExtraFiles) {
            extraFiles = [
                ...[...nsContext.rootState.topicList, 'unknown-topic'].map(
                    t => `_includes/intro/topic-intros/${t}.md`
                ),
                'notes.md',
                '_config.yml'
            ]
        }
        return fetch("/.netlify/functions/githubAPI", {
            method: "POST", headers: {task: 'findRepositoryFiles'},
            body: JSON.stringify({
                url, includeEpisodes, extraFiles,
                token: nsContext.rootGetters['github/token']
            })
        })
            .then(r => {
                if(r.status !== 200)
                    throw new Error(`findRepositoryFiles received ${r.statusText} (${r.status})`)
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
     * Fetch a list of available templates from GitHub.
     * @memberOf workshop
     * @action findTemplates=templates
     * @param {StoreContext} nsContext
     */
    findTemplates(nsContext) {
        const flag = "findTemplates";
        if(nsContext.getters.isBusy(flag))
            return null;
        nsContext.commit('setBusyFlag', {flag, value: true});
        return fetch("/.netlify/functions/githubAPI", {
            method: "POST", headers: {task: 'findRepositories'},
            body: JSON.stringify({
                topics: ["ukrn-wb-template"], token: nsContext.rootGetters['github/token']
            })
        })
            .then(r => {
                if(r.status !== 200)
                    throw new Error(`findTemplates received ${r.statusText} (${r.status})`)
                return r.json();
            })
            .then(async json => {
                await Promise.all(
                    json.map(j => nsContext.commit('setItem', {
                        array: 'templates',
                        item: {
                            url: j.url,
                            ownerLogin: j.owner.login,
                            topics: j.topics,
                            name: j.name,
                            description: j.description
                        }
                    }))
                );
                nsContext.commit('setBusyFlag', {flag, value: false});
            })
            .catch(e => {
                nsContext.commit('addError', e);
                nsContext.commit('setBusyFlag', {flag, value: false});
                console.error(e);
                return null;
            })
    },
    /**
     * Set the Open Research topics of a repository.
     * @memberOf workshop
     * @action setTopics=repositories
     * @param {StoreContext} nsContext
     * @param payload {{topics: Array<string>}} A list of Open Science topics. Should be a subset of the topics in the root store topic list.
     * @return {Promise<null|Repository[]>} Repositories matching the newly-specified topics.
     */
    setTopics(nsContext, {topics}) {
        console.log(`setTopics(${topics})`)
        const main = nsContext.getters.Repository();
        if(!main)
            throw new Error(`Cannot set topics without a main repository.`);
        const unknownTopics = topics
            .filter(t => !nsContext.rootState.topicList.includes(t))
            .filter(t => t !== "");
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
            // Update topics on the local Repository
            .then(json => nsContext.commit('setItem', {
                array: 'repositories', item: {
                    ...nsContext.state.repositories.filter(r => r.isMain)[0],
                    topics: json
                }}))
            .then(() => nsContext.commit('setBusyFlag', {flag: main.url, value: false}))
            .then(() => nsContext.dispatch('findRepositories', {topics}))
            .catch(e => {
                nsContext.commit('addError', e);
                nsContext.commit('setBusyFlag', {flag: main.url, value: false});
                console.error(e);
                return null;
            })
    },
    /**
     * Save all changed files in the main Repository.
     * @memberOf workshop
     * @action saveRepositoryChanges
     * @param {StoreContext} nsContext
     * @return {Promise<{failures: number, successes: number}>} The numbers of requests that succeeded and failed.
     */
    saveRepositoryChanges(nsContext) {
        return Promise.allSettled(nsContext.getters.Repository().files
            .filter(F => F.hasChanged())
            .map(F => {
                console.log(`Updating ${F.path}`)
                nsContext.dispatch('pushFile', {url: F.url})
            })
        )
            .then(results => {
                const failures = results.filter(r => r === null).length;
                return {
                    successes: results.length - failures,
                    failures: failures
                };
            })
    },
    /**
     * Load a repository from GitHub.
     * @memberOf workshop
     * @action loadRepository=repositories
     * @param {StoreContext} nsContext
     * @param payload {{url:string}} URL of the repository to fetch from GitHub.
     * @return {Promise<Repository|null>} The local repository object corresponding to the retrieved repository.
     */
    loadRepository(nsContext, {url}) {
        nsContext.commit('setBusyFlag', {flag: url, value: true});
        return fetch("/.netlify/functions/githubAPI", {
            method: "POST", headers: {task: 'pullItem'},
            body: JSON.stringify({
                url: url, token: nsContext.rootGetters['github/token']
            })
        })
            .then(r => {
                if(r.status !== 200)
                    return null;
                return r.json();
            })
            .then(r => nsContext.dispatch('addRepository', r))
            .then(() => nsContext.commit('setMainRepository', {url}))
            .then(() => nsContext.commit('setBusyFlag', {flag: url, value: false}))
            .then(() => nsContext.getters.Repository(url))
            .catch(e => {
                nsContext.commit('addError', e);
                nsContext.commit('setBusyFlag', {flag: url, value: false});
                console.error(e);
                return null;
            })
    },
    /**
     * Install a copy of a remote file from GitHub.
     * @memberOf workshop
     * @action installFile=files
     * @param {StoreContext} nsContext
     * @param payload {{url: string}} URL of the file to install on the original GitHub repository.
     * @return {Promise<File|null>} Local copy of the file as installed in the main repository on GitHub.
     */
    async installFile(nsContext, {url}) {
        // Check file is okay to install
        const Repo = nsContext.getters.Repository();
        const File = nsContext.getters.File(url);
        const fList = Repo.files.map(f => f.url);
        let newURL = `${Repo.url}/contents/${File.path}`;
        // Adjust newURL if it's in Repo already
        while(fList.includes(newURL)) {
            const x = /^([\w\W]+?)(\.[^.]*)?$/.exec(newURL);
            const name = x[1];
            const ext = x.length > 2? x[2] : "";
            const m = /_([0-9]+)$/.exec(name);
            if (m)
                newURL = `${name.replace(/_[0-9]+$/, `_${parseInt(m[1]) + 1}`)}${ext}`;
            else
                newURL = `${name}_1${ext}`;
        }

        if(!File) {
            nsContext.commit('addError', `No such file to install: ${url}`);
            return null;
        }
        if(fileInRepository(File.url, Repo.url)) {
            nsContext.commit('addError', 'Cannot install File into its own Repository');
            return null;
        }

        // Find the file's name/repository route
        const re = new RegExp(`^https://api.github.com/repos/([^/]+/[^/]+)/contents/${File.path}$`);
        const name_repo = re.exec(File.url);
        if(!name_repo)
            throw new Error(`${File.url} does not appear to be a valid GitHub URL`);

        nsContext.commit('setBusyFlag', {flag: url, value: true});

        // Create new file
        await nsContext.dispatch('addFile', {
            url: newURL,
            content: Base64.encode(File.content),
            sha: null,
            path: newURL.replace(`${Repo.url}/contents/`, "")
        });

        let newFile = nsContext.getters.File(newURL);

        nsContext.commit('setBusyFlag', {flag: newURL, value: true});

        // Register dependencies
        const newYAML = {...newFile.yaml};
        newYAML.missingDependencies = findFileDependencies(File).map(ref => ref.replace(/^\.\.\//, '/'));
        newYAML.dependencies = [];
        newYAML.originalRepository = name_repo[1];
        await nsContext.dispatch('setFileContentFromYAML', {...newFile, yaml: newYAML});

        newFile = await nsContext.dispatch('installDependencies', {url: newURL});

        // Unset busy flag so pushFile doesn't complain
        nsContext.commit('setBusyFlag', {flag: newURL, value: false});
        // Update file to copy target content + use safe dependency links
        return nsContext.dispatch('pushFile', {url: newURL})
            // Drop original
            .then(F => {
                nsContext.commit('setBusyFlag', {flag: url, value: false});
                nsContext.commit('setBusyFlag', {flag: newURL, value: false});
                // Remove original by reference to its URL
                nsContext.commit('removeItem', {array: 'files', item: {url}});
                return F;
            })
            .catch(e => {
                nsContext.commit('addError', e);
                console.error(e);
                nsContext.commit('setBusyFlag', {flag: url, value: false});
                nsContext.commit('setBusyFlag', {flag: newURL, value: false});
                return null;
            })
    },
    /**
     * Install the dependencies for a file.
     * @memberOf workshop
     * @action installDependencies=files
     * @param {StoreContext} nsContext
     * @param payload {{url: string}} URL of the file whose dependencies should be installed
     * @return {Promise<File>} File with updated dependency information.
     */
    async installDependencies(nsContext, {url}) {
        const File = nsContext.getters.File(url);
        const setBusyFlag = !File.busyFlag();
        if(setBusyFlag)
            nsContext.commit('setBusyFlag', {flag: url, value: true});
        const Repo = nsContext.getters.Repository();
        const remoteRepoURL = `https://api.github.com/repos/${File.yaml.originalRepository}`;
        const newYAML = {...File.yaml};
        let newBody = File.body;

        console.log({dependencies: File.yaml.dependencies, missingDependencies: File.yaml.missingDependencies})

        await Promise.allSettled(File.yaml.missingDependencies.map(async (f) => {
            const fullURL = `${remoteRepoURL}/contents${f}`;
            const newURL = `${Repo.url}/contents/installed/${File.yaml.originalRepository}${f}`;
            await fetch('/.netlify/functions/githubAPI', {
                method: "POST", headers: {task: 'copyFile'},
                body: JSON.stringify({
                    url: fullURL, newURL, returnExisting: true,
                    token: nsContext.rootGetters['github/token'],
                })
            })
                .then(r => {
                    if(r.status !== 200)
                        throw new Error(`installFile(${f}) received ${r.statusText} (${r.status})`);
                    newYAML.missingDependencies = newYAML.missingDependencies
                        .filter(x => x !== f);
                    newYAML.dependencies = [...newYAML.dependencies, f];
                })
                .catch(() => {});

            // Replace ../fig/path/img.png to root link: /fig/path/img.png
            newBody = newBody.replaceAll(`..${f}`, f);
            // Replace installedFile wrapper so that we don't wrap wrappers
            newBody = newBody.replaceAll(`{% include installedFile.lqd path='${f}' %}`, f);
            // And replace root links with complex links
            newBody = newBody.replaceAll(f, `{% include installedFile.lqd path='${f}' %}`);
        }));

        // Save YAML changes to store
        await nsContext.dispatch('setFileContentFromYAML', {...File, yaml: newYAML, body: newBody});
        if(setBusyFlag)
            nsContext.commit('setBusyFlag', {flag: url, value: false});
        return nsContext.getters.File(url);
    },
    /**
     * Delete a file from the main repository.
     * @memberOf workshop
     * @action deleteFile=files
     * @param {StoreContext} nsContext
     * @param payload {Object}
     * @param payload.url {string} URL of the file to delete.
     * @param [payload.deleteDependencies=true] {boolean} Whether or not to delete the file's dependencies. Deleting dependencies will preserve any dependencies that are also dependencies of other files.
     * @return {Promise<{deleted: Array<{fileName: string, deleted: boolean, skipped: boolean}>, failed: Array<{fileName: string, deleted: boolean, skipped: boolean}>, skipped: Array<{fileName: string, deleted: boolean, skipped: boolean}>}>} The results of the delete operation: which files were successfully deleted, which were skipped, and which failed.
     */
    async deleteFile(nsContext, {url, deleteDependencies = true}) {
        const main = nsContext.getters.Repository();
        if(!main || !fileInRepository(url, main.url))
            throw new Error('Only files in the main repository can be removed');
        nsContext.commit('setBusyFlag', {flag: url, value: true});
        const file = nsContext.getters.File(url);
        let dependencies = [];
        if(deleteDependencies && file.yaml.dependencies && file.yaml.dependencies.length) {
            // Check and remove dependencies which will be orphaned
            await Promise.allSettled(file.yaml.dependencies.map(f => {
                // Don't delete if other episodes depend on this file
                if(nsContext.getters.FilesByFilter(F => {
                    return F.url !== url
                        && fileInRepository(F.url, main.url)
                        && F.yaml.originalRepository === file.yaml.originalRepository
                        && F.yaml.dependencies.includes(f);
                }).length) {
                    dependencies.push({fileName: f, skipped: true});
                    return;
                }
                fetch('/.netlify/functions/githubAPI', {
                    method: "POST", headers: {task: 'deleteFile'},
                    body: JSON.stringify({
                        url: `${main.url}/contents/installed/${file.yaml.originalRepository}${f}`,
                        token: nsContext.rootGetters['github/token']
                    })
                })
                    .then(r => {
                        if(r.status !== 200)
                            throw new Error(`deleteFile(${f}) received ${r.statusText} (${r.status})`);
                        dependencies.push({fileName: f, deleted: true});
                    })
                    .catch(() => {dependencies.push({fileName: f})})
            }));
        }

        const remove = await fetch('/.netlify/functions/githubAPI', {
            method: "POST", headers: {task: 'deleteFile'},
            body: JSON.stringify({
                url, token: nsContext.rootGetters['github/token']
            })
        })
            .then(r => {
                if(r.status !== 200)
                    throw new Error(`deleteFile received ${r.statusText} (${r.status})`);
                nsContext.commit('removeItem', {array: 'files', item: file});
                return null;
            })
            .catch(async e => {
                nsContext.commit('addError', e);
                console.error(e);
                // Mark deleted dependencies as missing
                const newYAML = file.yaml;
                if(dependencies.length) {
                    newYAML.dependencies = dependencies.filter(x => !x.deleted);
                    newYAML.missingDependencies = dependencies.filter(x => x.deleted);
                }
                await nsContext.dispatch('setFileContentFromYAML', {...file, yaml: newYAML});
                nsContext.commit('setBusyFlag', {flag: url, value: false});
                return nsContext.getters.File(url);
            });


        dependencies = dependencies.map(d => {
            return {
                fileName: `${file.yaml.originalRepository}/${d.fileName}`,
                skipped: d.skipped,
                deleted: d.deleted
            }
        });
        const out = {
            deleted: [...dependencies.filter(x => x.deleted)],
            skipped: [...dependencies.filter(x => x.skipped)],
            failed: [...dependencies.filter(x => !x.deleted && !x.skipped)]
        };
        if(remove === null)
            out.deleted.push({fileName: url, deleted: true});
        else
            out.failed.push({fileName: url});

        nsContext.commit('setBusyFlag', {flag: url, value: false});
        return out;
    },
    /**
     * Reassign episode order numbers to keep the same order but add distance for inserting other episodes between them.
     * @memberOf workshop
     * @action rewriteEpisodeOrders=files
     * @param {StoreContext} nsContext
     * @param payload {Object}
     * @param payload.dayId {number} Day whose episodes should have their order numbers adjusted.
     * @param payload.ignore_episodes {string[]} URLs of episodes to ignore.
     * @return {Promise<void>}
     */
    async rewriteEpisodeOrders(nsContext, {dayId, ignore_episodes}) {
        const episodes = nsContext.getters.Repository().episodes
            .filter(e => e.yaml.day === dayId);
        episodes.sort((a, b) => a.yaml.order < b.yaml.order? -1 : a.yaml.order === b.yaml.order? 0 : 1);
        let o = 0;
        await Promise.all(
            episodes.map(e => {
                if(ignore_episodes.includes(e.url))
                    return;
                o += 100000;
                console.log(`(${e.yaml.day}) ${e.path} => ${o}`)
                const newYAML = {...e.yaml};
                newYAML.order = o;
                return nsContext.dispatch('setFileContentFromYAML', {
                    ...e, yaml: {...newYAML}
                });
            })
        );
    }
};

/**
 * Parse a YAML-headed file into YAML key-value and body.
 * @memberOf workshop
 * @requires yaml
 * @param content {string} File content to be parsed.
 * @return {{yamlParseError: null|string, body: string|null, yaml: null|{}}}
 */
function parseYAML(content) {
    // Process file content
    let yaml = null;
    let yamlParseError = null;
    let body = null;
    try{
        const parsed = YAML.parseAllDocuments(content);
        const yamlText = content.substring(...parsed[0].range);
        body = parsed.length > 1?
            content.substring(parsed[1].range[0]) : null;
        yaml = YAML.parse(yamlText);
    } catch(e) {
        body = content;
        yaml = {};
        yamlParseError = e.message;
    }
    return {yaml, body, yamlParseError};
}

/**
 * Return whether a given file is in a given repository.
 * @memberOf workshop
 *
 * @description All repository files' URLs begin with the URL of their repository, meaning repository URL is always a substring of file URL. This property is used to check membership.
 *
 * @param fileURL {string} The URL of the file.
 * @param repositoryURL {string} The URL of the repository.
 * @return {boolean} Whether the file is in the repository.
 */
function fileInRepository(fileURL, repositoryURL){
    return fileURL.indexOf(repositoryURL) !== -1;
}

/**
 * Scrape a markdown file to identify image files that are embedded in it. Handles both direct inclusion and the Workshop Builder's own <code>{% include installedFile.lqd path="..." }</code> approach.
 * @memberOf workshop
 * @param File {File} Markdown file to scrape.
 * @return {Array<String>} List of paths to required files.
 */
function findFileDependencies(File) {
    // Check for Markdown image links
    const references = [];
    // https://stackoverflow.com/a/58345920
    const parseImageLinks = /\[?(!)(?<alt>\[[^\][]*\[?[^\][]*\]?[^\][]*)\]\((?<url>[^\s]+?)(?:\s+(["'])(?<title>.*?)\4)?\)/gm;
    let match;

    while((match = parseImageLinks.exec(File.content)) !== null) {
        if(match.groups && !/https?:\/\//.test(match.groups.url))
            if(!references.includes(match.groups.url))
                references.push(match.groups.url)
    }

    // Update links using original repository link style to use root reference link style
    return references.map(r => r.replace(
        /^\{% include installedFile\.lqd path='\{\{ (.)+ }}' %}/,
        `/installed/${File.yaml.originalRepository}/\\1`
    ));
}

/**
 * Fetch the intro file for a repository.
 * @memberOf workshop
 * @description Each repository has template introduction files for each of the possible topics. The introduction actually used by the repository is determined by the repository's topic. This function filters the repository's files to retrieve the introduction actually used by the repository.
 * @param files {File[]} Repository's files.
 * @param topic {string} The topic of the repository.
 * @return {null|File} Repository's intro file
 */
function getRepoIntroFile(files, topic) {
    const topics = [topic, 'unknown-topic'];
    const intros = topics.map(t => {
        const file = files.filter(F => F.path === `_includes/intro/topic-intros/${t}.md`);
        return file? file[0] : null
    })
        .filter(x => x !== null);
    return intros.length? intros[0] : null
}

// Export module
/**
 * @class workshop
 * @description The Workshop store module is responsible for managing GitHub repositories. At any one time there will be zero or more repositories loaded in the module state. Up to one of these will be designated as the main repository. The main repository is the repository that is being edited in the Workshop Builder Tool. Other repositories are loaded so that their files can be copied into the main repository.
 * This module also handles files, which are the markdown files in the relevant GitHub repository and the _config.yml configuration file for the repository.
 *
 * This module is the primary GitHub interface: most calls to the GitHub API come from this module (via the lambda functions in githubAPI.js).
 *
 * @requires yaml
 * @requires query-string
 * @requires js-base64
 */
export default {
    namespaced: true,
    state,
    mutations,
    getters,
    actions
};
