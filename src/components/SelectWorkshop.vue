<template>
  <section class="card content">
    <div class="card-header"
         role="button"
         aria-controls="select-existing-workshop"
    >
      <span class="card-header-title">Select existing workshop to edit</span>
    </div>
    <div class="card-content">
      <div class="content columns" v-if="userRepositories.length">
        <div class="column">
          <p>You already have a repository which is tagged with the topic "ukrn-workshop". You can select it here:</p>
        </div>
        <div class="column">
          https://github.com/{{ $store.state.github.login }}/
          <b-select v-model="remoteRepositoryURL" :loading="$store.getters['workshop/isBusy']('findRepositories')">
            <option v-for="repo in userRepositories" :key="repo.url" :value="repo.url">
              {{ repo.name }}
            </option>
          </b-select>
          <b-button label="Load workshop"
                    icon-left="arrow-right"
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
        <b-field label="Create new repository...">
          <b-input placeholder="New repository name" type="search"/>
          <p class="control">
            <b-button class="button is-primary" icon-left="github" icon-right="plus">
              Create repository
            </b-button>
          </p>
        </b-field>
      </div>
    </div>

    <!--<div class="card-header"
         role="button"
         aria-controls="select-existing-workshop"
    >
      <span class="card-header-title">Create a new workshop</span>
      <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
    </div>
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
    </div>-->
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
      remoteRepositoryURL: null
    }
  },
  computed: {
    userRepositories() {
      return this.$store.state.workshop.repositories
              .filter(r => r.ownerLogin === this.$store.state.github.login);
    },
  },
  methods: {
    checkUserRepositories() {
      console.log(`checkUserRepositories(user=${this.$store.state.github.login})`)
      this.$store.dispatch('workshop/findRepositories', {
        owner: this.$store.state.github.login,
        topics: ["ukrn-workshop", "ukrn-open-research"]
      });
    },
    chooseWorkshop() {
      // Load local files for this workshop
      this.$store.commit('workshop/setMainRepository',
              {url: this.remoteRepositoryURL});
      // Load repositories with the same topic
      this.$store.dispatch('workshop/findRepositoryFiles',
              {url: this.remoteRepositoryURL});
    }
  },
  mounted() {}
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
