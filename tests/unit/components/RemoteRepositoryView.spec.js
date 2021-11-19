import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import RemoteRepositoryView from "@/components/RemoteRepositoryView.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('RemoteRepositoryView.vue', () => {
    const repo = {
        "url": "https://api.github.com/repos/UKRN-Open-Research/ukrn-wb-lesson-templates",
        "ownerLogin": "UKRN-Open-Research",
        "name": "ukrn-wb-lesson-templates",
        "topics": ["data-sharing","open-access"],
        "isMain": false,
        "busyFlag": () => false,
        "episodes": [
            {
                "path": "_episodes/code-lesson.md",
                "yaml": {
                    "title": "Code Lesson",
                    "summary": "This template shows you how to include computer code and its output in your lessons."
                }
            },
            {
                "path": "_episodes/external-lesson.md",
                "yaml": {
                    "title": "External Lesson",
                    "summary": "This template shows you how to use an external tutorial as a lesson."
                }
            },
            {
                "path": "_episodes/text-lesson.md",
                "yaml": {
                    "title": "Text Lesson",
                    "summary": "This template shows you how to use the various different special text boxes on offer."
                }
            },
            {
                "path": "_episodes/video-lesson.md",
                "yaml": {
                    "title": "Video Lesson",
                    "summary": "This template shows you how to include embedded videos in your lessons."
                }
            }
        ]
    }
    let modules

    beforeEach(() => {
        // Set up a store with getters that return the config file
        modules = {
            workshop: {
                getters: {
                    isBusy: () => () => false
                },
                actions: {
                    findRepositoryFiles: jest.fn(
                        () => {
                            return {
                                episodes: repo.episodes
                            }
                        }
                    ),
                    setFileContentFromYAML: jest.fn()
                },
                namespaced: true
            }
        }
    })

    it('fetches episodes when empty', async () => {
        const wrapper = mount(
            RemoteRepositoryView,
            {
                localVue,
                store: new Vuex.Store({modules}),
                propsData: {repo: {...repo, episodes: []}}
            }
        )

        expect(wrapper.is(RemoteRepositoryView)).toBe(true)
        // Clicking should open the details and fetch the episode list
        await wrapper.get('div.topic-button[role="button"]').trigger('click')
        expect(wrapper.emitted().open[0]).toEqual([repo.url])
        expect(modules.workshop.actions.findRepositoryFiles).toHaveBeenCalled()
        expect(modules.workshop.actions.setFileContentFromYAML).toHaveBeenCalled()
    })

    it('opens details', async () => {
        const wrapper = mount(
            RemoteRepositoryView,
            {
                localVue,
                store: new Vuex.Store({modules}),
                propsData: {repo}
            }
        )

        expect(wrapper.is(RemoteRepositoryView)).toBe(true)
        // All the episodes should display
        expect(wrapper.findAll('li').length).toBe(4)

        // Clicking should open the details
        await wrapper.get('div.topic-button[role="button"]').trigger('click')
        expect(wrapper.emitted().open[0]).toEqual([repo.url])

        await wrapper.get('button.button').trigger('click')
        expect(wrapper.emitted().selectRepo[0]).toEqual([repo.episodes])
    })
})
