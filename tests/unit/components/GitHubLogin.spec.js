import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import GitHubLogin from "@/components/GitHubLogin.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('GitHubLogin.vue', () => {
    let modules

    beforeEach(() => {
        // Set up a store with getters that return the config file
        modules = {
            github: {
                state: {
                    code: null,
                    token: null,
                    user: {},
                    loginInProgress: false
                },
                getters: {
                    code: state => state.code,
                    login: state => state.user.login,
                    token: state => state.token
                },
                actions: {
                    getUserDetails: jest.fn(),
                    logout: jest.fn(),
                    redeemCode: jest.fn()
                },
                namespaced: true
            }
        }
    })

    it('handles login', async () => {
        const wrapper = mount(
            GitHubLogin,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(GitHubLogin)).toBe(true)
        const button = wrapper.get('button')
        expect(button.element.innerHTML).toContain('Log in to GitHub')

        // To test the redirect we need to remove the location setter
        delete window.location
        await button.trigger('click')
        expect(location).toMatch(/https:\/\/github\.com\//)
    })

    it('handles tokens', async () => {
        modules.github.state.token = 'foobar'
        const wrapper = mount(
            GitHubLogin,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(GitHubLogin)).toBe(true)
        expect(modules.github.actions.getUserDetails).toHaveBeenCalled()
    })

    it('handles codes', () => {
        modules.github.state.code = 'foobar'
        const wrapper = mount(
            GitHubLogin,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(GitHubLogin)).toBe(true)
        expect(modules.github.actions.redeemCode).toHaveBeenCalled()
    })

    it('offers a logout option', async () => {
        modules.github.state.user = {"login":"testUser"}
        const wrapper = mount(
            GitHubLogin,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(GitHubLogin)).toBe(true)
        const button = wrapper.get('button')
        expect(button.element.innerHTML).toContain('(logout)')
        await button.trigger('click')
        expect(modules.github.actions.logout).toHaveBeenCalled()
    })
})
