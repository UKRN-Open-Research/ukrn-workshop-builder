const Base64 = require('js-base64');
const YAML = require('yaml');
const queryString = require('query-string');
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
            // Strip the branch identifier if it exists
            item.url = queryString.parseUrl(item.url).url;
            const existing = store[array].filter(i => i.url === item.url);
            if(existing.length)
                store[array] = store[array].map(
                    i => i.url === item.url? item : i
                );
            else
                store[array].push(item);
        },
        removeItem(store, {array, item}) {
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
            return {
                ...file,
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
            const files = getters.FilesByFilter(f => fileInRepository(f.url, url));
            // Check for a config file
            const configFiles = files.filter(f => f.path === '_config.yml');
            const episodes = files
                .filter(f => /^_episodes/.test(f.path))
                .filter(i => !i.yaml['ukrn_wb_rules'] || !i.yaml['ukrn_wb_rules'].includes('hidden'));
            const episode_template = files.filter(i => i.yaml['ukrn_wb_rules'] && i.yaml['ukrn_wb_rules'].includes('template'));
            return {...repository, files, episodes,
                episode_template: episode_template.length? episode_template[0] : null,
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
            const errors = {};
            if(!config.yaml)
                return {yaml: "The config must have YAML content signified by ---"};
            if(!config.yaml.title)
                errors.title = "The title cannot be blank";
            if(!config.yaml.topic)
                errors.topic = "The topic cannot be empty.";
            return errors;
        },
        isConfigValid: (state, getters) => config => {
            return !Object.keys(getters.listConfigErrors(config)).length;
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
            nsContext.commit('setBusyFlag', {flag: url, value: false});
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
         * Set a file's content
         * @param nsContext
         * @param url {string} URL of the file
         * @param content {string} content to set
         * @param encode {boolean} whether to have the back end encode the file in Base64
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
         * Set a file's content by specifying YAML + body
         * @param nsContext
         * @param url {string} URL of the file
         * @param yaml {*[]} YAML key-value pairs of content to set
         * @param [body=null] {string|null} body content
         */
        setFileContentFromYAML(nsContext, {url, yaml, body = null}) {
            let content = `---\n${YAML.stringify(yaml)}\n---\n${body}`;
            return nsContext.dispatch('setFileContent', {url, content});
        },
        /**
         * Duplicate a file
         * @param nsContext
         * @param url {string} URL of the file to copy
         * @return {File}
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
         * Pull a URL from GitHub and return the result directly
         * @param nsContext
         * @param url {string} URL to pull
         * @return {null|Promise<object>}
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
         * Set the Open Research topics of a repository
         * @param nsContext
         * @param topics {string[]}
         * @return {null|Promise<any>}
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
         * Save all changed files in the main Repository
         * @param nsContext
         * @return {Promise<{failures: number, successes: number}>}
         */
        saveRepositoryChanges(nsContext) {
            return Promise.allSettled(nsContext.getters.Repository().files
                .filter(F => F.hasChanged())
                .map(F => {
                    console.log(`Updating ${F.path}`)
                    nsContext.dispatch('pushFile', F)
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
         * Load a repository from GitHub
         * @param nsContext
         * @param url
         * @return {Promise<Repository>}
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
         * Install a copy of a remote file
         * @param nsContext
         * @param url {string}
         * @return {null|Promise<File|null>}
         */
        async installFile(nsContext, {url}) {
            // Check file is okay to install
            const Repo = nsContext.getters.Repository();
            const File = nsContext.getters.File(url);
            const newURL = `${Repo.url}/contents/${File.path}`;
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
                path: File.path
            });

            let newFile = nsContext.getters.File(newURL);

            nsContext.commit('setBusyFlag', {flag: newURL, value: true});

            // Register dependencies
            newFile.yaml.missingDependencies = findFileDependencies(File).map(ref => ref.replace(/^\.\.\//, '/'));
            newFile.yaml.dependencies = [];
            newFile.yaml.originalRepository = name_repo[1];
            await nsContext.dispatch('setFileContentFromYAML', {...newFile});

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
         * @param nsContext
         * @param url {string}
         * @return {Promise<function(*=): {busyFlag: *, content: string, yaml: {"...": *}, body: (string|null)}>}
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

                const re = new RegExp(`.?.?${f}`);
                newBody = newBody.replaceAll(re, `{% include installedFile.lqd path='${f}' %}`);
            }));

            // Save YAML changes to store
            await nsContext.dispatch('setFileContentFromYAML', {...File, yaml: newYAML, body: newBody});
            if(setBusyFlag)
                nsContext.commit('setBusyFlag', {flag: url, value: false});
            return nsContext.getters.File(url);
        },
        /**
         *
         * @param nsContext
         * @param url {string}
         * @param deleteDependencies {boolean} whether to remove orphan dependencies
         * @return {Promise<{deleted: {fileName: string, deleted: boolean, skipped: (boolean|*[])}[], failed: *[], skipped: {fileName: string, deleted, skipped: boolean}[]}>}
         */
        async deleteFile(nsContext, {url, deleteDependencies = true}) {
            const main = nsContext.getters.Repository();
            if(!main || !fileInRepository(url, main.url))
                throw new Error('Only files in the main repository can be removed');
            nsContext.commit('setBusyFlag', {flag: url, value: true});
            const file = nsContext.getters.File(url);
            let dependencies = [];
            if(deleteDependencies) {
                // Check and remove dependencies which will be orphaned
                dependencies = await Promise.allSettled(file.yaml.dependencies.map(f => {
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
                    if(dependencies.length) {
                        file.yaml.dependencies = dependencies.filter(x => !x.deleted);
                        file.yaml.missingDependencies = dependencies.filter(x => x.deleted);
                    }
                    await nsContext.dispatch('setFileContentFromYAML', {...file});
                    nsContext.commit('setBusyFlag', {flag: url, value: false});
                    return nsContext.getters.File(url);
                });

            dependencies = dependencies.map(d => {
                return {
                    fileName: `${file.yaml.originalRepository}${d.fileName}`,
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
            return out;
        }
    }
};

/**
 * Parse a YAML-headed file into YAML key-value and body
 * @param content {string}
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
            content.substring(...parsed[1].range) : null;
        yaml = YAML.parse(yamlText);
    } catch(e) {
        body = content;
        yaml = {};
        yamlParseError = e;
    }
    return {yaml, body, yamlParseError};
}

function fileInRepository(fileURL, repositoryURL){
    return fileURL.indexOf(repositoryURL) !== -1;
}

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