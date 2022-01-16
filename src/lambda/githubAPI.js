import fetch from 'node-fetch'
require('dotenv').config();
const {VUE_APP_GITHUB_ID, GH_APP_SECRET, GH_TOKEN_ENCRYPTION_KEY} = process.env;
const Cryptr = require('cryptr');
const cryptr = new Cryptr(GH_TOKEN_ENCRYPTION_KEY);

/**
 * @class GitHubAPI
 * @description The GitHubAPI backend is a lambda function invoked via Netlify's functions system. It receives HTTP requests and conducts GitHub API calls based on the instructions in the request header and data provided in the body.
 */

/**
 * Callback to return the results of the API interaction to the client. Returns a status of 500 if error is set, otherwise returns the status given in response.
 * @callback returnResponse
 * @param error {Error} An error encountered while using the API.
 * @param response {{statusText: string, body: string, statusCode: number}} HTTPResponse-like object returned to the client.
 * @return {void}
 */

/**
 * Process requests from a client.
 * @memberOf GitHubAPI
 * @param event {object} request details.
 * @param context {object} environment details.
 * @param callback {returnResponse} function to send the response to the client.
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
 * Send an OK response.
 * @memberOf GitHubAPI
 * @param obj {object} Body content to be JSON.stringified().
 * @return {{statusText: string, body: string, statusCode: number}}
 */
function OK(obj) {
    return {
        statusCode: 200, statusText: "OK",
        body: JSON.stringify(obj)
    };
}


/**
 * Check a response code matches one of the expected codes.
 * @memberOf GitHubAPI
 * @param response {object} GitHub API response.
 * @param code {number|number[]} status code to check for.
 * @param method {string} request method.
 * @return {Promise<object>}
 */
async function checkResponseCode(response, code, method = 'GET') {
    console.log(`${response.status} - ${response.statusText}: ${method} ${response.url.replace("https://api.github.com", "")}`);

    if(typeof code === 'number')
        code = [code];

    const json = await response.json();
    if(!code.includes(response.status))
        throw new Error(`${response.statusText} (${response.status}): ${json.message}`);
    return json;
}

/**
 * Send a code to GitHub and request a token in exchange.
 * @memberOf GitHubAPI
 * @param event {object} request details.
 * @return {{statusText: string, body: string, statusCode: number}}
 */
async function redeemCode(event) {
    console.log(`Exchanging code ${event.headers['github-code']} for token`)
    const url = `https://github.com/login/oauth/access_token?client_id=${VUE_APP_GITHUB_ID}&client_secret=${GH_APP_SECRET}&code=${event.headers["github-code"]}`;
    const access_token = await fetch(
        url,
        {headers: {"accept": "application/vnd.github.v3+json"}}
    )
        .then(r => checkResponseCode(r, 200, 'GET'))
        .then(json => json.access_token)
        .catch(e => {
            console.error(e)
            throw new Error(e)
        });

    return OK({access_token: cryptr.encrypt(access_token)});
}

/**
 * Get the GitHub user details.
 * @memberOf GitHubAPI
 * @param event {object} request details.
 * @return {{statusText: string, body: string, statusCode: number}}
 */
async function getUserDetails(event) {
    const d = JSON.parse(event.body);

    const details = await fetch('https://api.github.com/user', {headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }})
        .then(r => checkResponseCode(r, 200, 'GET'));
    return OK(details);
}

/**
 * Look up the repositories.
 * @memberOf GitHubAPI
 * @param event
 * @return {{statusText: string, body: string, statusCode: number}}
 */
async function findRepositories(event) {
    const d = JSON.parse(event.body);
    let topics = "";
    let user = "";
    if(d.topics)
        topics = '+' + d.topics.map(t => `topic:${t}`).join('+');
    if(d.owner)
        user = `+user:${d.owner}`;
    const url = `https://api.github.com/search/repositories?q=fork:true+topic:ukrn-open-research${user}${topics}`;
    console.log(`findRepositories(${url})`)
    let items = []
    let page = "&page=1"
    while(page !== "") {
        await fetch(`${url}${page}`, {
            method: "GET", headers: {
                "accept": "application/vnd.github.mercy-preview+json",
                "authorization": `token ${cryptr.decrypt(d.token)}`
            }
        })
            .then(r => {
                // Paginate if required
                const link = r.headers.get('link')
                const match = /(&page=[0-9]+)>; rel="next"/.exec(link)
                page = match? match[1] : ""
                return r
            })
            .then(r => checkResponseCode(r, 200, 'GET'))
            .then(json => items = [...items, ...json.items]);
    }
    return OK(items);
}

