exports.handler = main;

require('dotenv').config();

/**
 * Process requests from a client
 */
function main(event, context, callback) {
    console.log("src/lambda/backend");
    // callback(null, {statusCode: 200, statusText: "OK", body: JSON.stringify({message: "SRC backend"})});
}