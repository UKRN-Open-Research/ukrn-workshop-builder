exports.handler = main;
import fetch from 'node-fetch'
require('dotenv').config();
const {VUE_APP_GITHUB_ID, GITHUB_APP_SECRET} = process.env;

/**
 * Process requests from a client
 */
async function main(event, context, callback) {
    let access_token = "";
    fetch(
        `https://github.com/login/oauth/access_token?client_id=${VUE_APP_GITHUB_ID}&client_secret=${GITHUB_APP_SECRET}&code=${event.headers.github}`,
        {headers: {"accept": "application/json"}}
    )
        .then(r => {
            if(r.status !== 200) {
                console.error({erroenousResponse: r})
                throw new Error(`Received response ${r.statusText} (${r.status})`);
            }
            return r.json()
        })
        .then(j => {
            if(j.error)
                throw new Error(`${j.error}: ${j.error_description}`);
            access_token = j.access_token;
            return access_token;
        })
        // Get user details
        .then(t =>
            fetch('https://api.github.com/user', {
                headers: {
                    "accept": "application/vnd.github.v3+json",
                    "authorization": `token ${t}`
                }
            })
        )
        .then(r => r.json())
        .then(j => {
            callback(null, {statusCode: 200, statusText: "OK", body: JSON.stringify({...j, token: access_token})})
        })
        .catch(e => callback(e))
}