module.exports = {
    "opts": {
        "destination": "./docs/",
        "recurse": true
    },
    "tags": {
        "allowUnknownTags": true
    },
    "source": {
        "include": ["./src"],
        "exclude": [],
        "includePattern": ".+\\.(js|jsdoc|jsx|vue)$",
        "excludePattern": ""
    },
    "plugins": [
        "jsdoc-vuejs",
        "jsdoc-vuex-plugin"
    ],
    "templates": {
        "cleverLinks": true,
        "monospaceLinks": false
    }
}
