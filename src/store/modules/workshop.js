export default {
    namespaced: true,
    state: {
        baseConfig: null,
        config: null,
        pushed: false
    },
    mutations: {
        setBaseConfig: function(store, cfg) {store.baseConfig = cfg},
        updateConfig: function(store, cfg) {store.config = cfg},
        setPushed: function(store, value) {store.pushed = value}
    },
    getters: {
        name: state => {
            const match = /^topic: (.+)$/gm.exec(state.config);
            if(match)
                return match[1];
            return "";
        }
    },
    actions: {
        initWorkshop: {
            root: true,
            handler (nsContext, payload) {
                // Customise workshop template text
                let cfg = payload.template;
                cfg = setTopic(cfg, payload.topic);
                nsContext.commit('updateConfig', cfg);
                nsContext.commit('setBaseConfig', cfg);
                console.log(`Initialised ${payload.topic} workshop`)
            }
        },
        pushWorkshopToGitHub: {
            root: true,
            handler (nsContext, payload) {
                console.log(payload);
                nsContext.commit('setPushed', true);
            }
        },
        updateName (nsContext, name) {
            const newCFG = setName(nsContext.store.config, name);
            nsContext.commit('updateConfig', newCFG);
        }
    }
};

function ymlClean(str) {
    let s = str;
    s = s.replace(/'/g, '"');
    s = s.replace(/[^a-zA-Z0-9_'; .]/g, '');
    return s;
}

function setTopic(cfg, topic) {
    let C = `TOPIC:::${topic}\n${cfg}`;
    return C;
}

function setName(cfg, name) {
    let C = cfg.replace(/^topic:.+$/gm, `topic: ${ymlClean(name)}`);
    return C;
}