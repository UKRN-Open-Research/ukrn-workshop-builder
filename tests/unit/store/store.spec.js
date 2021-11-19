import store from "../../../src/store/store.js"

describe('Basic store functionality', () => {
    it('initialises with sensible values', () => {
        expect(store.state.editingItem).toBeFalsy()
        expect(store.state.topicList instanceof Array).toBe(true)
        store.state.topicList.forEach(s => {
            expect(typeof s).toMatch('string')
        })
    })

    it('sets edit item', () => {
        const state = {}
        const item = {url: "https://foo.bar"}
        store.mutations.setEditItem(state, item)
        expect(state.editingItem).toEqual(item)
    })

})
