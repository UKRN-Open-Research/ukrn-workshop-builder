exports.handler = main;
import fetch from 'node-fetch'
require('dotenv').config();
const {VUE_APP_GITHUB_ID, GITHUB_APP_SECRET, GITHUB_TOKEN_ENCRYPTION_KEY} = process.env;
const Cryptr = require('cryptr');
const cryptr = new Cryptr(GITHUB_TOKEN_ENCRYPTION_KEY);

/**
 * Process requests from a client
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 */
async function main(event, context, callback) {
    console.log(`New request: task=${event.headers.task}`)
    switch (event.headers.task) {
        case "redeemCode":
            return redeemCode(event, context, callback);
        case "getUserDetails":
            return getUserDetails(event, context, callback);
        case "findRepositories":
            return findRepositories(event, context, callback);
        case "findRepositoryFiles":
            return findRepositoryFiles(event, context, callback);
        case "createRepository":
            return createRepository(event, context, callback);
        case "pushFile":
            return pushFile(event, context, callback);
        case "pullItem":
            return pullItem(event, context, callback);
        case "setTopics":
            return setTopics(event, context, callback);
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
 * @param code {number|number[]} status code to check for
 * @return {Promise<object>}
 */
async function checkResponseCode(response, code) {
    console.log(`${response.url.replace("https://api.github.com/", "")}: ${response.status} - ${response.statusText}`);

    if(typeof code === 'number')
        code = [code];

    const json = await response.json();
    if(!code.includes(response.status))
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
    console.log(`Exchanging code ${event.headers['github-code']} for token`)
    const url = `https://github.com/login/oauth/access_token?client_id=${VUE_APP_GITHUB_ID}&client_secret=${GITHUB_APP_SECRET}&code=${event.headers["github-code"]}`;
    console.log(`fetch(${url})`)
    fetch(
        url,
        {headers: {"accept": "application/vnd.github.v3+json"}}
    )
        .then(r => {console.log(r); return r})
        .then(r => checkResponseCode(r, 200))
        .then(json => {
            console.log({json})
            const access_token = json.access_token;
            console.log({access_token})
            const encrypted_token = cryptr.encrypt(access_token);
            console.log({encrypted_token})
            const reply = {
                statusCode: 200, statusText: "OK",
                body: JSON.stringify({access_token: encrypted_token})
            };
            console.log(reply)
            callback(null, reply)
        })
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

/**
 * Get the GitHub user details
 * @param event {object} request details
 * @param context {object} environment details
 * @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
 */
function getUserDetails(event, context, callback) {
    const d = JSON.parse(event.body);

    fetch('https://api.github.com/user', {headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }})
        .then(r => checkResponseCode(r, 200))
        .then(json => callback(null, {statusCode: 200, statusText: "OK",
            body: JSON.stringify(json)}))
        .catch(e => callback(e))
}

/**
 * Look up the repositories
 * @param event
 * @param context
 * @param callback
 * @return {Promise<{r: Response, json: any}>}
 */
async function findRepositories(event, context, callback) {
    const d = JSON.parse(event.body);
    let topics = "";
    let user = "";
    if(d.topics)
        topics = '+' + d.topics.map(t => `topic:${t}`).join('+');
    if(d.user)
        user = `+user:${user}`;
    const url = `https://api.github.com/search/repositories?q=fork:true+topic:ukrn-open-research${user}${topics}`;
    console.log(`findRepositories(${url})`)
    return fetch(url, {
        method: "GET", headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
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
                "authorization": `token ${cryptr.decrypt(d.token)}`
            }
        })
            // Protect against 404 errors because some repos don't have some directories
            .then(r => r.status === 404? [{}] : checkResponseCode(r, 200))
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
                        "authorization": `token ${cryptr.decrypt(d.token)}`
                    }
                })
                    .then(r => checkResponseCode(r, 200))
            )))
        .then(r => callback(null, {
            statusCode: 200, statusText: "OK", body: JSON.stringify(r)
        }))
        .catch(e => {console.error(e); callback(e)})
}

/**
* Create a repository on GitHub for the currently authorised user
* @param event {object} request details
* @param context {object} environment details
* @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
*/
function createRepository(event, context, callback) {
    const d = JSON.parse(event.body);
    let output = null;
    fetch(`https://api.github.com/repos/${d.template}/generate`, {
        method: "POST",
        headers: {
            "accept": "application/vnd.github.baptiste-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        },
        body: JSON.stringify({
            name: d.name,
            private: false
        })
    })
        .then(r => checkResponseCode(r, 201))
        .then(json => output = json)
        .then(() => fetch(`${output.url}/topics`, {
            method: "PUT",
            headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            },
            body: JSON.stringify({
                names: ['ukrn-open-research', 'ukrn-workshop']
            })
        }))
        .then(r => checkResponseCode(r, 200))
        .then(() => callback(null, {
            statusCode: 200, statusText: "OK", body: JSON.stringify(output)
        }))
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

/**
* Replace a file with a new version via github commit
* @param event {object} request details
* @param context {object} environment details
* @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
*/
function pushFile(event, context, callback) {
    const d = JSON.parse(event.body);
    fetch(d.url, {
        method: "PUT",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        },
        body: JSON.stringify({
            content: d.content,
            message: `${d.path} update by UKRN Workshop Builder`,
            sha: d.sha
        })
    })
        .then(r => checkResponseCode(r, [200, 201]))
        .then(json => fetch(json.content.url, {
            method: "GET", headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            }
        }))
        .then(r => checkResponseCode(r, 200))
        .then(json => callback(null, {
            statusCode: 200,
            statusText: "OK",
            body: JSON.stringify(json)
        }))
        .catch(e => {
            console.error(e);
            callback(e);
        });
}

/**
 * Pull an item from GitHub by its URL
 * @param event
 * @param context
 * @param callback
 */
function pullItem(event, context, callback) {
    const d = JSON.parse(event.body);
    fetch(d.url, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200))
        .then(json => callback(null, {
            statusCode: 200, statusText: "OK", body: JSON.stringify(json)
        }))
        .catch(e => {console.error(e); callback(e)})
}

/**
* Set the topics on a newly created workshop so we can check custom repository submissions' eligibility easily
* @param event {object} request details
* @param context {object} environment details
* @param callback {function(error: string|null, response: HTTPResponse) => void} function to send the response to the client
*/
function setTopics(event, context, callback) {
    const d = JSON.parse(event.body);
    // Find current topics
    getTopics(event)
        .then(topics => {
            const setTopics = d.topics;
            // To protect against removal of customised topics we use this approach
            topics.forEach(t => {
                if(!Object.keys(setTopics).includes(t))
                    setTopics[t] = true;
            });
            return Object.keys(setTopics).filter(k => setTopics[k]);
        })
        // Set topics
        .then(topics => fetch(`${d.url}/topics`, {
            method: "PUT",
            headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            },
            body: JSON.stringify({names: topics})
        }))
        .then(r => checkResponseCode(r, 200))
        // Fetch final topic list for sanity
        .then(() => getTopics(event))
        .then(topics => callback(null, {
            statusCode: 200, statusText: "OK", body: JSON.stringify(topics)
        }))
        .catch(e => {
            console.error(e);
            callback(e);
        })
}

/**
 * Get the topics associated with a repository
 * @param event {{body: string, ...:*}}
 * @return {Promise<Object>}
 */
function getTopics(event) {
    const d = JSON.parse(event.body);
    return fetch(`${d.url}/topics`, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200))
        .then(json => json.names)
}

