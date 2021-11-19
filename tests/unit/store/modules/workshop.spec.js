import fetchMock from "jest-fetch-mock";
import {
    testAction, TRIGGER_TYPE_MUTATION, TRIGGER_TYPE_DISPATCH
} from 'vue-test-actions'

import workshop from "../../../../src/store/modules/workshop"

describe('Workshop.state', () => {
    it('initialises with sensible values', () => {
        expect(workshop.state.repositories instanceof Array).toBe(true);
        expect(workshop.state.files instanceof Array).toBe(true);
        expect(workshop.state.errors instanceof Array).toBe(true);
        expect(workshop.state.busyFlags instanceof Array).toBe(true)
    })
});

describe('Workshop.mutations', () => {
    it('setItem() updates existing items', () => {
        const state = {
            files: [
                {url: "https://foo.bar/test/workshop", title: "Test workshop"},
                {url: "https://foo.bar/some/other", title: "Foobar"}
            ]
        };
        workshop.mutations.setItem(state, {array: 'files', item: {
                url: state.files[0].url, title: "New Title"
            }});
        expect(state.files[0].title).toEqual("New Title")
    });

    it('setItem() creates new items', () => {
        const state = {
            files: [
                {url: "https://foo.bar/some/other", title: "Foobar"}
            ]
        };
        const item = {
            url: "https://foo.bar/test/workshop", title: "Test workshop"
        };
        workshop.mutations.setItem(state, {array: 'files', item});
        expect(state.files[1]).toEqual(item)
    });

    it('removeItem() removes items', () => {
        const state = {
            files: [
                {url: "https://foo.bar/test/workshop", title: "Test workshop"},
                {url: "https://foo.bar/some/other", title: "Foobar"}
            ]
        };

        workshop.mutations.removeItem(state, {array: 'files', item: state.files[0]});
        expect(state.files[0].title).toEqual("Foobar")
    });

    it('setBusyFlag()', () => {
        const state = {
            busyFlags: [
                "https://foo.bar/test/workshop",
                "https://foo.bar/some/other"
            ]
        };

        workshop.mutations.setBusyFlag(state, {
            flag: "https://foo.bar/test/workshop", value: false
        });
        expect(state.busyFlags.length).toEqual(1);
        workshop.mutations.setBusyFlag(state, {
            flag: "https://foo.bar/test/workshop", value: true
        });
        expect(state.busyFlags.length).toEqual(2)
    });

    it('setMainRepository() requires known repo', () => {
        const state = {
            repositories: [
                {url: "https://foo.bar/test/workshop"},
                {url: "https://foo.bar/some/other"}
            ]
        };

        expect(() => workshop.mutations.setMainRepository(state, {url: ""}))
            .toThrow(new Error("Cannot set unknown repository as main: "))
    });

    it('setMainRepository() sets main repo', () => {
        const state = {
            repositories: [
                {url: "https://foo.bar/test/workshop"},
                {url: "https://foo.bar/some/other"}
            ]
        };

        workshop.mutations.setMainRepository(state, {url: "https://foo.bar/some/other"});
        expect(state.repositories.length).toBe(2);
        expect(state.repositories.filter(r => r.isMain).length).toBe(1)
    });

    it('addError()', () => {
        const state = {errors: []};

        workshop.mutations.addError(state, new Error('Test'));
        expect(state.errors.length).toBe(1)
    })
});

