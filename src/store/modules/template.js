export default {
    namespaced: true,
    state: {
        master: null,
        fetchInProgress: false,
        errors: []
    },
    mutations: {
        setSearchFlag: function(state, v) {state.fetchInProgress = v},
        setMaster: function(state, v) {state.master = v},
        addError: function(state, e) {state.errors.push(e)}
    },
    actions: {
        fetchTemplateMaster: {
            root: true,
            handler (nsContext, url) {
                if(nsContext.state.fetchInProgress)
                    return;
                nsContext.commit('setSearchFlag', true);
                fetch(`${url}/contents/_config.yml`)
                    .then(r => r.json())
                    .then(j => atob(j.content))
                    .then(c => {
                        nsContext.commit('setSearchFlag', false);
                        nsContext.commit('setMaster', c);
                    })
                    .catch(e => {
                        nsContext.commit('setSearchFlag', false);
                        nsContext.commit('addError', e);
                    });
            }
        }
    }
};