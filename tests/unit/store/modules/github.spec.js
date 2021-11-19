import fetchMock from "jest-fetch-mock";
import {
    testAction, TRIGGER_TYPE_MUTATION, TRIGGER_TYPE_DISPATCH
} from "vue-test-actions";

import github from "../../../../src/store/modules/github"

describe('Github.state', () => {
    it('initialises with sensible values', () => {
        expect(github.state.user instanceof Object).toBe(true)
        expect(github.state.errors instanceof Array).toBe(true)
        expect(github.state.loginInProgress).toBe(false)
        expect(github.state.buildStatusChecks instanceof Array).toBe(true)
        expect(github.state.lastBuildStatusCheck).toBe(null)
        expect(github.state.buildStatus).toBe(null)
    })
})

describe('Github.getters', () => {
    it('finds lastError', () => {
        const state = {errors: [{message: "Not found", code: 404}]}
        expect(github.getters.lastError(state)).toEqual(state.errors[0])
        state.errors.push({message: "Still broken", code: 9999})
        expect(github.getters.lastError(state)).toEqual(state.errors[1])
        state.errors = []
        expect(github.getters.lastError(state)).toEqual(null)
    })

    it('detects login', () => {
        const state = {user: {login: "testUser"}}
        expect(github.getters.login(state)).toMatch("testUser")
    })

    it('detects login in progress', () => {
        expect(github.getters.loginInProgress(github.state)).toBe(false)
        const state = {loginInProgress: true}
        expect(github.getters.loginInProgress(state)).toBe(true)
    })

    it('detects login code', () => {
        delete window.location
        window.location = {search: "https://foo.bar?search=true&code=C0D3D"}
        expect(github.getters.code()).toMatch('C0D3D')
    })

    it('detects login token', () => {
        delete window.location
        window.location = {search: "https://foo.bar?search=true&code=long_login_token"}
        expect(github.getters.code()).toMatch('long_login_token')
    })
})

describe('Github.mutations', () => {
    it('sets user', () => {
        const state = {}
        github.mutations.setUser(state, {login: "testUser"})
        expect(state.user).toEqual({login: 'testUser'})
    })

    it('sets login flag', () => {
        const state = {}
        github.mutations.setLoginFlag(state, true)
        expect(state.loginInProgress).toEqual(true)
    })

    it('handles build status checks', () => {
        const state = {buildStatusChecks: []}
        github.mutations.addBuildStatusCheck(state, "testCheck")
        expect(state.buildStatusChecks.length).toBe(1)
        github.mutations.removeBuildStatusCheck(state)
        expect(state.buildStatusChecks.length).toBe(0)
    })

    it('updates build status', () => {
        const state = {buildStatus: null}
        github.mutations.updateBuildStatus(state, "built")
        expect(state.buildStatus).toMatch('built')
    })

    it('records errors', () => {
        const state = {errors: []}
        github.mutations.addError(state, {message: "oops"})
        expect(state.errors.length).toBe(1)
    })
})

describe('Github.actions', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
    })
    afterEach(() => {
        fetchMock.disableMocks()
    })

    it('logout()', () => {
        delete window.location
        window.location = {href: "https://foo.bar?token=abc123"}
        github.actions.logout()
        expect(window.location).toMatch("https://foo.bar?logout=true")
    })

    it('redeemCode() requires code',  async () => {
        const store = {
            // Getters cannot be functions for testAction()
            getters: {
                code: "",
                loginInProgress: false
            }
        }

        await testAction(
            github.actions.redeemCode, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: 'Cannot login with empty code'
                    }
                }
            ], // expected events
            null, // payload
            store // mock store
        )
    })

    it('redeemCode() obtains token', async () => {
        const store = {
            // Getters cannot be functions for testAction()
            getters: {
                code: "abc",
                loginInProgress: false
            }
        }

        fetchMock.once(JSON.stringify({ access_token: 'abc123' }))

        await testAction(
            github.actions.redeemCode, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: true
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'processToken',
                        payload: 'abc123'
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: false
                    }
                }
            ], // expected events
            null, // payload
            store // mock store
        )
    })

    it('redeemCode() logs out on error',  async() => {
        const store = {
            // Getters cannot be functions for testAction()
            getters: {
                code: "abc",
                loginInProgress: false
            }
        }

        fetchMock.once(JSON.stringify({}))

        await testAction(
            github.actions.redeemCode, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: true
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error("Response had no token.")
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: false
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'logout'
                    }
                }
            ], // expected
            null, // payload
            store // mock store
        )
    })

    it('processToken()', async () => {
        delete window.location
        window.location = {href: "https://foo.bar/"}
        await testAction(
            github.actions.processToken,
            [],
            'abc123'
        )
        expect(window.location).toMatch("https://foo.bar/?logout=false&token=abc123")
    })

    it('getUserDetails() logs out on error', async () => {
        const store = {
            // Getters cannot be functions for testAction()
            getters: {token: "abc123"}
        }
        fetchMock.mockRejectOnce(new Error('go away'))

        await testAction(
            github.actions.getUserDetails, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: true
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error("go away")
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: false
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'logout'
                    }
                }
            ], // expected store events
            null,
            store
        )
    })

    it('getUserDetails() fetches details', async () => {
        const store = {
            // Getters cannot be functions for testAction()
            getters: {
                token: "abc123",
                login: "testUser"
            }
        }
        fetchMock.once(JSON.stringify({}))

        await testAction(
            github.actions.getUserDetails, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: true
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setUser',
                        payload: {}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setLoginFlag',
                        payload: false
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'workshop/findRepositories',
                        payload: {owner: "testUser"},
                        options: {root: true}
                    }
                }
            ], // expected store triggers
            null,
            store
        )
    })

    it('registerBuildCheck() respects later checks', async () => {
        const store = {
            // Getters cannot be functions for testAction()
            state: {
                buildStatusChecks: [Infinity]
            }
        }

        await testAction(
            github.actions.registerBuildCheck, // action
            [], // expected
            {delay: 180000},
            store
        )
    })

    it('registerBuildCheck() registers checks', async () => {
        const store = {
            // Getters cannot be functions for testAction()
            state: {
                buildStatusChecks: [100]
            }
        }

        const timeout = await testAction(
            github.actions.registerBuildCheck, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addBuildStatusCheck',
                        payload: 200
                    }
                }
            ], // expected
            {delay: 100},
            store
        )
        clearTimeout(timeout)
    })

    it('getBuildStatus() handles errors', async() => {
        const store = {
            rootGetters: {
                "workshop/Repository": () => "https://foo.bar"
            },
            getters: {token: "abc123"}
        }
        fetchMock.mockRejectOnce(new Error('go away'))

        await testAction(
            github.actions.getBuildStatus, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'removeBuildStatusCheck'
                    }

                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('go away')
                    }

                }
            ], // expected
            null,
            store
        )
    })

    it('getBuildStatus()', async() => {
        const store = {
            rootGetters: {
                "workshop/Repository": () => "https://foo.bar"
            },
            getters: {token: "abc123"}
        }
        fetchMock.once(JSON.stringify({}))

        await testAction(
            github.actions.getBuildStatus, // action
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'removeBuildStatusCheck'
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'updateBuildStatus',
                        payload: {}
                    }
                }
            ], // expected
            null,
            store
        )
    })
})
