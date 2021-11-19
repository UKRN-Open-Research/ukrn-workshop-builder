import { shallowMount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import ArrangeItems from "@/components/ArrangeItems.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('ArrangeItems.vue', () => {
    let items
    let modules, mutations

    beforeEach(() => {
        items = [
            {
                "url": "https://api.github.com/repos/UKRN-Open-Research/ukrn-wb-lesson-templates/contents/_episodes/code-lesson.md",
                "path": "_episodes/code-lesson.md",
                "yaml": {
                    "title": "Code Lesson",
                    "duration": 0,
                    "teaching": 15,
                    "exercises": 30,
                    "summary": "This template shows you how to include computer code and its output in your lessons.",
                    "body": "yaml file body",
                    "content": "---\nyaml: true\n---\nyaml file body",
                    "day": 1,
                    "order": 100000
                },
                "ukrn_wb_rules": [],
                busyFlag: () => false,
                hasChanged: () => false
            },
            {
                "url": "https://api.github.com/repos/UKRN-Open-Research/ukrn-wb-lesson-templates/contents/_episodes/another-lesson.md",
                "path": "_episodes/another-lesson.md",
                "yaml": {
                    "title": "Another Lesson",
                    "duration": 0,
                    "teaching": 15,
                    "exercises": 0,
                    "summary": "",
                    "body": "yaml file body",
                    "content": "---\nyaml: true\n---\nyaml file body",
                    "day": 1,
                    "order": 200000
                },
                "ukrn_wb_rules": [],
                busyFlag: () => false,
                hasChanged: () => false
            }
        ]
        // Set up a store with getters that return the config file
        modules = {
            workshop: {
                getters: {
                    Repository: () => () => {
                        return {
                            config: {
                                yaml: {
                                    start_times: ["09|30"]
                                }
                            }
                        }
                    }
                },
                actions: {},
                mutations: {},
                namespaced: true
            }
        }
        mutations = {}
    })

    it('shows items', async () => {
        const wrapper = shallowMount(
            ArrangeItems,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {items, dayId: 1}
            }
        )

        expect(wrapper.is(ArrangeItems)).toBe(true)

        const stubs = wrapper.findAll('customiseitem-stub')
        expect(stubs.length).toEqual(2)

        expect(stubs.at(0).element.attributes.start.value).toMatch('9,30')
        expect(stubs.at(0).element.attributes.end.value).toMatch('10,15')
        expect(stubs.at(1).element.attributes.start.value).toMatch('10,15')
        expect(stubs.at(1).element.attributes.end.value).toMatch('10,30')
    })

    it('handles later days', async () => {
        const wrapper = shallowMount(
            ArrangeItems,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {items, dayId: 4}
            }
        )
        const stubs = wrapper.findAll('customiseitem-stub')
        expect(stubs.at(0).element.attributes.start.value).toMatch('9,30')
        expect(stubs.at(1).element.attributes.end.value).toMatch('10,30')
    })

    it('moves items', async () => {
        const wrapper = shallowMount(
            ArrangeItems,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {items}
            }
        )
        const event = {
            "moved": {
                "element": items[1],
                "oldIndex": 0,
                "newIndex": 1
            }
        }
        await wrapper.vm.change(event)
        expect(wrapper.emitted().assignItem[0]).toEqual([{
            item: event.moved.element,
            dayId: null,
            prevOrder: items[0].yaml.order,
            nextOrder: null
        }])
    })

    it('adds items', async () => {
        const wrapper = shallowMount(
            ArrangeItems,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {items}
            }
        )
        const event = {
            "added": {
                "element": items[1],
                "newIndex": 0
            }
        }
        await wrapper.vm.change(event)
        expect(wrapper.emitted().assignItem[0]).toEqual([{
            item: event.added.element,
            dayId: null,
            prevOrder: null,
            nextOrder: items[1].yaml.order
        }])
    })

    it('removes items', async () => {
        const wrapper = shallowMount(
            ArrangeItems,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {items}
            }
        )
        await wrapper.vm.remove(items[0])
        expect(wrapper.emitted().assignItem[0]).toEqual([{
            item: items[0],
            dayId: ''
        }])
    })
})
