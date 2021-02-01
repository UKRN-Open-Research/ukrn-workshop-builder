exports.handler = main;
import fetch from 'node-fetch'
require('dotenv').config();
const {VUE_APP_GITHUB_ID, GITHUB_APP_SECRET} = process.env;

/**
 * Process requests from a client
 */
async function main(event, context, callback) {
    // console.log({event})
    // Authenticate with github
    let token;
    if(event.headers.github) {
        try {
            token = await exchangeCodeForToken(event.headers.github);
            console.log(`Exchanged code\n${event.headers.github}\nfor token\n${token}`)
        } catch(e) {
            console.error(e);
            return callback(e);
        }
    }
    return callback(null, {statusCode: 200, statusText: "OK", body: JSON.stringify({message: "SRC backend"})});
}

async function exchangeCodeForToken(code) {
    return fetch(
        `https://github.com/login/oauth/access_token?client_id=${VUE_APP_GITHUB_ID}&client_secret=${GITHUB_APP_SECRET}&code=${code}`,
        {headers: {"accept": "application/json"}}
    )
        .then(r => {
            if(r.status !== 200)
                throw new Error(`Received response ${r.statusText} (${r.status})`);
            return r.json()
        })
        .then(j => {
            if(j.error)
                throw new Error(`${j.error}: ${j.error_description}`);
            return j.access_token
        })
}