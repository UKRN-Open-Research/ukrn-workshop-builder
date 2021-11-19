import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import YAMLFieldInputArray from '@/components/YAMLFieldInputArray.vue'

const localVue = createLocalVue()
localVue.use(Buefy)

describe('YAMLFieldInputArray.vue', () => {
    it('handles time input', async () => {
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
        const newVal = '12|00'
        const wrapper = mount(
            YAMLFieldInputArray,
            {
                localVue,
                propsData: { field, value: field.value }
            }
        )

        expect(wrapper.is(YAMLFieldInputArray)).toBe(true)
        expect(wrapper.props().value).toEqual(field.value)
        // We should have one input with a value and one empty input
        const inputs = wrapper.findAll('input')
        expect(inputs.length).toBe(2)
        // Enter newVal into empty space
        await inputs.wrappers[1].setValue(newVal.replace(/|/, ''))
        expect(wrapper.emitted().input[0]).toEqual([[field.value[0], newVal]])
    })
})
