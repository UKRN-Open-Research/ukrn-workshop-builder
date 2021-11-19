import { mount, shallowMount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import MakeSchedule from "@/components/MakeSchedule";
import CustomiseItem from "@/components/CustomiseItem";
import RemoteRepositoryView from "@/components/RemoteRepositoryView";
import ArrangeItems from "@/components/ArrangeItems";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('MakeSchedule.vue', () => {
    let episodes
    let modules, state

    beforeEach(() => {
        episodes = [
            {
                "url": "https://api.github.com/repos/me/myrepo/contents/_episodes/code-lesson.md",
                "path": "_episodes/code-lesson.md",
                "yaml": {
                    "title": "Code Lesson",
                    "duration": 0,
                    "teaching": 15,
                    "exercises": 30,
                    "summary": "This template shows you how to include computer code and its output in your lessons.",
                    "content": "---\nyaml: true\n---\nyaml file body",
                    "day": 1,
                    "order": 100000
                },
                "body": "yaml file body",
                "ukrn_wb_rules": [],
                busyFlag: () => false,
                hasChanged: () => false
            },
            {
                "url": "https://api.github.com/repos/me/myrepo/contents/_episodes/another-lesson.md",
                "path": "_episodes/another-lesson.md",
                "yaml": {
                    "title": "Another Lesson",
                    "duration": 0,
                    "teaching": 15,
                    "exercises": 0,
                    "summary": "",
                    "content": "---\nyaml: true\n---\nyaml file body",
                    "day": 1,
                    "order": 200000
                },
                "body": "yaml file body",
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
                            },
                            busyFlag: () => false,
                            topics: ['a-topic', 'another-topic', 'foobar'],
                            episode_template: {yaml: {ukrn_wb: [{"fields_structure":["name","type","help","is_array","is_required","format","special"]},{"fields":[{"title":["Title","string","The title for the episode",false,true,null,null]}]}]}},
                            episodes
                        }
                    },
                    RepositoriesByFilter: () => () => [
                        {
                            config: {
                                yaml: {
                                    start_times: ["09|30"]
                                }
                            },
                            busyFlag: () => false,
                            topics: ['a-topic', 'another-topic', 'foobar'],
                            episodes
                        },
                        {
                            name: 'remote_repo',
                            ownerLogin: 'anotherUser',
                            config: {
                                yaml: {
                                    start_times: ["09|00"]
                                }
                            },
                            busyFlag: () => false,
                            topics: ['a-topic'],
                            episodes: episodes.map(e => {
                                return {
                                    ...e,
                                    url: e.url.replace("me/myrepo", "anotherUser/remote_repo"),
                                    yaml: {
                                        ...e.yaml,
                                        day: '',
                                        order: ''
                                    },
                                    remote: true
                                }
                            })
                        }
                    ]
                },
                actions: {
                    duplicateFile: jest.fn((x, y) => y),
                    findRepositoryFiles: () => { return {episodes: []}},
                    setFileContentFromYAML: jest.fn()
                },
                mutations: {
                    removeItem: jest.fn()
                },
                namespaced: true
            }
        }
        state = {
            topicList: ['a-topic', 'another-topic', 'unused-topic']
        }
    })

    it('handles repository fetch errors', async () => {
        modules.workshop.getters.Repository = () => () => throw(new Error('Test'))
        expect(() => {
            shallowMount(
                MakeSchedule,
                {
                    localVue,
                    store: new Vuex.Store({modules})
                }
            )
        }).toThrow('Error retrieving Repository from store: Error: Test')
    })

    it('displays arrange item blocks', async () => {
        const wrapper = shallowMount(
            MakeSchedule,
            {
                localVue,
                store: new Vuex.Store({state, modules})
            }
        )

        expect(wrapper.is(MakeSchedule)).toBe(true)
        const cis = wrapper.findAll('arrangeitems-stub')
        expect(cis.length).toEqual(3)
    })

    it('supports adding to stash', async () => {
        const wrapper = mount(
            MakeSchedule,
            {
                localVue,
                store: new Vuex.Store({state, modules})
            }
        )

        expect(wrapper.is(MakeSchedule)).toBe(true)
        const cis = wrapper.findAllComponents(CustomiseItem)
        expect(cis.length).toEqual(2)

        const stash = wrapper.get('.stash-buttons button')
        await stash.trigger('click')

        const rrv = wrapper.findAllComponents(RemoteRepositoryView).at(1)
        await rrv.get('div[role="button"]').trigger('click')
        const add = rrv.get('button')
        await add.trigger('click')

        expect(wrapper.vm.availableEpisodes.length).toBeGreaterThan(0)
        const clear = wrapper.get('.stash-buttons button.is-warning')
        expect(clear.html()).toContain('Clear stash')
        await clear.trigger('click')
        expect(wrapper.vm.availableEpisodes.length).toEqual(0)
    })

    it('supports updating episodes', async () => {
        const wrapper = mount(
            MakeSchedule,
            {
                localVue,
                store: new Vuex.Store({state, modules})
            }
        )

        expect(wrapper.is(MakeSchedule)).toBe(true)
        const ai = wrapper.findAllComponents(ArrangeItems).at(0)
        await ai.vm.$emit('assignItem', {
            item: episodes[1],
            dayId: null,
            prevOrder: episodes[0].yaml.order,
            nextOrder: null
        })
    })

    it('duplicates allow-multiple episodes', async () => {
        const episode = {
            ...episodes[0],
            url: episodes[0].url.replace("me/myrepo", "anotherUser/remote_repo"),
            yaml: {
                ...episodes[0].yaml,
                ukrn_wb_rules: ['allow-multiple'],
                day: '',
                order: ''
            },
            remote: true
        }
        const wrapper = mount(
            MakeSchedule,
            {
                localVue,
                store: new Vuex.Store({state, modules}),
                data: function() {
                    return {
                        addRemoteItems: false,
                        remoteRepositoryName: "",
                        availableEpisodes: [{...episode, url: "https://test.url"}],
                        expandedRepo: ""
                    }
                }
            }
        )

        const ai = wrapper.findAllComponents(ArrangeItems).at(0)
        await ai.vm.$emit('assignItem', {
            item: wrapper.vm.availableEpisodes[0],
            dayId: 1,
            prevOrder: episodes[0].yaml.order,
            nextOrder: null
        })
        expect(modules.workshop.actions.duplicateFile).toHaveBeenCalled()
        await wrapper.vm.$nextTick()
    })

    it('removes remove-on-stash episodes', async () => {
        const wrapper = mount(
            MakeSchedule,
            {
                localVue,
                store: new Vuex.Store({
                    state,
                    modules
                })
            }
        )

        const episode = {
            ...episodes[0],
            url: episodes[0].url.replace("me/myrepo", "anotherUser/remote_repo"),
            yaml: {
                ...episodes[0].yaml,
                ukrn_wb_rules: ['remove-on-stash'],
                day: '',
                order: ''
            },
            remote: true
        }

        const ai = wrapper.findAllComponents(ArrangeItems).at(0)
        await ai.vm.$emit('assignItem', {
            item: episode,
            dayId: null,
            prevOrder: episodes[0].yaml.order,
            nextOrder: null
        })
        expect(modules.workshop.mutations.removeItem).toHaveBeenCalled()
    })
})
