import github from "./modules/github";
import template from "./modules/template";
import workshop from "./modules/workshop";

/**
 * The context provided to store actions within VueX operations.
 * @typedef StoreContext
 * @property [state] {Object} Current store state.
 * @property [getters] {Object} Current store getters.
 * @property [commit] {Object} Current store mutations.
 * @property [rootSate] {Object} Current root store state.
 * @property [rootGetters] {Object} Current root store getters.
 */

/**
 * @class store
 * @property modules {Object[]} Modules used in the store.
 * @property modules.template {template} Template store module.
 * @property modules.github {github} GitHub store module.
 * @property modules.workshop {workshop} Workshop store module.
 */
const store = {
    strict: process.env.NODE_ENV !== 'production',
    modules: {
        github,
        template,
        workshop
    },
    /**
     * @name State
     * @memberOf store
     * @property topicList {string[]} Topics available for tagging repositories.
     * @property editingItem {boolean|string} The URL of the item being edited, or false if nothing is being edited.
     */
    state: {
        topicList: [
            'data-sharing', 'open-access', 'open-code', 'preprints', 'preregistration'
        ],
        editingItem: false,
    },
    /**
     * @name Mutations
     * @memberOf store
     * @property {string} setEditItem=editingItem Set the URL of the item being edited.
     */
    mutations: {
        /**
         *
         * @param state
         * @param value
         */
        setEditItem(state, value) {state.editingItem = value},
    }
};

export default store;