describe('Workshop.getters', () => {
    let state, getters;
    beforeEach(() => {
        state = {
            files: [
                {url: "https://foo.bar/test/workshop/_episodes/test-episode.md", title: "Test lesson", path: "_episodes/test-episode.md", yaml: {}},
                {url: "https://foo.bar/test/workshop/_config.yml", title: "Config", path: "_config.yml", yaml: {title: 'Test workshop', topic: 'test-topic', setup_files: '_includes/install_instructions/test-install.html'}},
                {url: "https://foo.bar/test/workshop/_includes/install_instructions/test-install.html", title: "Install Test program", path: "_includes/install_instructions/test-install.html", yaml: {}},
                {url: "https://foo.bar/test/workshop/_episodes/another-test-episode.md", title: "Another Test lesson", path: "_episodes/another-test-episode.md", yaml: {}},
                {url: "https://foo.bar/some/other/file.md", title: "Foobar", yaml: {}}
            ],
            repositories: [
                {url: "https://foo.bar/test/workshop", title: "Test workshop", isMain: true},
                {url: "https://foo.bar/some/other", title: "Foobar workshop"}
            ]
        };
        // Turn getters into functions
        getters = {};
        for(const g in workshop.getters) {
            getters[g] = x => workshop.getters[g](state, getters)(x)
        }
    });

    it('File() errors on unknown URL', () => {
        expect(() => workshop.getters.File(state)('https://badURL.tld'))
            .toThrow(new Error("Store has no file with URL: https://badURL.tld"))
    });

    it('File() constructs a File', () => {
        const file = workshop.getters.File(state)(state.files[0].url);
        expect(file).toHaveProperty('url', state.files[0].url);
        expect(file).toHaveProperty('title', state.files[0].title);
        expect(file).toHaveProperty('busyFlag');
        expect(file).toHaveProperty('hasChanged')
    });

    it('FilesByFilter()', () => {
        expect(workshop.getters.FilesByFilter(state, workshop.getters)(
            f => f.url === state.files[0].url
        ).length).toBe(1);
        expect(workshop.getters.FilesByFilter(state, workshop.getters)(
            () => false
        ).length).toBe(0);
        expect(workshop.getters.FilesByFilter(state, workshop.getters)(
            f => typeof f.title === 'string'
        ).length).toBe(state.files.length)
    });

    it('Repository() returns a Repository', () => {
        const repo = workshop.getters.Repository(state, getters)(state.repositories[0].url);
        expect(repo).toHaveProperty('url', state.repositories[0].url);
        expect(repo).toHaveProperty('title', state.repositories[0].title);
        expect(repo.files instanceof Array).toBe(true);
        expect(repo.episodes instanceof Array).toBe(true);
        expect(repo).toHaveProperty('episode_template');
        expect(repo.config instanceof Object).toBe(true);
        expect(repo.extraFiles instanceof Object).toBe(true);
        expect(repo).toHaveProperty('busyFlag')
    });

    it('Repository() returns main repo by default', () => {
        expect(workshop.getters.Repository(state, getters)().isMain).toBe(true)
    });

    it('RepositoriesByFilter() returns repo objects', () => {
        const repos = workshop.getters.RepositoriesByFilter(state, getters)(
            r => r.isMain
        );
        expect(repos.length).toBe(1);
        expect(JSON.stringify(repos[0]))
            .toMatch(JSON.stringify(workshop.getters.Repository(state, getters)()))
    });

    it('isBusy()', () => {
        state.busyFlags = [state.files[0].url];
        expect(workshop.getters.isBusy(state)(state.files[1].url)).toBe(false);
        expect(workshop.getters.isBusy(state)(state.files[0].url)).toBe(true)
    });

    it('hasChanged()', () => {
        state.files[0].content = "abc";
        state.files[0].remoteContent = "xyz";
        expect(workshop.getters.hasChanged(state, getters)(state.files[0].url)).toBe(true);
        expect(workshop.getters.hasChanged(state, getters)(state.files[1].url)).toBe(false)
    });

    it('lastError()', () => {
        state.errors = [];
        expect(workshop.getters.lastError(state)).toBe(null);
        state.errors.push(new Error("no"));
        expect(workshop.getters.lastError(state)).toEqual(new Error("no"))
    });

    it('listConfigErrors()', () => {
        state.files.push({url: "x"});
        const f = () => state.files.filter(f => f.url === "x")[0];
        expect(() => workshop.getters.listConfigErrors(state)({url: "badURL"})).toThrow(new Error("Cannot determine validity of unknown config: badURL"));
        expect(workshop.getters.listConfigErrors(state)(f())).toEqual({
            yaml: "The config must have YAML content signified by ---"
        });

        f().yaml = {};
        expect(workshop.getters.listConfigErrors(state)(f())).toEqual({
            title: "The title cannot be blank",
            topic: "The topic cannot be empty"
        });
        f().yaml.topic = "X";
        f().yaml.title = "X";
        expect(workshop.getters.listConfigErrors(state)(f())).toEqual({})
    });

    it('isConfigValid()', () => {
        const config = state.files.filter(f => f.path === "_config.yml")[0];
        expect(workshop.getters.isConfigValid(state, getters)(config)).toBe(true)
    })
});

