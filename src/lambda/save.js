exports.handler = main;
import fetch from 'node-fetch'
require('dotenv').config();

/**
 * Process requests from a client
 */
async function main(event, context, callback) {
    let payload = null;
    try {
        payload = JSON.parse(event.body).data;
    } catch(e) {
        return callback('Bad payload format');
    }
    if(!event.headers["github-token"])
        return callback('No GitHub access token.');
    if(!event.headers["github-user"])
        return callback('No GitHub user');
    if(!event.headers["github-user-repos"])
        return callback('No GitHub repository root');

    const headers = {
        "accept": "application/vnd.github.v3+json",
        "authorization": `token ${event.headers["github-token"]}`
    };

    // Fetch repository list TODO: replace this with using search function on tags: 1 workshop per topic per user
    let url = `https://api.github.com/search/repositories?q=fork:true+${encodeURI(`user:"${event.headers['github-user']}"+topic:"ukrn-open-research"`)}`;
    console.log(url);
    const workshop_repos = await fetch(url, {headers})
        .then(r => r.json())
        .then(r => r);
    console.log(workshop_repos);
    const repos = await fetch(event.headers["github-user-repos"], {headers})
        .then(r => r.json())
        .then(r => r);


    // Check we have a github repository to make edits to


    // Create repository

    // Make _config.yml changes

    // Install episodes


    callback(null, {statusCode: 200, statusText: "OK", body: JSON.stringify({event, context})});
}