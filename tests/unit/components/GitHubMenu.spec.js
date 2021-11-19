import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import GitHubMenu from "@/components/GitHubMenu.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('GitHubMenu.vue', () => {
    let modules

    beforeEach(() => {
        // Set up a store with getters that return the config file
        modules = {
            github: {
                state: {
                    buildStatus: {
                        status: 'built',
                        duration: 9500,
                        error: {message: null}
                    },
                    lastBuildStatusCheck: 1,
                    loginInProgress: false
                },
                getters: {},
                actions: {},
                namespaced: true
            },
            workshop: {
                state: {busyFlags: []},
                getters: {
                    Repository: () => () => {
                        return {
                            name: 'test-workshop',
                            ownerLogin: 'testUser',
                            files: [{hasChanged: () => false}],
                            url: 'https://test'
                        }
                    }
                },
                actions: {
                    findRepositoryFiles: jest.fn(),
                    loadRepository: jest.fn(() => { return {url: 'https://test'}}),
                    saveRepositoryChanges: jest.fn(() => {return {
                        successes: 1, failures: 0
                    }})
                },
                namespaced: true
            }
        }
    })

    it('shows expanded properly', async () => {
        const wrapper = mount(
            GitHubMenu,
            {
                localVue,
                store: new Vuex.Store({modules}),
                data: () => { return {expanded: true}}
            }
        )

        expect(wrapper.is(GitHubMenu)).toBe(true)
        // Link to workshop
        wrapper.get('a[href="https://github.com/testUser/test-workshop/"]')
        // GitHub buttons
        const ghButtons = wrapper.findAll('.github-components > button')
        expect(ghButtons.length).toBe(2)
        expect(ghButtons.at(0).element.disabled).toBe(true)
        expect(ghButtons.at(1).element.disabled).toBe(true)
        // Website link button
        const button = wrapper.get('a[type="button"]')
        expect(button.element.href).toBe('https://testuser.github.io/test-workshop')
    })

    it('handles building', async () => {
        modules.github.state.buildStatus = {
            status: '',
            duration: null,
            error: {message: null}
        }
        const wrapper = mount(
            GitHubMenu,
            {
                localVue,
                store: new Vuex.Store({modules}),
                data: () => { return {expanded: true}}
            }
        )

        expect(wrapper.is(GitHubMenu)).toBe(true)
        expect(wrapper.html()).toContain("Website building in progress")
    })

    it('handles build errors', async () => {
        modules.github.state.buildStatus = {
            status: 'errored',
            duration: 9500,
            error: {message: "Something went wrong"}
        }
        const wrapper = mount(
            GitHubMenu,
            {
                localVue,
                store: new Vuex.Store({modules}),
                data: () => { return {expanded: true}}
            }
        )

        expect(wrapper.is(GitHubMenu)).toBe(true)
        expect(wrapper.html()).toContain("Something went wrong")
    })

    it('is locked when unchanged', async () => {
        const wrapper = mount(
            GitHubMenu,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(GitHubMenu)).toBe(true)
        // Link to workshop
        wrapper.get('a[href="https://github.com/testUser/test-workshop/"]')
        // GitHub buttons
        const ghButtons = wrapper.findAll('.github-components > button')
        expect(ghButtons.length).toBe(2)
        expect(ghButtons.at(0).element.disabled).toBe(true)
        expect(ghButtons.at(1).element.disabled).toBe(true)
        // Website link button
        const button = wrapper.get('a[type="button"]')
        expect(button.element.href).toBe('https://testuser.github.io/test-workshop')
    })

    it('is unlocked when changed', async () => {
        modules.workshop.getters.Repository =  () => () => {
            return {
                name: 'test-workshop',
                ownerLogin: 'testUser',
                files: [{hasChanged: () => true}],
                url: 'https://test'
            }
        }
        const wrapper = mount(
            GitHubMenu,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(GitHubMenu)).toBe(true)
        // GitHub buttons
        const ghButtons = wrapper.findAll('.github-components > button')
        expect(ghButtons.length).toBe(2)
        expect(ghButtons.at(0).element.disabled).toBe(false)
        expect(ghButtons.at(1).element.disabled).toBe(false)

        await ghButtons.at(0).trigger('click')
        expect(modules.workshop.actions.loadRepository).toHaveBeenCalled()
        expect(modules.workshop.actions.findRepositoryFiles).toHaveBeenCalled()

        await ghButtons.at(1).trigger('click')
        expect(modules.workshop.actions.saveRepositoryChanges).toHaveBeenCalled()
    })
})
