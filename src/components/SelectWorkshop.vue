<template>
  <section class="card content" @mouseenter="checkUserRepositories" @focus="checkUserRepositories">
    <b-collapse class=""
                animation="slide"
                aria-id="select-existing-workshop"
                :open="!createNew"
                @open="createNew = false"
    >
      <template #trigger="props">
        <div class="card-header"
             role="button"
             aria-controls="select-existing-workshop"
        >
          <span class="card-header-title">Select existing workshop to edit</span>
          <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
        </div>
      </template>

      <div class="card-content">
        <div class="content columns" v-if="userRepositories.length">
          <div class="column">
            <p>You already have a repository which is tagged with the topic "ukrn-workshop". You can select it here:</p>
          </div>
          <div class="column">
            https://github.com/{{ $store.state.github.login }}/
            <b-select v-model="remoteRepository" :loading="fetchRemoteRepositoryFlag">
              <option v-for="repo in userRepositories" :key="repo">
                {{ repo }}
              </option>
            </b-select>
          </div>
        </div>
        <div class="content columns" v-else>
          <div class="column">
            <p>You don't have any repositories tagged with the topic "ukrn-workshop". If you think this is a mistake, or you have just created one, you can refresh the search using this button.</p>
          </div>
          <div class="column">
            <b-button @click="getUserRepositories" :loading="userRepoSearchFlag">Check again</b-button>
          </div>
        </div>
      </div>
    </b-collapse>
    <b-collapse class=""
                animation="slide"
                aria-id="select-existing-workshop"
                :open="createNew"
                @open="createNew = true"
    >
      <template #trigger="props">
        <div class="card-header"
             role="button"
             aria-controls="select-existing-workshop"
        >
          <span class="card-header-title">Create a new workshop</span>
          <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
        </div>
      </template>

      <div class="columns card-content">
        <div class="column">
          The workshop topic is used to choose which lessons will be likely to be useful for you. You'll still be able to select lessons outside your workshop topic.
        </div>
        <div class="column">
          <div class="is-inline-flex"
               :title="topicListLocked? 'Warning: changing the topic will refresh the template and your changes will be lost.' : ''"
          >
            <b-button v-if="$store.state.template.fetchInProgress" disabled>
              Loading workshop list
              <b-icon/>
              <b-icon custom-class="mdi-spin" icon="loading"/>
            </b-button>
            <b-select v-else
                      placeholder="Select a workshop topic"
                      v-model="workshop"
                      id="selectWorkshop"
                      :disabled="$store.state.template === null || topicListLocked"
            >
              <option v-if="!topicList.length" disabled>Fetching workshop list</option>
              <option v-for="topic in topicList" :value="topic.value" :key="topic.value">
                {{ topic.name }}
              </option>
            </b-select>
            <div @mouseenter="iconLocked = false"
                 @mouseleave="iconLocked = true"
            >
              <b-button v-if="topicListLocked"
                        :icon-left="iconLocked? 'lock' : 'lock-open'"
                        :type="$store.state.workshop.config === $store.state.workshop.baseConfig && !$store.state.workshop.pushed? 'is-info' : 'is-danger'"
                        @click="topicListLocked = false"
              >
                Unlock
              </b-button>
            </div>
          </div>
        </div>
      </div>
      <div class="card-content">
        <b-button icon-left="github"
                  @click="pushWorkshop"
                  expanded
                  v-if="workshopTopic"
                  :loading="createRepositoryFlag"
        >
          Create repository {{ $store.state.github.login }}/ukrn-{{ workshopTopic }}-workshop
        </b-button>
      </div>
    </b-collapse>
  </section>
</template>

