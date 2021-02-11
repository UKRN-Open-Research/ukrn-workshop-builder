exports.handler = main;
import fetch from 'node-fetch'
require('dotenv').config();
const {VUE_APP_GITHUB_ID, GITHUB_APP_SECRET} = process.env;

/**
 * Process requests from a client
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 */
async function main(event, context, callback) {
    switch (event.headers.task) {
        case "redeemCode":
            return redeemCode(event, context, callback);
        case "findRepositories":
            return findRepositories(event, context, callback);
        case "findRepositoryFiles":
            return findRepositoryFiles(event, context, callback);
        /*case "createRepository":
            return createRepository(event, context, callback);
        case "fetchConfig":
            return fetchConfig(event, context, callback);
        case "updateConfig":
            return updateConfig(event, context, callback);
        case "fetchEpisodes":
            return fetchEpisodes(event, context, callback);
        case "updateFile":
            return updateFile(event, context, callback);*/
        default:
            if(event.headers.task)
                callback(`Unrecognised githubAPI task requested: ${event.headers.task}`);
            else
                callback("No githubAPI task specified");
    }
}

/**
 *
 * @param response {object} GitHub API response
 * @param code {number} status code to check for
 * @return {Promise<object>}
 */
async function checkResponseCode(response, code) {
    const json = await response.json();
    if(response.status !== code)
        throw new Error(`${response.statusText} (${response.status}): ${json.message}`);
    return json;
}

/**
 * Send a code to GitHub and request a token in exchange
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 */
function redeemCode(event, context, callback) {
    let access_token = "";
    fetch(
        `https://github.com/login/oauth/access_token?client_id=${VUE_APP_GITHUB_ID}&client_secret=${GITHUB_APP_SECRET}&code=${event.headers["github-code"]}`,
        {headers: {"accept": "application/vnd.github.v3+json"}}
    )
        .then(async r => {return {r: r, j: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 200)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.j.errors.join('\n')}`);
            if(resp.j.error)
                throw new Error(`${resp.j.error}: ${resp.j.error_description}`);
            access_token = resp.j.access_token;
            return access_token;
        })
        // Get user details
        .then(t => fetch('https://api.github.com/user', {headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${t}`
        }}))
        .then(r => r.json())
        .then(j => {
            callback(null, {statusCode: 200, statusText: "OK", body: JSON.stringify({...j, token: access_token})})
        })
        .catch(e => callback(e))
}

/**
 * Look up the repositories
 * @param event
 * @param context
 * @param callback
 * @return {Promise<{r: Response, json: any}>}
 */
function findRepositories(event, context, callback) {
    const d = JSON.parse(event.body);
    let topics = "";
    let user = "";
    if(d.topics)
        topics = '+' + d.topics.map(t => `topic:${t}`).join('+');
    if(d.user)
        user = `+user:${user}`;
    const url = `https://api.github.com/search/repositories?q=fork:true${user}${topics}`;
    console.log(`findRepositories(${url})`)
    return fetch(url, {
        method: "GET", headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${d.token}`
        }
    })
        .then(r => checkResponseCode(r, 200))
        .then(json => callback(null, {
            statusCode: 200, statusText: "OK",
            body: JSON.stringify(json.items)
        }))
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

async function findRepositoryFiles(event, context, callback) {
    const d = JSON.parse(event.body);
    const output = [];
    const files = [
        d.includeConfig? `${d.url}/contents/_config.yml` : null
    ];
    const dirs = [
      d.includeEpisodes? "_episodes" : null,
      d.includeEpisodes? "_episodes_rmd" : null
    ]
        .filter(p => p !== null);

    // Fill in the file paths from the directory crawl
    Promise.all(dirs.map(dir => fetch(`${d.url}/contents/${dir}`, {
            method: "GET", headers: {
                "accept": "application/vnd.github.v3+json",
                "authorization": `token ${d.token}`
            }
        })
            .then(r => checkResponseCode(r, 200))
            .then(json => json.map(i => {
                if(i.type === "file" && !/^[._]/.test(i.name))
                    return i.url;
                return null;
            }))
    ))
        .then(r => {
            const fList = files;
            r.forEach(L => fList.push(...L));
            return fList.filter(f => f !== null);
        })
        .then(fList => Promise.all(fList.map(f => fetch(f, {
                    method: "GET",
                    headers: {
                        "accept": "application/vnd.github.v3+json",
                        "authorization": `token ${d.token}`
                    }
                })
                    .then(r => checkResponseCode(r, 200))
            )))
        .then(r => callback(null, {
            statusCode: 200, statusText: "OK", body: JSON.stringify(r)
        }))
        .catch(e => {console.error(e); callback(e)})
}



/*


/!**
 * Create a repository on GitHub for the currently authorised user
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 *!/
function createRepository(event, context, callback) {
    const d = JSON.parse(event.body);
    fetch(`https://api.github.com/repos/${d.templateRepository}/generate`, {
        method: "POST",
        headers: {
            "accept": "application/vnd.github.baptiste-preview+json",
            "authorization": `token ${d.token}`
        },
        body: JSON.stringify({
            name: d.repoName,
            private: false
        })
    })
        .then(async r => {return {r, json: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 201)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.errors.join('\n')}`);
            // Handle success
            setTopics(resp.json, event, context, callback);
        })
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

/!**
 * Set the topics on a newly created workshop so we can check custom repository submissions' eligibility easily
 * @param create_response {object} response from creating the repository
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 *!/
function setTopics(create_response, event, context, callback) {
    const d = JSON.parse(event.body);
    fetch(`https://api.github.com/repos/${create_response.full_name}/topics`, {
        method: "PUT",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${d.token}`
        },
        body: JSON.stringify({
            names: [
                'ukrn-open-research',
                'ukrn-workshop',
                d.topic
            ]
        })
    })
        .then(async r => {return {r, json: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 200)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.errors.join('\n')}`);
            // Handle success
            callback(null, {
                statusCode: 200,
                statusText: "OK",
                body: JSON.stringify({name: create_response.json.name})
            });
        })
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

