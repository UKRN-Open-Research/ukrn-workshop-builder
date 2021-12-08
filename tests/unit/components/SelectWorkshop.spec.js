import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import SelectWorkshop from "@/components/SelectWorkshop.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('SelectWorkshop.vue', () => {
    const testUser = "testUser"
    let modules

    beforeEach(() => {
        // Set up a store with getters that return the config file
        modules = {
            github: {
                getters: {login: () => testUser},
                actions: {registerBuildCheck: jest.fn()},
                namespaced: true
            },
            workshop: {
                state: {
                    repositories: [],
                    templates: [{ownerLogin: 'foo', name: 'bar', url: 'https://foobar', description: 'Dummy template'}]
                },
                getters: {
                    isBusy: () => () => false
                },
                actions: {
                    findRepositories: jest.fn(),
                    findRepositoryFiles: jest.fn(
                        () => {
                            return {
                                config: {yaml: {topic: 'no-topic'}}
                            }
                        }
                    ),
                    findTemplates: jest.fn(),
                    registerBuildCheck: jest.fn(),
                    createRepository: jest.fn()
                },
                mutations: {
                    setMainRepository: jest.fn()
                },
                namespaced: true
            }
        }
    })

    it('handles new users', async () => {
        const wrapper = mount(
            SelectWorkshop,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(SelectWorkshop)).toBe(true)

        // Expect a nice greeting with a refresh option
        expect(wrapper.element.innerHTML).toContain('You don\'t have any workshop repositories tagged with the topic "ukrn-workshop".')
        const button = wrapper.get('button')
        expect(button.element.innerHTML).toContain('Check again')
        await button.trigger('click')
        expect(modules.workshop.actions.findRepositories).toHaveBeenCalled()

        expect(wrapper.element.innerHTML).toContain('Create a new workshop from a template')
        const newRepoButton = wrapper.get('.control > button')
        expect(newRepoButton.element.disabled).toBe(true)
        const newRepoName = wrapper.get('.control > input')
        await newRepoName.setValue('testWorkshop')
        expect(newRepoButton.element.disabled).toBe(true)
        const selectTemplate = wrapper.get('.control select')
        expect(selectTemplate.element.value).toBe('')
        await selectTemplate.setValue(modules.workshop.state.templates[0].url)
        expect(newRepoButton.element.disabled).toBe(false)
        await newRepoButton.trigger('click')
        expect(modules.workshop.actions.createRepository).toHaveBeenCalled()
    })

    it('handles returning users', async () => {
        modules.workshop.state.repositories = [
            {name: "repo-1", url: "http://repo-1", ownerLogin: testUser},
            {name: "repo-2", url: "http://repo-2", ownerLogin: testUser},
            {name: "repo-3", url: "http://repo-3", ownerLogin: testUser}
        ]
        const wrapper = mount(
            SelectWorkshop,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(SelectWorkshop)).toBe(true)

        expect(wrapper.element.innerHTML).toContain('You already have a workshop repository which is tagged with the topic "ukrn-workshop".')
        const button = wrapper.get('.select-repo button')
        expect(button.element.disabled).toBe(true)
        const select = wrapper.get('select')
        await select.get('option[value="http://repo-2"]').setSelected()
        expect(button.element.disabled).toBe(false)
        await button.trigger('click')
        expect(modules.workshop.mutations.setMainRepository).toHaveBeenCalled()
        expect(modules.workshop.actions.findRepositoryFiles).toHaveBeenCalled()
        expect(modules.github.actions.registerBuildCheck).toHaveBeenCalled()

        // New workshops should be creatable by returning users, too
        expect(wrapper.element.innerHTML).toContain('create a new workshop from a template')
    })
})
