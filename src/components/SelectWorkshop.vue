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
          <p>You already have a workshop repository which is tagged with the topic "ukrn-workshop". You can select it here:</p>
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
          <p>You don't have any workshop repositories tagged with the topic "ukrn-workshop". If you think this is a mistake, or you have just created one, you can refresh the search using this button.</p>
        </div>
        <div class="column">
          <b-button @click="checkUserRepositories" :loading="$store.getters['workshop/isBusy']('findRepositories')">Check again</b-button>
        </div>
      </div>
      <div class="content">
        <b-field :label="`${userRepositories.length? 'Alternatively, c':'C'}reate a new workshop from a template`"
                 :message="newRepositoryName !== newRepositoryNameSafe? `Repository will be created as ${newRepositoryNameSafe}` : templateRepository && !newRepositoryNameSafe? 'Enter a name for your new repository' : ''"
        >
          <b-input placeholder="New workshop name"
                   type="search"
                   v-model="newRepositoryName"
                   expanded
                   :disabled="$store.getters['workshop/isBusy']('createRepository')"
          />
          <b-select placeholder="Select template"
                    expanded
                    v-model="chosenTemplateRepository"
                    :loading="$store.getters['workshop/isBusy']('findTemplates')"
                    :disabled="$store.getters['workshop/isBusy']('createRepository')"
          >
            <option v-for="t in templates" :key="t.url" :value="t.url">{{ t.description }} ({{ t.ownerLogin }}/{{ t.name }})</option>
          </b-select>
          <p class="control">
            <b-button class="button is-primary"
                      icon-left="github"
                      icon-right="plus"
                      type="is-primary"
                      :disabled="!newRepositoryNameSafe || !chosenTemplateRepository"
                      :loading="$store.getters['workshop/isBusy']('createRepository')"
                      @click="createRepository"
            >
              Create
            </b-button>
          </p>
        </b-field>
      </div>
    </div>
  </section>
</template>

<script>
  /**
   * The SelectWorkshop component offers a user a list of their UKRN workshop repositories from which they can select a repository to edit. Alternatively the user can enter a new repository name to create a new workshop repository from a template repository.
   *
   * @vue-prop [templateRepository] {String} The template repository from which the create new workshop will be created.
   *
   * @vue-data chosenTemplateRepository {String} The URL of the template repository currently selected as the template for created workshops.
   * @vue-data newRepositoryName="" {String} Name for the new repository to be created.
   * @vue-data remoteRepositoryURL=null {String|null} The URL of the currently selected repository.
   *
   * @vue-computed templateRepository {Template} The currently selected template repository.
   * @vue-computed templateRepositories {Array<Template>} The template repositories from which the create new workshop will be created.
   * @vue-computed userRepositories {Array<Repository>} URKN workshop GitHub repositories belonging to the user.
   * @vue-computed newRepositoryNameSafe {String} A version of the newRepositoryName string suitable for use as a GitHub repository name.
   */
  export default {
    components: {},
    name: 'SelectWorkshop',
    data: function() {
      return {
        chosenTemplateRepository: "",
        newRepositoryName: "",
        remoteRepositoryURL: null
      }
    },
    computed: {
      templates() {
        return this.$store.state.workshop.templates
      },
      templateRepository() {
        if(!this.chosenTemplateRepository)
          return null;
        const t = this.$store.state.workshop.templates.filter(
                t => t.url === this.chosenTemplateRepository
        );
        return t.length? t[0] : null;
      },
      userRepositories() {
        return this.$store.state.workshop.repositories
                .filter(r => r.ownerLogin === this.$store.getters['github/login']);
      },
      newRepositoryNameSafe() {
        return this.newRepositoryName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      }
    },
    methods: {
      /**
       * Refresh the list of the user's repositories.
       */
      checkUserRepositories() {
        console.log(`checkUserRepositories(user=${this.$store.getters['github/login']})`)
        this.$store.dispatch('workshop/findRepositories', {
          owner: this.$store.getters['github/login']
        });
      },
      /**
       * Set a repository as the main repository for customisation. Fetch the repository files for that repository, and fetch a list of other UKRN workshop repositories with the same open science topic. Schedule a build status check for the immediate future.
       */
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
      /**
       * Create a new UKRN workshop repository on GitHub by copying from a template.
       */
      createRepository() {
        this.$store.dispatch('workshop/createRepository', {
          name: this.newRepositoryNameSafe,
          template: `${this.templateRepository.ownerLogin}/${this.templateRepository.name}`
        })
      }
    },
    mounted() {
      this.$store.dispatch('workshop/findTemplates');
    }
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
