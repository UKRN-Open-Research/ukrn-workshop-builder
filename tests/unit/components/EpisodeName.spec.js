import { mount, createLocalVue } from '@vue/test-utils'
import Buefy from "buefy";
import Vuex from "vuex";
import EpisodeName from "@/components/EpisodeName.vue";

const localVue = createLocalVue()
localVue.use(Buefy)
localVue.use(Vuex)

describe('EpisodeName.vue', () => {
    const episode = {
        url: 'https://api.github.com/repos/testuser/test-repo',
        yaml: {
            title: 'Test Episode'
        }
    }

    it('includes repo by default', async () => {
        const wrapper = mount(
            EpisodeName,
            {
                localVue,
                propsData: {episode}
            }
        )

        expect(wrapper.is(EpisodeName)).toBe(true)
        expect(wrapper.element.innerHTML).toContain('Test Episode')
        expect(wrapper.get('span.repository').element.innerHTML).toContain('testuser / test-repo')
    })

    it('includes repo by default', async () => {
        const wrapper = mount(
            EpisodeName,
            {
                localVue,
                propsData: {episode, includeRepo: false}
            }
        )

        expect(wrapper.is(EpisodeName)).toBe(true)
        expect(wrapper.element.innerHTML).toContain('Test Episode')
        expect(wrapper.element.innerHTML).not.toContain('testuser')
        expect(wrapper.element.innerHTML).not.toContain('test-repo')
    })

    it('handles bad URLs', async () => {
        episode.url = ""
        const wrapper = mount(
            EpisodeName,
            {
                localVue,
                propsData: {episode}
            }
        )

        expect(wrapper.is(EpisodeName)).toBe(true)
        expect(wrapper.element.innerHTML).toContain('Test Episode')
        expect(wrapper.element.innerHTML).not.toContain('testuser')
        expect(wrapper.element.innerHTML).not.toContain('test-repo')
    })
})
