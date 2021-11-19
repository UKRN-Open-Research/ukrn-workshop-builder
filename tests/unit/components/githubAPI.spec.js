const fetch = require('jest-fetch-mock');
jest.setMock('node-fetch', fetch);
// eslint-disable-next-line no-unused-vars
const GH = require('../../../src/lambda/githubAPI')
require('dotenv').config();
const Cryptr = require('cryptr');
const token = new Cryptr(process.env.GH_TOKEN_ENCRYPTION_KEY).encrypt('foobar')

describe('GitHubAPI', () => {
    let cb, ctx, event
    beforeEach(() => {
        cb = (e, r) => {
            if(e)
                throw(e)
            return r
        }
        ctx = {}
        event = {
            headers: {},
            body: {}
        }
        fetch.enableMocks()
        fetch.resetMocks()
    })
    afterEach(() => {
        fetch.disableMocks()
    })

    it('requires task header', async () => {
        await GH.main(event, ctx, e =>
            expect(e.message).toMatch('No githubAPI task specified')
        )
        event.headers.task = 'foobar'
        await GH.main(event, ctx, e =>
            expect(e.message).toMatch('Unrecognised githubAPI task')
        )
    })

    it('redeemCode', async () => {

        event.headers.task = 'redeemCode'
        event.headers['github-code'] = 'foobar'
        fetch.once(JSON.stringify({ access_token: 'abc123' }))
        await GH.main(event, ctx, () =>
            expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/github.com\/login\/oauth\/access_token\?client_id=[0-9a-f]{20}&client_secret=[0-9a-f]{40}&code=foobar$/)
        )
    })

    it('getUserDetails', async () => {

        event.headers.task = 'getUserDetails'
        event.body = JSON.stringify({token})
        fetch.once(JSON.stringify({}))
        await GH.main(event, ctx, () =>
            expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/api.github.com\/user$/)
        )
    })

    it('findRepositories', async () => {
        event.headers.task = 'findRepositories'
        event.body = JSON.stringify({
            token,
            topics: ['foo', 'bar'],
            owner: 'test-user'
        })
        fetch.once(JSON.stringify({items: []}))
        await GH.main(event, ctx, () =>
            expect(fetch.mock.calls[0][0]).toMatch("https://api.github.com/search/repositories?q=fork:true+topic:ukrn-open-research+user:test-user+topic:foo+topic:bar")
        )
    })

    it('findRepositoryFiles', async () => {
        event.headers.task = 'findRepositoryFiles'
        event.body = JSON.stringify({
            token,
            includeEpisodes: true,
            extraFiles: ['_config.yml'],
            url: "https://api.github.com/repos/test/repo"
        })
        fetch.once(JSON.stringify([
            {type: "file", name: "_config.yml"},
            {type: "file", name: "index.md", url: "https://api.github.com/repos/test/repo/contents/index.md"}
        ])) // _episodes/
            .once(JSON.stringify([])) // _episodes_rmd/
            .once(JSON.stringify([])) // _includes/install_instructions/
            .once(JSON.stringify([])) // _includes/intro/optional/
            .once(JSON.stringify({x: 1})) // contents/_config.yml
            .once(JSON.stringify({x: 2})) // contents/index.md
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls.filter(c => /repos\/test\/repo\//.test(c[0])).length).toEqual(6)
        })
    })

    it('createRepository', async () => {
        event.headers.task = 'createRepository'
        event.body = JSON.stringify({
            token,
            template: 'foobar',
            name: 'new-ws'
        })
        fetch.once(JSON.stringify({url: 'foobar'}), {status: 201})
            .once(JSON.stringify({}))
            .once(JSON.stringify({}))
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls[0][0]).toMatch("https://api.github.com/repos/foobar/generate")
            expect(fetch.mock.calls[1][0]).toMatch("foobar/topics")
            expect(fetch.mock.calls[2][0]).toMatch("foobar")
        })
    })

    it('pushFile', async () => {
        event.headers.task = 'pushFile'
        event.body = JSON.stringify({
            token,
            content: 'some base64 string',
            url: "https://api.github.com/repos/test/repo/contents/_episodes/ep01.md",
            path: "_episodes/ep01.md",
            sha: "someSHA"
        })
        fetch.once(JSON.stringify({content: {url: 'foobar'}}))
            .once(JSON.stringify({}))
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls[0][0]).toMatch("https://api.github.com/repos/test/repo/contents/_episodes/ep01.md")
            expect(fetch.mock.calls[1][0]).toMatch("foobar")
        })
    })

    it('setTopics', async () => {
        event.headers.task = 'setTopics'
        event.body = JSON.stringify({
            token,
            topics: {'new-topic': true, 'old-topic': true},
            url: "https://api.github.com/repos/test/repo"
        })
        fetch.once(JSON.stringify({names: ['old-topic']})) // getTopics
            .once(JSON.stringify({})) // Send topic list
            .once(JSON.stringify({})) // getTopics
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls[0][0]).toMatch("https://api.github.com/repos/test/repo/topics")
            expect(fetch.mock.calls[1][0]).toMatch("https://api.github.com/repos/test/repo/topics")
            expect(fetch.mock.calls[2][0]).toMatch("https://api.github.com/repos/test/repo/topics")
        })
    })

    it('copyFile', async () => {
        event.headers.task = 'copyFile';
        const body = {
            token,
            returnExisting: true,
            newURL: "https://api.github.com/repos/new/repo",
            url: "https://api.github.com/repos/test/repo"
        };
        event.body = JSON.stringify(body);
        fetch.once(JSON.stringify({content: "something"}))
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls[0][0]).toMatch(body.newURL)
        })
        body.returnExisting = false;
        event.body = JSON.stringify(body);
        fetch.once(JSON.stringify({content: "something", path: "", url: body.newURL}))
            .once(JSON.stringify({content: {url: body.newURL}})) // pushFile
            .once(JSON.stringify({})) // pushFile
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls[1][0]).toMatch(body.url)
            expect(fetch.mock.calls[2][0]).toMatch(body.newURL)
            expect(fetch.mock.calls[2][0]).toMatch(body.newURL)
        })
    })

    it('deleteFile', async () => {
        event.headers.task = 'deleteFile';
        const body = {
            token,
            url: "https://api.github.com/repos/test/repo"
        };
        event.body = JSON.stringify(body);
        fetch.once(JSON.stringify({url: body.url, path: "...", sha: "123"}))
            .once(JSON.stringify({}))
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls[0][0]).toMatch(body.url)
            expect(fetch.mock.calls[1][0]).toMatch(body.url)
        })
    })

    it('getLastBuild', async () => {
        event.headers.task = 'getLastBuild';
        const body = {
            token,
            url: "https://api.github.com/repos/test/repo"
        };
        event.body = JSON.stringify(body);
        fetch.once(JSON.stringify({}))
        await GH.main(event, ctx, () => {
            expect(fetch.mock.calls[0][0]).toMatch(`${body.url}/pages/builds/latest`)
        })
    })
})

