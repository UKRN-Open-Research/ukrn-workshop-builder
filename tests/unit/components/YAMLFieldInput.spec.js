import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import YAMLFieldInput from '@/components/YAMLFieldInput.vue'

const localVue = createLocalVue()
localVue.use(Buefy)

describe('YAMLFieldInput.vue', () => {
  it('handles topic input', async () => {
    const field = {
      "name":"Workshop topic",
      "type":"string",
      "help":"The topic is used to search for pre-existing lessons you can include in your workshop",
      "is_array":false,
      "is_required":true,
      "format":"topic",
      "special":null,
      "value":"open-access",
      "key":"topic"
    }
    const testVal = 'another topic'
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value },
          mocks: {
            $store: { state: {topicList: [field.value, 'x-y-z', testVal]}}
          }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    wrapper.get('input')
    const input = wrapper.get(`input[type="radio"][value="${testVal}"]`)
    await input.trigger('click')
    expect(wrapper.emitted().input[0]).toEqual([testVal])
  })

  it('handles iso-3166-1-alpha-2 (country) input', async () => {
    const field = {
      "name":"Workshop country",
      "type":"string",
      "help":"Country code for the institution that hosts the workshop",
      "is_array":null,
      "is_required":null,
      "format":"iso-3166-1-alpha-2",
      "special":null,
      "value":null,
      "key":"country"
    }
    const testVal = 'GB'
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    wrapper.get('select')
    const input = wrapper.get(`option[value="${testVal}"]`)
    await input.setSelected()
    expect(wrapper.emitted().input[0]).toEqual([testVal])
  })

  it('handles iso-639-1 (language) input', async () => {
    const field = {
      "name":"Workshop language",
      "type":"string",
      "help":"Language code for the language the workshop will be conducted in",
      "is_array":null,
      "is_required":null,
      "format":"iso-639-1",
      "special":null,
      "value":"en",
      "key":"language"
    }
    const testVal = 'mi'
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    wrapper.get('select')
    const input = wrapper.get(`option[value="${testVal}"]`)
    await input.setSelected()
    expect(wrapper.emitted().input[0]).toEqual([testVal])
  })

  it('handles long text input', async () => {
    const field = {
      "name":"Venue address",
      "type":"string",
      "help":"The full street address of workshop (e.g., \"Room A, 123 Forth Street, Blimingen, Euphoria\"), videoconferencing URL, or 'online'",
      "is_array":null,
      "is_required":null,
      "format":"long",
      "special":null,
      "value":null,
      "key":"address"
    }
    const testVal = 'Room A, 123 Forth Street, Blimingen, Euphoria'
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    const input = wrapper.get(`textarea`)
    await input.setValue(testVal)
    expect(wrapper.emitted().input[0]).toEqual([testVal])
  })

  it('handles short text input', async () => {
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
    const testVal = 'JEST University Workshop'
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    const input = wrapper.get(`input[type="text"]`)
    await input.setValue(testVal)
    expect(wrapper.emitted().input[0]).toEqual([testVal])
  })

  it('handles numeric input', async () => {
    const field = {
      "name":"Workshop latitude",
      "type":"number",
      "help":"Latitude of workshop venue (use <a href=\"https://www.latlong.net/\">https://www.latlong.net\"</a>)",
      "is_array":null,
      "is_required":null,
      "format":"latitude",
      "special":null,
      "value":178702,
      "key":"latitude"
    }
    const testVal = 202020
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    const input = wrapper.get(`input[type="number"]`)
    await input.setValue(testVal)
    expect(wrapper.emitted().input[0]).toEqual([testVal])
  })

  it('handles time input', async () => {
    const field = {
      "name":"Start time",
      "type":"time",
      "help":"Start times (in 0900 format) for each day of the workshop. If shorter than the number of days, remaining days will use the first entry",
      "is_array":true,
      "is_required":true,
      "format":"hours_minutes",
      "special":null,
      "value":"09|00",
      "key":"start_times"
    }
    const testVal = "12|00"
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    const input = wrapper.get(`input[type="text"]`)
    await input.setValue(testVal.replace(/|/, ''))
    expect(wrapper.emitted().input[0]).toEqual([testVal])
  })

  it('handles date input', async () => {
    const field = {
      "name":"Workshop start date",
      "type":"date",
      "help":"Date the workshop starts.",
      "is_array":null,
      "is_required":null,
      "format":"years-months-days",
      "special":null,
      "value":null,
      "key":"start_date"
    }
    const wrapper = mount(
        YAMLFieldInput,
        {
          localVue,
          propsData: { field, value: field.value }
        }
    )

    expect(wrapper.is(YAMLFieldInput)).toBe(true)
    expect(wrapper.props('value')).toBe(field.value)
    const input = wrapper.get('a[role="button"].is-selectable')
    await input.trigger('click')
    expect(wrapper.emitted().input[0][0] instanceof Date).toBe(true)
  })

  // Boolean input not currently used and therefore not tested
})
