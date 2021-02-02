import Vue from "vue";
import Vuex from "vuex";
import github from "./modules/github";
import template from "./modules/template";
import workshop from "./modules/workshop";
Vue.use(Vuex);

const store = new Vuex.Store({
    strict: process.env.NODE_ENV !== 'production',
    modules: {
        github,
        template,
        workshop
    },
    computed: {
        ...Vuex.mapGetters({
            workshopName: 'workshop/name'
        })
    }
});

export default store;