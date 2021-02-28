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
    try {
        console.log(`New request: task=${event.headers.task}`)
        switch (event.headers.task) {
            case "redeemCode":
                return callback(null, await redeemCode(event));
            case "getUserDetails":
                return callback(null, await getUserDetails(event));
            case "findRepositories":
                return callback(null, await findRepositories(event));
            case "findRepositoryFiles":
                return callback(null, await findRepositoryFiles(event));
            case "createRepository":
                return callback(null, await createRepository(event));
            case "pushFile":
                return callback(null, await pushFile(event));
            case "pullItem":
                return callback(null, await pullItem(event));
            case "setTopics":
                return callback(null, await setTopics(event));
            case "copyFile":
                return callback(null, await copyFile(event));
            case "deleteFile":
                return callback(null, await deleteFile(event));
            case "getLastBuild":
                return callback(null, await getLastBuild(event));
            default:
                if(event.headers.task)
                    throw new Error(`Unrecognised githubAPI task requested: ${event.headers.task}`);
                else
                    throw new Error("No githubAPI task specified");
        }
    } catch(e) {
        console.error(e);
        callback(e);
    }
}

/**
 * Send an OK response
 * @param obj {object} Body content to be JSON.stringified()
 * @return {{statusText: string, body: string, statusCode: number}}
 */
function OK(obj) {
    return {
        statusCode: 200, statusText: "OK",
        body: JSON.stringify(obj)
    };
}


/**
 *
 * @param response {object} GitHub API response
 * @param code {number|number[]} status code to check for
 * @return {Promise<object>}
 */
async function checkResponseCode(response, code) {
    console.log(`${response.status} - ${response.statusText}: FETCH ${response.url.replace("https://api.github.com", "")}`);

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
 * @return {statusText: string, body: string, statusCode: number}
 */
async function redeemCode(event) {
    console.log(`Exchanging code ${event.headers['github-code']} for token`)
    const url = `https://github.com/login/oauth/access_token?client_id=${VUE_APP_GITHUB_ID}&client_secret=${GITHUB_APP_SECRET}&code=${event.headers["github-code"]}`;
    const access_token = await fetch(
        url,
        {headers: {"accept": "application/vnd.github.v3+json"}}
    )
        .then(r => checkResponseCode(r, 200))
        .then(json => json.access_token)
        .catch(e => {
            console.error(e)
            throw new Error(e)
        });

    return OK({access_token: cryptr.encrypt(access_token)});
}

/**
 * Get the GitHub user details
 * @param event {object} request details
 * @return {statusText: string, body: string, statusCode: number}
 */
async function getUserDetails(event) {
    const d = JSON.parse(event.body);

    const details = await fetch('https://api.github.com/user', {headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }})
        .then(r => checkResponseCode(r, 200));
    return OK(details);
}

/**
 * Look up the repositories
 * @param event
 * @return {statusText: string, body: string, statusCode: number}
 */
async function findRepositories(event) {
    const d = JSON.parse(event.body);
    let topics = "";
    let user = "";
    if(d.topics)
        topics = '+' + d.topics.map(t => `topic:${t}`).join('+');
    if(d.user)
        user = `+user:${user}`;
    const url = `https://api.github.com/search/repositories?q=fork:true+topic:ukrn-open-research${user}${topics}`;
    console.log(`findRepositories(${url})`)
    const items = await fetch(url, {
        method: "GET", headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200))
        .then(json => json.items);
    return OK(items);
}

/**
 * Find all the files in a given repository
 * @param event
 * @return {statusText: string, body: string, statusCode: number}
 */
