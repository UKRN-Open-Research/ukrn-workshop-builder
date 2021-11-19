import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import WorkshopProperties from '@/components/WorkshopProperties.vue'
import YAMLField from '@/components/YAMLField.vue'

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('WorkshopProperties.vue', () => {
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
    let modules

    beforeEach(() => {
        // Set up a store with getters that return the config file
        modules = {
            workshop: {
                state: {
                    busyFlags: []
                },
                getters: {
                    isBusy: () => () => false
                },
                actions: {
                    setFileContentFromYAML: jest.fn()
                },
                mutations: {},
                namespaced: true
            }
        }
    })

    it('saves changes', async () => {
        const wrapper = mount(
            WorkshopProperties,
            {
                localVue,
                store: new Vuex.Store({modules}),
                propsData: {
                    template: testTemplate
                }
            }
        )

        expect(wrapper.is(WorkshopProperties)).toBe(true)
        const input = wrapper.getComponent(YAMLField)
        await input.vm.$emit('save', {key: input.vm.field.key, value: 'new-id'})
        expect(wrapper.vm.saveTimeout).toBeGreaterThan(0)
        clearTimeout(wrapper.vm.saveTimeout)
        await wrapper.vm.save()
        expect(modules.workshop.actions.setFileContentFromYAML).toHaveBeenCalled()
    })
})