<script>
export default {
  components: {
  },
  name: 'SelectWorkshop',
  props: {
    templateRepository: {type: String, required: false}
  },
  data: function() {
    return {
      createNew: true,
      createRepositoryFlag: false,
      fetchRemoteRepositoryFlag: false,
      status: {content: "Fetching Workshop Template details...", class: "is-info", details: null},
      topicList: [],
      topicListLocked: false,
      iconLocked: true,
      userRepositories: [],
      userRepoSearchFlag: false,
      userReposChecked: false
    }
  },
  computed: {
    workshop: {
      get: function() {return this.$store.state.workshop},
      set: function(topic) {
        this.topicListLocked = true;
        let cfg = this.$store.state.template.master;
        cfg = cfg.replace(/^workshop-topic:.+$/gm, `workshop-topic: "${ymlClean(topic, true)}"`);
        this.$store.dispatch('initWorkshop', cfg);
      },
    },
    remoteRepository: {
      get: function() {return this.$store.state.workshop.remoteRepository},
      set: function(repo) {
        if(this.fetchRemoteRepositoryFlag)
          return;
        this.fetchRemoteRepositoryFlag = true;
        this.$store.dispatch('loadRemoteWorkshop', {
          user: this.$store.state.github.login, repository: repo, callback: (e) => {
            if(e !== null)
              this.$buefy.toast.open({
                message: `Error loading remote repository!`,
                type: "is-danger"
              });
            else
              this.$buefy.toast.open({
                message: "Loaded remote repository content",
                type: "is-success"
              });
          }})
          .then(() => this.fetchRemoteRepositoryFlag = false);
      },
    },
    workshopTopic: function() {
      const match = /^workshop-topic: "(.+)"$/gm.exec(this.$store.state.workshop.config);
      if(match)
        return match[1];
      return "";
    }
  },
  methods: {
    refreshTemplate: function() {
      console.log(`refreshTemplate(${this.templateRepository})`)
      if(this.$store.state.template.fetchInProgress || this.templateRepository === "" || this.topicList.length)
        return;
      this.$store.dispatch('fetchTemplateMaster', this.templateRepository)
        .then(() => {
          this.findWorkshops();
          setTimeout(this.refreshTemplate, 100);
        });
    },
    findWorkshops: function() {
      const match = /#: WORKSHOP TOPICS :#\n(.+\n)+#\/#/g.exec(this.$store.state.template.master);
      if(!match)
        return;
      const text = match[0];
      const _list = [];
      const re = /\n# (.+)/g;
      let m;
      do {
        m = re.exec(text);
        if (m) {
          const value = m[1];
          const name = value.split('-')
                  // Capitalize
                  .map(x => x.replace(/\w\S*/g, s => s.charAt(0).toUpperCase() + s.substr(1)))
                  .join(' ');
          _list.push({name, value});
        }
      } while (m);
      this.topicList = _list;
    },
    pushWorkshop: function() {
      if(this.createRepositoryFlag)
        return;
      this.createRepositoryFlag = true;
      this.$store.dispatch('pushWorkshopToGitHub', {
        templateRepository: this.templateRepository,
        repoName: `ukrn-${this.workshopTopic}-workshop`,
        topic: this.workshopTopic
      })
        .then(() => this.createRepositoryFlag = false);
    },
    getUserRepositories: function() {
      if(this.userRepoSearchFlag)
        return;
      this.userRepoSearchFlag = true;
      const url = `https://api.github.com/search/repositories?q=fork:true+topic:ukrn-workshop+user:${this.$store.state.github.login}`;
      console.log(url)
      return fetch(url, {
        headers: {"accept": "application/vnd.github.mercy-preview+json"}
      })
        .then(async r => {return {r:r, j: await r.json()}})
        .then(resp => {
          this.userRepoSearchFlag = false;
          if(resp.r.status !== 200) {
            console.error(`${resp.r.statusCode} (${resp.r.status}): ${resp.j.error}`);
            return;
          }
          this.userRepositories = resp.j.items.map(i => i.name);
        })
        .catch(e => {
          this.userRepoSearchFlag = false;
          console.error(e);
        })
    },
    checkUserRepositories: function() {
      if(!this.userReposChecked) {
        this.userReposChecked = true;
        this.getUserRepositories()
                .then(() => this.createNew = !this.userRepositories.length);
      }
    }
  },
  mounted() {
    this.refreshTemplate();
  }
}

/**
 * Clean a string for YAML
 * @param str {string} input
 * @return {string}
 */
function ymlClean(str, justQuotes = false) {
let s = str;
s = s.replace(/'/g, '"');
if(!justQuotes)
  s = s.replace(/[^a-zA-Z0-9_'; .]/g, '');
return s;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  $colour-workshop-main: #c4ffe1;
  $colour-workshop-dark: darkgreen;

  .workshop {
    /*background-color: $colour-workshop-main;*/
  }

</style>
