import { mount, shallowMount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex"
import YAMLField from '@/components/YAMLField.vue'
import YAMLFieldInput from "@/components/YAMLFieldInput";
import YAMLFieldInputArray from "@/components/YAMLFieldInputArray";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('YAMLField.vue', () => {
    it('mounts checkboxes for filenames', async () => {
        const workshop = {
            getters: {
                Repository: () => () => {return {url: ""}}
            },
            actions: {
                pullURL: jest.fn(() => [
                    {"name": "accessibility.md"},
                    {"name": "requirements.md"}
                ])
            },
            namespaced: true
        }
        const field = {
            "name":"Optional introductory sections",
            "type":"filename",
            "help":"Optional introductory sections which can be included on the homepage and customised",
            "is_array":true,
            "is_required":null,
            "format":null,
            "special":["_includes/intro/optional"],
            "value":["accessibility"],
            "key":"optional_intro_sections"
        }
        const wrapper = await mount(
            YAMLField,
            {
                localVue,
                store: new Vuex.Store({modules: {workshop}}),
                propsData: { field, value: field.value }
            }
        )

        expect(wrapper.is(YAMLField)).toBe(true)
        await wrapper.vm.$nextTick()
        expect(wrapper.findAll('input[type="checkbox"]').length).toEqual(2)
        expect(workshop.actions.pullURL).toHaveBeenCalled()
    })


    it('mounts YAMLFieldInput for singletons', async () => {
        const field = {
            "name":"Workshop title",
            "type":"string",
            "help":"The title should let people know the most important information - where the workshop is and what it covers",
            "is_array":false,
            "is_required":true,
            "format":null,
            "special":null,
            "value":"Test Workshop",
            "key":"title"
        }
        const wrapper = shallowMount(
            YAMLField,
            {
                localVue,
                propsData: { field, value: field.value }
            }
        )

        expect(wrapper.is(YAMLField)).toBe(true)
        expect(wrapper.vm.value).toEqual(field.value)
        // We should have one input with a value and one empty input
        expect(wrapper.findComponent(YAMLFieldInput).exists()).toBe(true)
    })

    it('mounts YAMLFieldArray for arrays', async () => {
        const field = {
            "name":"Start time",
            "type":"time",
            "help":"Start times (in 0900 format) for each day of the workshop. If shorter than the number of days, remaining days will use the first entry",
            "is_array":true,
            "is_required":true,
            "format":"hours_minutes",
            "special":null,
            "value":["09|00"],
            "key":"start_times"
        }
        const wrapper = shallowMount(
            YAMLField,
            {
                localVue,
                propsData: { field, value: field.value }
            }
        )

        expect(wrapper.is(YAMLField)).toBe(true)
        expect(wrapper.vm.value).toEqual(field.value.map(v => v.replace(/\|/, '')))
        // We should have one input with a value and one empty input
        expect(wrapper.findComponent(YAMLFieldInputArray).exists()).toBe(true)
    })

    it('handles save events', async () => {
        const field = {
            "name":"Workshop title",
            "type":"string",
            "help":"The title should let people know the most important information - where the workshop is and what it covers",
            "is_array":false,
            "is_required":true,
            "format":null,
            "special":null,
            "value":"Test Workshop",
            "key":"title"
        }
        const wrapper = mount(
            YAMLField,
            {
                localVue,
                propsData: { field, value: field.value }
            }
        )

        const input = wrapper.findComponent(YAMLFieldInput)
        await input.get('input').setValue('New Title')
        await input.vm.$emit('blur')
    })
})
