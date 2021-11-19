import github from "./modules/github";
import template from "./modules/template";
import workshop from "./modules/workshop";

const store = {
    strict: process.env.NODE_ENV !== 'production',
    modules: {
        github,
        template,
        workshop
    },
    state: {
        topicList: [
            'data-sharing', 'open-access', 'open-code', 'preprints', 'preregistration'
        ],
        editingItem: false,
    },
    mutations: {
        setEditItem(state, value) {state.editingItem = value},
    }
};

export default store;
