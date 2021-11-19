import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import TextEditable from "@/components/TextEditable.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('TextEditable.vue', () => {

    it('allows editing', async () => {
        const wrapper = mount(
            TextEditable,
            {
                localVue
            }
        )

        expect(wrapper.is(TextEditable)).toBe(true)
        expect(wrapper.vm.value).toEqual(undefined)

        const span = wrapper.get('span.text')
        expect(span.element.attributes.contentEditable.value).toBe("true")
        await span.trigger('keydown', {key: 'q'})
        span.element.innerText = "new value"
        await span.trigger('blur')
        expect(wrapper.emitted().input[0]).toEqual(["new value"])
    })

    it('supports initial value', async () => {
        const wrapper = mount(
            TextEditable,
            {
                localVue,
                propsData: {value: "old Value"}
            }
        )

        expect(wrapper.is(TextEditable)).toBe(true)
        expect(wrapper.vm.value).toEqual("old Value")
    })

    it('can be disabled', async () => {
        const wrapper = mount(
            TextEditable,
            {
                localVue,
                propsData: {enabled: false}
            }
        )

        const span = wrapper.get('span.text')
        expect(span.element.attributes.contentEditable.value).toBe("false")

        await wrapper.setProps({enabled: true})
        expect(span.element.attributes.contentEditable.value).toBe("true")
    })

    it('handles enter key', async () => {
        const wrapper = mount(
            TextEditable,
            {
                localVue
            }
        )
        // Can't dispatch events on anything but the wrapper, so mock up keypress events
        const span = wrapper.get('span.text')
        wrapper.vm.keydown({target: span.element, key: 'a'})
        span.element.innerText = 'a'
        wrapper.vm.keydown({target: span.element, key: 'enter', preventDefault: () => {}})

        expect(wrapper.emitted().input[0]).toEqual(['a'])
    })
})
