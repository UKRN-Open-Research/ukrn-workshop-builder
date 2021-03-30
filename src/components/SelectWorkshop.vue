<template>
  <section class="card content">
    <div class="card-header"
         role="button"
         aria-controls="select-existing-workshop"
    >
      <span class="card-header-title">Select Existing Workshop to Edit</span>
    </div>
    <div class="card-content">
      <div class="content" v-if="userRepositories.length">
        <div class="content">
          <p>You already have a repository which is tagged with the topic "ukrn-workshop". You can select it here:</p>
        </div>
        <div class="content select-repo">
          https://github.com/{{ $store.getters['github/login'] }}/
          <b-select v-model="remoteRepositoryURL" :loading="$store.getters['workshop/isBusy']('findRepositories')">
            <option v-for="repo in userRepositories" :key="repo.url" :value="repo.url">
              {{ repo.name }}
            </option>
          </b-select>
          <b-button label="Load workshop"
                    icon-right="arrow-right"
                    type="is-primary"
                    @click="chooseWorkshop"
                    :disabled="!remoteRepositoryURL"
          />
        </div>
      </div>
      <div class="content columns" v-else>
        <div class="column">
          <p>You don't have any repositories tagged with the topic "ukrn-workshop". If you think this is a mistake, or you have just created one, you can refresh the search using this button.</p>
        </div>
        <div class="column">
          <b-button @click="checkUserRepositories" :loading="$store.getters['workshop/isBusy']('findRepositories')">Check again</b-button>
        </div>
      </div>
      <div class="content">
        <b-field :label="`${userRepositories.length? 'Alternatively, ':''}Create a New Repository...`"
                 :message="newRepositoryName === newRepositoryNameSafe? '' : `Repository will be created as ${newRepositoryNameSafe}`"
        >
          <b-input placeholder="New repository name"
                   type="search"
                   v-model="newRepositoryName"
                   expanded
                   :disabled="$store.getters['workshop/isBusy']('createRepository')"
          />
          <p class="control">
            <b-button class="button is-primary"
                      icon-left="github"
                      icon-right="plus"
                      type="is-primary"
                      :disabled="!newRepositoryNameSafe"
                      :loading="$store.getters['workshop/isBusy']('createRepository')"
                      @click="createRepository"
            >
              Create repository
            </b-button>
          </p>
        </b-field>
      </div>
    </div>
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
      chosenTemplateRepository: this.templateRepository,
      newRepositoryName: "",
      remoteRepositoryURL: null
    }
  },
  computed: {
    userRepositories() {
      return this.$store.state.workshop.repositories
              .filter(r => r.ownerLogin === this.$store.getters['github/login']);
    },
    newRepositoryNameSafe() {
      return this.newRepositoryName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    }
  },
  methods: {
    checkUserRepositories() {
      console.log(`checkUserRepositories(user=${this.$store.getters['github/login']})`)
      this.$store.dispatch('workshop/findRepositories', {
        owner: this.$store.getters['github/login']
      });
    },
    chooseWorkshop() {
      // Load local files for this workshop
      this.$store.commit('workshop/setMainRepository',
              {url: this.remoteRepositoryURL});
      // Load repositories with the same topic
      this.$store.dispatch('workshop/findRepositoryFiles',
              {url: this.remoteRepositoryURL})
              // Look up workshops with the same topic
              .then(R => {
                if(R.config)
                  return this.$store.dispatch('workshop/findRepositories', {
                    topics: [R.config.yaml.topic]
                  });
              });
      // Fetch build info for selected repository
      this.$store.dispatch('github/registerBuildCheck', {delay: 100});
    },
    createRepository() {
      this.$store.dispatch('workshop/createRepository', {
        name: this.newRepositoryNameSafe, template: this.chosenTemplateRepository
      })
    }
  },
  mounted() {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  $colour-workshop-main: #c4ffe1;
  $colour-workshop-dark: darkgreen;

  .select-repo {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
  }

</style>