/!**
 * Fetch the configuration file _config.yml from a repository
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 *!/
function fetchConfig(event, context, callback) {
    const d = JSON.parse(event.body);
    fetch(`https://api.github.com/repos/${d.user}/${d.repository}/contents/_config.yml`, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${d.token}`
        }
    })
        .then(async r => {return {r, json: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 200)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.errors.join('\n')}`);
            // Handle success
            callback(null, {
                statusCode: 200,
                statusText: "OK",
                body: JSON.stringify({base64: resp.json.content, sha: resp.json.sha})
            });
        })
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

/!**
 * Fetch the SHA1 hash for a file
 * @param event {object} request details
 *!/
function getSHA(file, event) {
    const d = JSON.parse(event.body);
    if(d.sha)
        return d.sha;
    return fetch(`https://api.github.com/repos/${d.user}/${d.repository}/contents/${file}`)
        .then(async r => {return {r, json: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 200)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.errors.join('\n')}`);
            return resp.json.sha;
        })
}

/!**
 * Push _config.yml changes to GitHub remote
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 *!/
function updateConfig(event, context, callback) {
    const d = JSON.parse(event.body);
    // get the file we're replacing's SHA
    getSHA("_config.yml", event, context, callback)
        .then(sha => fetch(`https://api.github.com/repos/${d.user}/${d.repository}/contents/_config.yml`, {
                method: "PUT",
                headers: {
                    "accept": "application/vnd.github.mercy-preview+json",
                    "authorization": `token ${d.token}`
                },
                body: JSON.stringify({
                    content: d.config,
                    message: "Config update by UKRN Workshop Builder",
                    sha
                })
            }))
        .then(async r => {return {r, json: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 200)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.errors.join('\n')}`);
            // Handle success
            callback(null, {
                statusCode: 200,
                statusText: "OK",
                body: JSON.stringify({sha: resp.json.content.sha})
            });
        })
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

/!**
 * Fetch all episodes in the repository
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 *!/
function fetchEpisodes(event, context, callback) {
    const episodes = [];
    const d = JSON.parse(event.body);

    _fetchEpisodesOfType(d, "episodes")
        .then(eps => episodes.push(...eps.filter(e => e !== null)))
        .then(() => _fetchEpisodesOfType(d, "episodes_rmd"))
        .then(eps => episodes.push(...eps.filter(e => e !== null)))
        .then(() => callback(null, {
            statusCode: 200,
            statusText: "OK",
            body: JSON.stringify({episodes})
        }))
        .catch(e => {
            console.error(e);
            callback(e);
        });
}

/!**
 * Fetch all episodes of a given type
 * @param d {object} github request details
 * @param type {"episodes"|"episodes_rmd"} github search path
 *!/
async function _fetchEpisodesOfType(d, type) {
    const episodeList = await fetch(`https://api.github.com/repos/${d.user}/${d.repository}/contents/_${type}`, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${d.token}`
        }
    })
        .then(async r => {return {r, json: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 200)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.errors.join('\n')}`);
            return resp.json;
        });

    return await Promise.all(episodeList.map(ep => {
        if(ep.type !== "file" || /^[._]/.test(ep.name))
            return null;
        return fetch(ep.url, {
            method: "GET",
            headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${d.token}`
            }
        })
            .then(async r => {return {r, json: await r.json()}})
            .then(resp => {
                if(resp.r.status !== 200)
                    throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.errors.join('\n')}`);
                return resp.json;
            })
    }));
}


/!**
 * Replace a file with a new version via github commit
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 *!/
function updateFile(event, context, callback) {
    const d = JSON.parse(event.body);
    fetch(d.file.url, {
        method: "PUT",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${d.token}`
        },
        body: JSON.stringify({
            content: d.file.content,
            message: `${d.file.name} update by UKRN Workshop Builder`,
            sha: d.file.sha
        })
    })
        .then(async r => {return {r, json: await r.json()}})
        .then(resp => {
            if(resp.r.status !== 200) {
                console.error(resp)
                throw new Error(`${resp.r.statusText} (${resp.r.status}): ${resp.json.message}`);
            }
            // Handle success
            callback(null, {
                statusCode: 200,
                statusText: "OK",
                body: JSON.stringify(resp.json)
            });
        })
        .catch(e => {
            console.error(e);
            callback(e);
        });
}*/