/**
 * Find all the files in a given repository.
 * @memberOf GitHubAPI
 * @param event
 * @return {{statusText: string, body: string, statusCode: number}}
 */
async function findRepositoryFiles(event) {
    const d = JSON.parse(event.body);
    const files = d.extraFiles.map(f => `${d.url}/contents/${f}`);
    const dirs = [
        d.includeEpisodes? "_episodes" : null,
        d.includeEpisodes? "_episodes_rmd" : null,
        d.extraFiles.length? "_includes/install_instructions" : null,
        d.extraFiles.length? "_includes/intro/optional" : null
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
            .then(r => r.status === 404? [{}] : checkResponseCode(r, 200, 'GET'))
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
            .then(r => r.status === 404? null : checkResponseCode(r, 200, 'GET'))
    ));
    return OK(response.filter(r => r !== null));
}

/**
 * Create a repository on GitHub for the currently authorised user.
 * @memberOf GitHubAPI
 * @param event {object} request details.
 * @return {{statusText: string, body: string, statusCode: number}}
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
        .then(r => checkResponseCode(r, 201, 'POST'));
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
        .then(r => checkResponseCode(r, 200, 'PUT'));
    // Fetch a fresh copy with the updated topics
    return pullItem({body: JSON.stringify({
            url: newRepo.url, token: d.token
        })});
}

/**
 * Replace a file with a new version via github commit.
 * @memberOf GitHubAPI
 * @param event {object} request details.
 * @return {{statusText: string, body: string, statusCode: number}}
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
        .then(r => checkResponseCode(r, [200, 201], 'PUT'));
    // retrieve updated version
    const file = await fetch(upload.content.url, {
        method: "GET", headers: {
            "accept": "application/vnd.github.mercy-preview+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }
    })
        .then(r => checkResponseCode(r, 200, 'GET'));
    return OK(file);
}

/**
 * Pull an item from GitHub by its URL.
 * @memberOf GitHubAPI
 * @param event
 * @return {{statusText: string, body: string, statusCode: number}}
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
        .then(r => checkResponseCode(r, 200, 'GET'));
    return OK(item);
}

/**
 * Set the topics on a newly created workshop so we can check custom repository submissions' eligibility easily.
 * @memberOf GitHubAPI
 * @param event {object} request details.
 * @return {{statusText: string, body: string, statusCode: number}}
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
        .then(r => checkResponseCode(r, 200, 'PUT'));
    // Fetch final topic list for sanity
    return OK(await getTopics(event));
}

/**
 * Get the topics associated with a repository.
 * @memberOf GitHubAPI
 * @param event {{body: string, ...*:any}}
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
        .then(r => checkResponseCode(r, 200, 'GET'));
    return topics.names;
}

/**
 * Copy a file from one repository to another, and return the copy.
 * @memberOf GitHubAPI
 * @param event {{body: string, ...*:any}}
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
            .then(r => checkResponseCode(r, 200, 'GET'))
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
        .then(r => checkResponseCode(r, 200, 'GET'))
        .then(json => file = json)
        .then(() => pushFile({body: JSON.stringify({
                ...d, content: file.content, path: file.path, url: d.newURL
            })}));
}

/**
 * Delete a file via github commit.
 * @memberOf GitHubAPI
 * @param event {object} request details.
 * @return {{statusText: string, body: string, statusCode: number}}
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
        .then(r => checkResponseCode(r, 200, 'GET'));

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
            .then(r => checkResponseCode(r, 200, 'DELETE'))
    );
}

/**
 * Retrieve the build status report for the last GitHub Pages build attempt.
 * @memberOf GitHubAPI
 * @param event {object} Should have body JSON string with repository URL and GitHub access token.
 * @return {Promise<{statusText: string, body: string, statusCode: number}>}
 */
async function getLastBuild(event) {
    const d = JSON.parse(event.body);
    const status = await fetch(`${d.url}/pages/builds/latest`, {
        headers: {
            "accept": "application/vnd.github.v3+json",
            "authorization": `token ${cryptr.decrypt(d.token)}`
        }})
        .then(r => checkResponseCode(r, 200, 'GET'))
    return OK(status);
}

if(process.env.NODE_ENV === 'test') {
    module.exports = {
        main,
        OK,
        checkResponseCode,
        redeemCode,
        getUserDetails,
        findRepositories,
        findRepositoryFiles,
        createRepository,
        pushFile,
        pullItem,
        setTopics,
        getTopics,
        copyFile,
        deleteFile,
        getLastBuild
    }
}
exports.handler = main;
