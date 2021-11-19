import { mount, shallowMount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import mavonEditor from 'mavon-editor'
import CustomiseWorkshop from '@/components/CustomiseWorkshop.vue'

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)
localVue.use(mavonEditor)

describe('CustomiseWorkshop.vue', () => {
    const testTemplate = {
        "url": "https://url",
        "content": "content",
        "sha": "88faf32b5e362f04c9f8b547d1675766439c3f84",
        "path": "_config.yml",
        "remoteContent": "remoteContent",
        "yaml": {
            "workshop_id": "test",
            "topic": "open-access",
            "kind": "workshop",
            "ukrn_wb": [
                {
                    "fields_structure": [
                        "name",
                        "type",
                        "help",
                        "is_array",
                        "is_required",
                        "format",
                        "special"
                    ]
                },
                {
                    "fields": [
                        {
                            "workshop_id": [
                                "Workshop identifier",
                                "string",
                                "We will provide this to you, but its general structure will be a 2-3-letter code for your university or institution, a 2-letter code for the topic, the date (today's or the intended workshop date) in YYYYMMDD format, followed by an underscore and a two-digit version number. It should look something like UOBDS20210418_01",
                                false,
                                true,
                                null,
                                null
                            ]
                        },
                        {
                            "topic": [
                                "Workshop topic",
                                "string",
                                "The topic is used to search for pre-existing lessons you can include in your workshop",
                                false,
                                true,
                                "topic",
                                null
                            ]
                        }
                    ]
                }
            ]
        },
        "body": "\nnull",
        "yamlParseError": null
    }
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
                    busyFlags: [],
                    repositories: []
                },
                getters: {
                    hasChanged: () => () => true,
                    isBusy: () => () => false,
                    isConfigValid: () => () => true,
                    Repository: () => () => { return {config: testTemplate} }
                },
                actions: {
                    pushFile: jest.fn(),
                    setFileContent: jest.fn(),
                    setTopics: jest.fn(() => {return {url: "https://x"}})
                },
                mutations: {
                    setMainRepository: jest.fn()
                },
                namespaced: true
            }
        }
    })

    it('complains about empty templates', async () => {
        modules.workshop.getters.Repository = () => () => null
        const wrapper = mount(
            CustomiseWorkshop,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(CustomiseWorkshop)).toBe(true)
        expect(wrapper.html()).toContain('No workshop detected.')
        const button = wrapper.get('button')
        await button.trigger('click')
        expect(wrapper.emitted()).toHaveProperty('goToCreateWorkshop')
    })

    it('allows direct template editing', async () => {
        const wrapper = mount(
            CustomiseWorkshop,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        await wrapper.vm.refresh()
        const button = wrapper.get('button.button.is-warning')
        await button.trigger('click')
        const modal = wrapper.get('div.modal.is-active')
        modal.find('div.v-note-read-content > p').element.innerHTML = "new content"
        await modal.get('button.modal-close').trigger('click')
        expect(modules.workshop.actions.setFileContent).toHaveBeenCalled()
    })

    it('instantiates from store Repository template', async () => {
        const wrapper = shallowMount(
            CustomiseWorkshop,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        expect(wrapper.is(CustomiseWorkshop)).toBe(true)
        await wrapper.vm.refresh()
        expect(wrapper.vm.$data.currentTemplate).toEqual(testTemplate)

        await wrapper.vm.pushConfig()
        expect(modules.workshop.actions.pushFile).toHaveBeenCalled()
        expect(modules.workshop.actions.setTopics).toHaveBeenCalled()
    })

    it('handles push failures', async () => {
        modules.workshop.actions.setTopics = () => null
        const wrapper = shallowMount(
            CustomiseWorkshop,
            {
                localVue,
                store: new Vuex.Store({modules})
            }
        )

        await wrapper.vm.refresh()
        await wrapper.vm.pushConfig()
    })
})