async function findRepositoryFiles(event) {
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
    const fileList = await Promise.all(dirs.map(dir => fetch(`${d.url}/contents/${dir}`, {
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
        });
    const response = await Promise.all(fileList.map(f => fetch(f, {
                    method: "GET",
                    headers: {
                        "accept": "application/vnd.github.v3+json",
                        "authorization": `token ${cryptr.decrypt(d.token)}`
                    }
                })
                    .then(r => checkResponseCode(r, 200))
            ));
    return OK(response);
}

/**
* Create a repository on GitHub for the currently authorised user
* @param event {object} request details
* @return {statusText: string, body: string, statusCode: number}
*/
async function createRepository(event) {
    const d = JSON.parse(event.body);
    const newRepo = await fetch(`https://api.github.com/repos/${d.template}/generate`, {
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
        .then(r => checkResponseCode(r, 201));
    await fetch(`${newRepo.url}/topics`, {
            method: "PUT",
            headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            },
            body: JSON.stringify({
                names: ['ukrn-open-research', 'ukrn-workshop']
            })
        })
        .then(r => checkResponseCode(r, 200));
    // Fetch a fresh copy with the updated topics
    return pullItem({body: JSON.stringify({
            url: newRepo.url, token: d.token
    })});
}

/**
* Replace a file with a new version via github commit
* @param event {object} request details
* @return {statusText: string, body: string, statusCode: number}
*/
async function pushFile(event) {
    const d = JSON.parse(event.body);
    const upload = await fetch(d.url, {
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
        .then(r => checkResponseCode(r, [200, 201]));
    // retrieve updated version
    const file = await fetch(upload.content.url, {
            method: "GET", headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            }
        })
        .then(r => checkResponseCode(r, 200));
    return OK(file);
}

/**
 * Pull an item from GitHub by its URL
 * @param event
 * @param context
 * @return {statusText: string, body: string, statusCode: number}
 */
async function pullItem(event) {
    const d = JSON.parse(event.body);
    const item = await fetch(d.url, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200));
    return OK(item);
}

/**
* Set the topics on a newly created workshop so we can check custom repository submissions' eligibility easily
* @param event {object} request details
* @return {statusText: string, body: string, statusCode: number}
*/
async function setTopics(event) {
    const d = JSON.parse(event.body);
    // Find current topics
    const topics = await getTopics(event);
    const setTopics = d.topics;
    // To protect against removal of customised topics we use this approach
    topics.forEach(t => {
        if(!Object.keys(setTopics).includes(t))
            setTopics[t] = true;
    });
    const newTopicList = Object.keys(setTopics).filter(k => setTopics[k]);

    // Send the topic list
    await fetch(`${d.url}/topics`, {
        method: "PUT",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        },
        body: JSON.stringify({names: newTopicList})
    })
        .then(r => checkResponseCode(r, 200));
    // Fetch final topic list for sanity
    return OK(await getTopics(event));
}

/**
 * Get the topics associated with a repository
 * @param event {{body: string, ...:*}}
 * @return {Promise<Object>}
 */
async function getTopics(event) {
    const d = JSON.parse(event.body);
    const topics = await fetch(`${d.url}/topics`, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200));
    return topics.names;
}

/**
 * Copy a file from one repository to another, and return the copy
 * @param event {{body: string, ...:*}}
 * @return {Promise<Object>}
 */
async function copyFile(event) {
    const d = JSON.parse(event.body);
    let file = null;
    // Check if the target url already exists
    if(d.returnExisting) {
        const existing = await fetch(d.newURL, {
            method: "GET",
            headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            }
        })
            .then(r => checkResponseCode(r, 200))
            .then(json => json.content)
            .catch(() => null);
        if(existing)
            return OK(existing);
    }

    return await fetch(d.url, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200))
        .then(json => file = json)
        .then(() => pushFile({body: JSON.stringify({
                ...d, content: file.content, path: file.path, url: d.newURL
            })}));
}

/**
 * Delete a file via github commit
 * @param event {object} request details
 * @return {statusText: string, body: string, statusCode: number}
 */
async function deleteFile(event) {
    const d = JSON.parse(event.body);
    const file = await fetch(d.url, {
        method: "GET",
        headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200));
    console.log({...file, content: '...'})
    return OK(
        await fetch(file.url, {
            method: "DELETE",
            headers: {
                "accept": "application/vnd.github.v3+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            },
            body: JSON.stringify({
                message: `${file.path} deleted by UKRN Workshop Builder`,
                sha: file.sha
            })
        })
            .then(r => checkResponseCode(r, 200))
    );
}

/**
 *
 * @param event {object} Should have body JSON string with repository URL and GitHub access token
 * @return {Promise<{statusText: string, body: string, statusCode: number}>}
 */
async function getLastBuild(event) {
    const d = JSON.parse(event.body);
    const status = await fetch(`${d.url}/pages/builds/latest`, {
        headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }})
        .then(r => checkResponseCode(r, 200))
    return OK(status);
}