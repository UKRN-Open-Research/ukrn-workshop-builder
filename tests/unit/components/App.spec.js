import { shallowMount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import App from "@/App.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('App.vue', () => {

    it('mounts', async () => {
        const store = {
            getters: {
                'workshop/Repository': () => null,
                'github/login': () => false,
            },
            state: {
                github: {errors: []},
                template: {errors: []},
                workshop: {errors: []}
            }
        }
        const wrapper = shallowMount(
            App,
            {
                localVue,
                store
            }
        )

        expect(wrapper.is(App)).toBe(true)
    })
})