describe('Workshop.actions', () => {
    let state, getters, rootGetters;
    beforeEach(() => {
        fetchMock.enableMocks();
        fetchMock.resetMocks();
        state = {
            files: [
                {
                    url: "https://api.github.com/repos/test/workshop/contents/_episodes/test-episode.md",
                    title: "Test lesson",
                    path: "_episodes/test-episode.md",
                    yaml: {}, content: ""
                },
                {
                    url: "https://api.github.com/repos/test/workshop/contents/_config.yml",
                    title: "Config", path: "_config.yml", content: "",
                    yaml: {
                        title: 'Test workshop', topic: 'test-topic',
                        setup_files: '_includes/install_instructions/test-install.html'
                    }
                },
                {
                    url: "https://api.github.com/repos/test/workshop/contents/_includes/install_instructions/test-install.html",
                    title: "Install Test program",
                    path: "_includes/install_instructions/test-install.html",
                    yaml: {}
                },
                {
                    url: "https://api.github.com/repos/test/workshop/contents/_episodes/another-test-episode.md",
                    title: "Another Test lesson",
                    path: "_episodes/another-test-episode.md",
                    yaml: {}
                },
                {
                    url: "https://api.github.com/repos/some/other/contents/_episodes/test-episode.md",
                    title: "Foobar",
                    yaml: {},
                    path: "_episodes/test-episode.md"
                }
            ],
            repositories: [
                {
                    url: "https://api.github.com/repos/test/workshop",
                    name: "Test workshop", ownerLogin: 'testUser',
                    topics: ['foobar', 'test-topic'],
                    isMain: true
                },
                {
                    url: "https://api.github.com/repos/some/other",
                    name: "Foobar workshop", ownerLogin: 'anotherUser',
                    topics: ['foobar']
                }
            ],
            busyFlags: []
        };
        // Turn getters into functions
        getters = {};
        for(const g in workshop.getters) {
            getters[g] = x => workshop.getters[g](state, getters)(x)
        }
        rootGetters = {'github/token': "abc123"}
    });
    afterEach(() => {
        fetchMock.disableMocks()
    });

    it('addRepository() adds new repos', async () => {
        const repo = {
            url: "https://new.repo/",
            ownerLogin: "anotherUser",
            name: "New Workshop",
            topics: "test-topic"
        };
        await testAction(
            workshop.actions.addRepository,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: "setItem",
                        payload: {
                            array: 'repositories', item: {...repo, isMain: false}
                        }
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {
                            flag: repo.url,
                            value: false
                        }
                    }
                }
            ],
            repo,
            {state, getters}
        )
    });

    it('addFile()', async () => {
        const file = {
            url: "https://new.repo/file.md",
            content: btoa("---\ntest: yes\n---\nTest content"),
            path: "file.md",
            sha: "xxx"
        };
        await testAction(
            workshop.actions.addFile,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setItem',
                        payload: {
                            array: 'files',
                            item: {
                                ...file,
                                content: atob(file.content),
                                remoteContent: atob(file.content),
                                body: "\nTest content",
                                yaml: {test: "yes"},
                                yamlParseError: null
                            }
                        }
                    }
                }
            ],
            file,
            {state, getters}
        )
    });

    it('addFile() allows overwrite', async () => {
        const file = {
            url: state.files[0].url,
            content: btoa("---\ntest: yes\n---\nTest content"),
            path: "file.md",
            sha: "xxx"
        };
        await testAction(
            workshop.actions.addFile,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setItem',
                        payload: {
                            array: 'files',
                            item: {
                                ...file,
                                content: atob(file.content),
                                remoteContent: atob(file.content),
                                body: "\nTest content",
                                yaml: {test: "yes"},
                                yamlParseError: null
                            }
                        }
                    }
                }
            ],
            {...file, overwrite: true},
            {state, getters}
        )
    });

    it('setFileContent()', async () => {
        const file = {
            url: state.files[0].url,
            content: "---\ntest: yes\n---\nTest content"
        };
        await testAction(
            workshop.actions.setFileContent,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setItem',
                        payload: {
                            array: 'files',
                            item: {
                                ...state.files[0],
                                content: file.content,
                                body: "\nTest content",
                                yaml: {test: "yes"},
                                yamlParseError: null
                            }
                        }
                    }
                }
            ],
            file,
            {state, getters}
        )
    });

    it('setFileContentFromYAML()', async () => {
        const req = {
            url: state.files[0].url,
            yaml: {test: "yes"},
            body: "\nTest content"
        };
        await testAction(
            workshop.actions.setFileContentFromYAML,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'setFileContent',
                        payload: {
                            url: req.url,
                            content: "---\ntest: yes\n\n---\nTest content"
                        }
                    }
                }
            ],
            req,
            {state, getters}
        )
    });

    it('duplicateFile()', async () => {
        const f = {url: state.files[0].url};
        const fun = jest.fn();
        await testAction(
            workshop.actions.duplicateFile,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setItem',
                        payload: {
                            array: 'files',
                            item: {
                                ...state.files[0],
                                body: null,
                                path: state.files[0].path.replace('.md', '_1.md'),
                                url: state.files[0].url.replace('.md', '_1.md'),
                                yaml: null,
                                yamlParseError: null,
                                remoteContent: ""
                            }
                        }
                    }
                }
            ],
            f,
            {state, getters: {...getters, File: fun}}
        );
        expect(fun).toHaveBeenCalledWith(state.files[0].url.replace('.md', '_1.md'))
    });


    it('pushFile()', async () => {
        const f = state.files.filter(f => f.path === "_config.yml")[0];
        f.yaml.topic = "new-topic";
        state.busyFlags = [f.url];
        expect(await testAction(workshop.actions.pushFile, [], f, {state, getters})).toBe(null);

        state.busyFlags = [];
        fetchMock.once(JSON.stringify({url: f.url, sha: "xxx", path: "_x/y.z"}));
        await testAction(
            workshop.actions.pushFile,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: f.url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addFile',
                        payload: {url: f.url, sha: "xxx", path: "_x/y.z", overwrite: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: f.url, value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'setTopics',
                        payload: {topics: ['new-topic']}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'github/registerBuildCheck',
                        payload: {},
                        options: {root: true}
                    }
                }
            ],
            {url: f.url},
            {state, getters, rootGetters}
        )
    });

    it('uploadImage()', async () => {
        fetchMock
            .once(JSON.stringify({sha: "xxx"}))
            .once(JSON.stringify({sha: "xxx"}));
        await testAction(
            workshop.actions.uploadImage,
            [],
            {path: "", file: {miniurl: "data:blah/blah;base64,etc"}},
            {state, getters, rootGetters}
        );
        fetchMock.mockResponses(
            [JSON.stringify({sha: "xxx"}), { status: 200 }],
            [JSON.stringify({message: "X"}), { status: 499, statusText: "testReject" }]
        );
        await testAction(
            workshop.actions.uploadImage,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error("uploadImage(abc) received testReject (499)")
                    }
                }
            ],
            {path: "abc", file: {miniurl: "data:blah/blah;base64,etc"}},
            {state, getters, rootGetters}
        )
    });

    it('pullURL()', async () => {
        fetchMock.once(JSON.stringify({}));
        expect(await testAction(
            workshop.actions.pullURL,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {
                            flag: "url",
                            value: false
                        }
                    }
                }
            ],
            {url: "url"},
            {state, getters, rootGetters}
        )).toEqual({});
        fetchMock.mockReject(new Error('no'));
        expect(await testAction(
            workshop.actions.pullURL,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('no')
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {
                            flag: "url",
                            value: false
                        }
                    }
                }
            ],
            {url: "url"},
            {state, getters, rootGetters}
        )).toBe(null)
    });

    it('createRepository()', async () => {
        fetchMock.mockReject(new Error('no'));
        expect(await testAction(
            workshop.actions.createRepository,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "createRepository", value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('no')
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "createRepository", value: false}
                    }
                }
            ],
            {name: "newRepo", template: "template"},
            {state, getters, rootGetters}
        )).toBe(null);

        fetchMock.once(JSON.stringify({
            url: "https://etc.x/", name: "testR", owner: {login: "test"}, topics: []
        }));
        expect(JSON.stringify(await testAction(
            workshop.actions.createRepository,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "createRepository", value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addRepository',
                        payload: {
                            url: "https://etc.x/", name: "testR", ownerLogin: "test", topics: [], isMain: true
                        }
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'findRepositoryFiles',
                        payload: {url: getters.Repository().url}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "createRepository", value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'github/registerBuildCheck',
                        payload: {},
                        options: {root: true}
                    }
                }
            ],
            {name: "newRepo", template: "template"},
            {state, getters, rootGetters}
        ))).toMatch(JSON.stringify(getters.Repository()))
    });

    it('findRepositories()', async () => {
        fetchMock.mockReject(new Error('no'));
        expect(await testAction(
            workshop.actions.findRepositories,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "findRepositories", value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('no')
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "findRepositories", value: false}
                    }
                }
            ],
            {topics: [], owner: ""},
            {state, getters, rootGetters}
        )).toBe(null);

        fetchMock.once(JSON.stringify(state.repositories.map(r => {
            return {
                ...r, owner: {login: r.ownerLogin}
            }
        })));
        const r = state.repositories.filter(r => !r.isMain)[0];
        expect(JSON.stringify(await testAction(
            workshop.actions.findRepositories,
            [
                {
                    t:{
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "findRepositories", value: true}
                    }
                },
                {
                    t:{
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addRepository',
                        payload: r
                    }
                },
                {
                    t:{
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: "findRepositories", value: false}
                    }
                }
            ],
            {topics: [], owner: ""},
            {state, getters, rootGetters}
        ))).toMatch(JSON.stringify(getters.RepositoriesByFilter(() => true)))
    });

    it('findRepositoryFiles()', async () => {
        const url = state.repositories[1].url;
        fetchMock.mockReject(new Error('no'));
        expect(await testAction(
            workshop.actions.findRepositoryFiles,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('no')
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters, rootState: {topicList: []}}
        )).toBe(null);

        const files = [
            {url: "file1", content: "", sha: "xxx", path: "file1.md"},
            {url: "file2", content: "", sha: "xxx", path: "file2.md"},
            {url: "file3", content: "", sha: "xxx", path: "file3.md"}
        ];
        fetchMock.once(JSON.stringify(files));
        expect(JSON.stringify(await testAction(
            workshop.actions.findRepositoryFiles,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true},
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addFile',
                        payload: {...files[0], overwrite: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addFile',
                        payload: {...files[1], overwrite: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addFile',
                        payload: {...files[2], overwrite: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters, rootState: {topicList: []}}
        ))).toMatch(JSON.stringify(getters.Repository(url)))
    });


    it('setTopics()', async () => {
        const topics = ['a-topic', 'another-topic'];
        const url = getters.Repository().url;
        fetchMock.mockReject(new Error('no'));
        expect(await testAction(
            workshop.actions.setTopics,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {
                            flag: url,
                            value: true
                        }
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('no')
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {
                            flag: url,
                            value: false
                        }
                    }
                }
            ],
            {topics},
            {state, getters, rootGetters, rootState: {topicList: topics}}
        )).toBe(null);

        fetchMock.once(JSON.stringify(topics));
        await testAction(
            workshop.actions.setTopics,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {
                            flag: url,
                            value: true
                        }
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setItem',
                        payload: {
                            array: 'repositories',
                            item: {
                                ...state.repositories.filter(r => r.isMain)[0],
                                topics
                            }
                        }
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'findRepositories',
                        payload: {topics}
                    }
                }
            ],
            {topics},
            {state, getters, rootGetters, rootState: {topicList: topics}}
        )
    });

    it('saveRepositoryChanges()', async () => {
        state.files = state.files.map(f => {
            return {...f, content: "abc", remoteContent: "xyz"}
        });
        const dispatches = workshop.getters.Repository(state, getters)().files.map(
            f => {return { t:{
                type: TRIGGER_TYPE_DISPATCH,
                name: 'pushFile',
                payload: {url: f.url}
            }}}
        );
        const call = await testAction(
            workshop.actions.saveRepositoryChanges,
            dispatches,
            null,
            {state, getters}
        );
        expect(JSON.stringify(call)).toMatch(JSON.stringify({
            successes: dispatches.length, failures: 0
        }))
    });

    it('loadRepository()', async () => {
        const url = state.repositories[1].url;
        fetchMock.mockRejectOnce(new Error('test error'));
        expect(await testAction(
            workshop.actions.loadRepository,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('test error')
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters}
        )).toBeNull();

        const resp = state.repositories[0];
        fetchMock.once(JSON.stringify(resp));

        const call = await testAction(
            workshop.actions.loadRepository,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addRepository',
                        payload: resp
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setMainRepository',
                        payload: {url}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters}
        );
        expect(JSON.stringify(call))
            .toMatch(JSON.stringify(workshop.getters.Repository(state, getters)(url)))
    });

    it('installFile()', async () => {
        const url = "https://api.github.com/repos/some/other/contents/_episodes/test-episode.md";
        state.files.filter(f => f.url === url)[0].content = ""
        const newURL = "https://api.github.com/repos/test/workshop/contents/_episodes/test-episode_1.md"
        const F = workshop.getters.File(state, getters)(url)
        const newF = {
            ...F,
            url: "https://api.github.com/repos/test/workshop/contents/_episodes/test-episode_1.md",
            path: "_episodes/test-episode_1.md"
        }

        const call = await testAction(
            workshop.actions.installFile,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addFile',
                        payload: {
                            url: newURL,
                            content: btoa(F.content),
                            sha: null,
                            path: "_episodes/test-episode_1.md"
                        }
                    },
                    callback: () => {
                        state.files.push(newF)
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: newURL, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'setFileContentFromYAML',
                        payload: {
                            ...newF,
                            yaml: {
                                missingDependencies: [],
                                dependencies: [],
                                originalRepository: "some/other"
                            }
                        }
                    },
                    check_function: (e, r) =>
                        expect(JSON.stringify(e)).toMatch(JSON.stringify(r))
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'installDependencies',
                        payload: {url: newURL}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: newURL, value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'pushFile',
                        payload: {url: newURL}
                    },
                    callback: () => F
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: newURL, value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'removeItem',
                        payload: {array: 'files', item: {url: url}}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters}
        );
        expect(JSON.stringify(call))
            .toMatch(JSON.stringify(getters.File(url)))
    })

    it('installFile() handles push error', async () => {
        const url = "https://api.github.com/repos/some/other/contents/_episodes/test-episode.md";
        state.files.filter(f => f.url === url)[0].content = ""
        const newURL = "https://api.github.com/repos/test/workshop/contents/_episodes/test-episode_1.md"
        const F = workshop.getters.File(state, getters)(url)
        const newF = {
            ...F,
            url: "https://api.github.com/repos/test/workshop/contents/_episodes/test-episode_1.md",
            path: "_episodes/test-episode_1.md"
        }

        const call = await testAction(
            workshop.actions.installFile,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'addFile',
                        payload: {
                            url: newURL,
                            content: btoa(F.content),
                            sha: null,
                            path: "_episodes/test-episode_1.md"
                        }
                    },
                    callback: () => {
                        state.files.push(newF)
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: newURL, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'setFileContentFromYAML',
                        payload: {
                            ...newF,
                            yaml: {
                                missingDependencies: [],
                                dependencies: [],
                                originalRepository: "some/other"
                            }
                        }
                    },
                    check_function: (e, r) =>
                        expect(JSON.stringify(e)).toMatch(JSON.stringify(r))
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'installDependencies',
                        payload: {url: newURL}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: newURL, value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'pushFile',
                        payload: {url: newURL}
                    },
                    callback: () => throw new Error('no')
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'addError',
                        payload: new Error('no')
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: newURL, value: false}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters}
        );
        expect(call).toBeNull()
    })

    it('installDependencies()', async () => {
        const url = "https://api.github.com/repos/some/other/contents/_episodes/test-episode.md";
        const F = {
            ...workshop.getters.File(state, getters)(url),
            content: "",
            body: "<img src=\"..abc\"/>\n{% include installedFile.lqd path='xyz' %}",
            yaml: {
                dependencies: [],
                missingDependencies: [
                    "abc",
                    "xyz"
                ],
                originalRepository: "foo/bar"
            }
        }
        state.files = state.files.map(f => f.url === url? F : f)
        fetchMock.once('abc').once('xyz')

        const call = await testAction(
            workshop.actions.installDependencies,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_DISPATCH,
                        name: 'setFileContentFromYAML',
                        payload: {
                            ...F,
                            yaml: {
                                dependencies: [
                                    "abc",
                                    "xyz"
                                ],
                                missingDependencies: [],
                                originalRepository: "foo/bar"
                            },
                            body: "<img src=\"{% include installedFile.lqd path='abc' %}\"/>\n{% include installedFile.lqd path='xyz' %}"
                        }
                    },
                    check_function: (e, r) =>
                        expect(JSON.stringify(e)).toMatch(JSON.stringify(r))
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters}
        );
        expect(JSON.stringify(call)).toMatch(JSON.stringify(getters.File(url)))
    })

    it('deleteFile()', async () => {
        const url = "https://api.github.com/repos/test/workshop/contents/_episodes/test-episode.md";
        const F = {
            ...workshop.getters.File(state, getters)(url),
            content: "",
            body: "",
            yaml: {
                dependencies: [
                    "abc",
                    "xyz"
                ],
                originalRepository: "foo/bar"
            }
        }
        state.files = state.files.map(f => f.url === url? F : f)
        fetchMock.once().mockRejectOnce()

        const call = await testAction(
            workshop.actions.deleteFile,
            [
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: true}
                    }
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'removeItem',
                        payload: {array: "files", item: {...F}}
                    },
                    check_function: (e, r) =>
                        expect(JSON.stringify(e)).toMatch(JSON.stringify(r))
                },
                {
                    t: {
                        type: TRIGGER_TYPE_MUTATION,
                        name: 'setBusyFlag',
                        payload: {flag: url, value: false}
                    }
                }
            ],
            {url},
            {state, getters, rootGetters}
        );
        expect(call).toEqual({
            deleted: [
                {fileName: "foo/bar/abc", deleted: true},
                {fileName: url, deleted: true}
            ],
            skipped: [],
            failed: [
                {fileName: "foo/bar/xyz"}
            ]
        })
    })
});
