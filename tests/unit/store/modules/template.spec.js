import fetchMock from "jest-fetch-mock";
import {
    testAction, TRIGGER_TYPE_MUTATION
} from "vue-test-actions";

import template from "../../../../src/store/modules/template"

describe('Template.state', () => {
    it('initialises with sensible values', () => {
        expect(template.state.master).toBe(null)
        expect(template.state.fetchInProgress).toBe(false)
        expect(template.state.errors instanceof Array).toBe(true)
    })
})

describe('Template.mutations', () => {
    it('setSearchFlag()', () => {
        const state = {}
        template.mutations.setSearchFlag(state, true)
        expect(state.fetchInProgress).toEqual(true)
    })

    it('setMaster()', () => {
        const state = {}
        template.mutations.setMaster(state, {})
        expect(state.master).toEqual({})
    })

    it('addError()', () => {
        const state = {errors: [new Error("first")]}
        template.mutations.addError(state, new Error("test error"))
        expect(state.errors.length).toBe(2)
    })
})

describe('Template.actions', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
    })
    afterEach(() => {
        fetchMock.disableMocks()
    })

    it('fetchTemplateMaster() quits if fetching already', async () => {
        const store = {
            // Getters cannot be functions for testAction()
            state: {fetchInProgress: true}
        }

        await testAction(
            template.actions.fetchTemplateMaster.handler,
            [],
            null,
            store
        )
    })

    it('fetchTemplateMaster() handles errors', async () => {
        const store = {
            state: {fetchInProgress: false}
        }

        fetchMock.mockRejectOnce(new Error('go away'))

        await testAction(
            template.actions.fetchTemplateMaster.handler,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setSearchFlag',
                        payload: true
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setSearchFlag',
                        payload: false
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('go away')
                    }
                }
            ],
            null,
            store
        )
    })

    it('fetchTemplateMaster() fetches', async () => {
        const store = {
            state: {fetchInProgress: false}
        }

        fetchMock.once(JSON.stringify({content: btoa("template")}))

        await testAction(
            template.actions.fetchTemplateMaster.handler,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setSearchFlag',
                        payload: true
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setSearchFlag',
                        payload: false
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setMaster',
                        payload: "template"
                    }
                }
            ],
            null,
            store
        )
    })
})
