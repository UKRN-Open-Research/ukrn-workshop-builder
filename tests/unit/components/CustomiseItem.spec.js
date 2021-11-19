import { mount, shallowMount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import mavonEditor from 'mavon-editor'
import CustomiseItem from "@/components/CustomiseItem.vue";
import YAMLField from "@/components/YAMLField";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)
localVue.use(mavonEditor)

describe('CustomiseItem.vue', () => {
    let item
    let modules, mutations

    beforeEach(() => {
        item = {
            "url": "https://api.github.com/repos/UKRN-Open-Research/ukrn-wb-lesson-templates/contents/_episodes/code-lesson.md",
            "path": "_episodes/code-lesson.md",
            "yaml": {
                "title": "Code Lesson",
                "summary": "This template shows you how to include computer code and its output in your lessons.",
                "body": "yaml file body",
                "content": "---\nyaml: true\n---\nyaml file body",
                "day": 1
            },
            "ukrn_wb_rules": [],
            busyFlag: () => false,
            hasChanged: () => false
        }
        // Set up a store with getters that return the config file
        modules = {
            workshop: {
                getters: {
                    Repository: () => () => {
                        return {
                            episodes: [{item}],
                            episode_template: {yaml: {ukrn_wb: [{"fields_structure":["name","type","help","is_array","is_required","format","special"]},{"fields":[{"title":["Title","string","The title for the episode",false,true,null,null]},{"teaching":["Teaching time","number","The number of minutes teaching time required",false,false,null,null]},{"exercises":["Working time","number","The number of minutes required to complete any exercises",false,false,null,null]},{"duration":["Duration","number","Additional duration not accounted for by teaching or exercise time (e.g. break time)",false,false,null,null]},{"summary":["Summary","string","Short text summarising what happens in the episode",false,false,"long",null]},{"questions":["Questions","string","Questions which will be addressed during the episode",true,false,"long",null]},{"objectives":["Objectives","string","Learning outcomes for the episode",true,false,"long",null]},{"keypoints":["Key points","string","The take-home points for the episode",true,false,"long",null]},{"is-break":["Break","boolean","Whether this episode is a break (breaks look different in the schedule)",false,false,null,null]},{"ukrn_wb_rules":["UKRN Workshop Builder rules","string","List of special rules to apply when this episode is processed by the UKRN Workshop Builder",true,false,"ukrn-wb-rules",["allow-multiple","hidden","template","remove-on-stash","undeletable"]]}]}]}}
                        }
                    }
                },
                actions: {
                    deleteFile: jest.fn(),
                    installFile: jest.fn(() => item),
                    installDependencies: jest.fn(() => item),
                    setFileContent: jest.fn(),
                    setFileContentFromYAML: jest.fn()
                },
                mutations: {
                    removeItem: jest.fn()
                },
                namespaced: true
            }
        }
        mutations = {setEditItem: jest.fn()}
    })

    it('shows buttons for stashed local items', async () => {
        delete item.yaml.day
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        expect(wrapper.is(CustomiseItem)).toBe(true)
        expect(wrapper.findAll('button, a[type="button"]').length).toEqual(3)

        const view = wrapper.get('button[title="View properties"]')
        await view.trigger('click')
        expect(mutations.setEditItem).toHaveBeenCalled()

        wrapper.get('a[title="Open lesson website in a new tab"]')

        const del = wrapper.get('button[title="Delete"]')
        await del.trigger('click')
        expect(modules.workshop.actions.deleteFile).toHaveBeenCalled()
    })

    it('shows buttons for stashed remote items', async () => {
        delete item.yaml.day
        item.remote = true
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        expect(wrapper.is(CustomiseItem)).toBe(true)
        expect(wrapper.findAll('button, a[type="button"]').length).toEqual(3)

        const view = wrapper.get('button[title="View properties"]')
        await view.trigger('click')
        expect(mutations.setEditItem).toHaveBeenCalled()

        wrapper.get('a[title="Open lesson website in a new tab"]')

        const del = wrapper.get('button[title="Remove this lesson"]')
        await del.trigger('click')
        expect(modules.workshop.mutations.removeItem).toHaveBeenCalled()
    })

    it('shows buttons for remote agenda items', async () => {
        item.remote = true
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        expect(wrapper.is(CustomiseItem)).toBe(true)
        expect(wrapper.findAll('button, a[type="button"]').length).toEqual(4)

        const install = wrapper.get('button[title="Install remote lesson"]')
        await install.trigger('click')
        expect(modules.workshop.actions.installFile).toHaveBeenCalled()

        const view = wrapper.get('button[title="View properties"]')
        await view.trigger('click')
        expect(mutations.setEditItem).toHaveBeenCalled()

        wrapper.get('a[title="Open lesson website in a new tab"]')

        const stash = wrapper.get('button[title="Move to stash"]')
        await stash.trigger('click')
        expect(wrapper.emitted().remove[0]).toEqual([item])
    })

    it('shows buttons for local agenda items', async () => {
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        expect(wrapper.is(CustomiseItem)).toBe(true)
        expect(wrapper.findAll('button, a[type="button"]').length).toEqual(4)

        const editP = wrapper.get('button[title="Edit properties"]')
        await editP.trigger('click')
        expect(mutations.setEditItem).toHaveBeenCalled()

        const editC = wrapper.get('button[title="Edit content"]')
        await editC.trigger('click')
        expect(mutations.setEditItem).toHaveBeenCalled()

        wrapper.get('a[title="Open lesson website in a new tab"]')

        const stash = wrapper.get('button[title="Move to stash"]')
        await stash.trigger('click')
        expect(wrapper.emitted().remove[0]).toEqual([item])
    })

    it('errors if given no repository', async () => {
        modules.workshop.getters.Repository = () => () => null
        expect(() => {
            shallowMount(
                CustomiseItem,
                {
                    localVue,
                    store: new Vuex.Store({modules, mutations}),
                    propsData: {item}
                }
            )
        }).toThrow('No Repository found.')
    })

    it('handles repository fetch errors', async () => {
        modules.workshop.getters.Repository = () => () => throw(new Error('Test'))
        expect(() => {
            shallowMount(
                CustomiseItem,
                {
                    localVue,
                    store: new Vuex.Store({modules, mutations}),
                    propsData: {item}
                }
            )
        }).toThrow('Error retrieving Repository from store: Error: Test')
    })

    it('edits content', async () => {
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        const editC = wrapper.get('button[title="Edit content"]')
        await editC.trigger('click')

        const close = wrapper.get('button.modal-close')
        await close.trigger('click')
        expect(modules.workshop.actions.setFileContentFromYAML).toHaveBeenCalled()
    })

    it('edits raw content', async () => {
        delete item.yaml.title;
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        const editC = wrapper.get('button[title="Repair raw content"]')
        await editC.trigger('click')

        const close = wrapper.get('button.modal-close')
        await close.trigger('click')
        expect(modules.workshop.actions.setFileContent).toHaveBeenCalled()
    })

    it('edits properties', async () => {
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        const edit = wrapper.get('button[title="Edit properties"]')
        await edit.trigger('click')

        const title = wrapper.findAllComponents(YAMLField).at(0)
        expect(title.element.innerHTML).toContain('Title')
        await title.vm.$emit('save', {key: title.props().field.key, value: "New Title"})
        expect(modules.workshop.actions.setFileContentFromYAML).toHaveBeenCalled()
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted().refresh[0]).toEqual([])
    })

    it('installs missing no dependencies', async () => {
        item.yaml.missingDependencies = [
            "some/missing/path.file"
        ]
        modules.workshop.actions.installDependencies = jest.fn(
            () => item
        )
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        expect(wrapper.get('span.has-text-warning').element.outerHTML).toContain('missing dependencies')
        const edit = wrapper.get('button[title="Edit properties"]')
        await edit.trigger('click')

        const install = wrapper.get('.yaml-modal button.is-warning')
        await install.trigger('click')

        expect(modules.workshop.actions.installDependencies).toHaveBeenCalled()
    })

    it('installs missing some dependencies', async () => {
        modules.workshop.actions.installDependencies = jest.fn(
            () => {return {successes: 1, failures: 1}}
        )
        item.yaml.missingDependencies = [
            "some/missing/path.file"
        ]
        // Deep copy missingDependencies
        const withMiss = {...item, yaml: {...item.yaml, missingDependencies: [...item.yaml.missingDependencies]}}
        item.yaml.missingDependencies.push("another/file/path.ext")
        modules.workshop.actions.installDependencies = jest.fn(
            () => withMiss
        )
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        expect(wrapper.get('span.has-text-warning').element.outerHTML).toContain('missing dependencies')
        const edit = wrapper.get('button[title="Edit properties"]')
        await edit.trigger('click')

        const install = wrapper.get('.yaml-modal button.is-warning')
        await install.trigger('click')

        expect(modules.workshop.actions.installDependencies).toHaveBeenCalled()
    })

    it('installs missing all dependencies', async () => {
        // Deep copy missingDependencies
        const allGood = {...item, yaml: {...item.yaml, missingDependencies: []}}
        item.yaml.missingDependencies = [
            "some/missing/path.file"
        ]
        modules.workshop.actions.installDependencies = jest.fn(
            () => allGood
        )
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item}
            }
        )

        expect(wrapper.get('span.has-text-warning').element.outerHTML).toContain('missing dependencies')
        const edit = wrapper.get('button[title="Edit properties"]')
        await edit.trigger('click')

        const install = wrapper.get('.yaml-modal button.is-warning')
        await install.trigger('click')

        expect(modules.workshop.actions.installDependencies).toHaveBeenCalled()
    })

    it('overrides links', async () => {
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {item, overrideLink: "/some/new/path"}
            }
        )

        const link = wrapper.get('a[title="Open lesson website in a new tab"]')
        expect(link.element.href).toMatch(/some\/new\/path$/)
    })

    it('pads times', async () => {
        const wrapper = mount(
            CustomiseItem,
            {
                localVue,
                store: new Vuex.Store({modules, mutations}),
                propsData: {
                    item,
                    start: [9, 15],
                    end: [0, 0]
                }
            }
        )

        const time = wrapper.get('span.time')
        expect(time.element.innerHTML).toContain('09:15<br>00:00')
    })
})
