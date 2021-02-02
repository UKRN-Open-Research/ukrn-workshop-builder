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
    actions: {
        initWorkshop: {
            root: true,
            handler (nsContext, payload) {
                // Customise workshop template text
                nsContext.commit('updateConfig', payload);
                nsContext.commit('setBaseConfig', payload);
                console.log(`Initialised workshop`)
            }
        },
        pushWorkshopToGitHub: {
            root: true,
            handler (nsContext) {
                console.log(`Pushing workshop!`);
                fetch(``, {
                    method: "POST",
                    body: JSON.stringify({config: nsContext.state.config})
                })
                    .then(r => {
                        if(r.status !== 200)
                            throw new Error(`Push workshop received ${r.statusText} (${r.status})`);
                        console.log(r)
                        nsContext.commit('setPushed', true);
                    })
                    .catch(e => console.error(e));
            }
        }
    }
};