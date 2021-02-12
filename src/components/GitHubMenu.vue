<template>
  <div class="github-menu">
    <div class="github-menu-wrapper"
         @mouseenter="expanded = true"
         @focus="expanded = true"
         @mouseleave="expanded = false"
         @blur="expanded = false"
    >
      <div v-if="mainRepo"
           class="github-menu-buttons"
      >
        <header>
          <b-icon icon="github" size="is-large"/>
          <span v-if="expanded">GitHub integration</span>
        </header>
        <b-button icon-left="delete"
                  :label="expanded? 'Discard local changes' : ''"
                  :disabled="$store.getters['workshop/Repository']().files.filter(f => f.hasChanged()).length === 0"
                  :loading="$store.state.workshop.busyFlags.length !== 0"
                  type="is-danger"
                  @click="reload"
        />
        <b-button icon-left="content-save"
                  :label="expanded? 'Save changes to GitHub' : ''"
                  :disabled="$store.getters['workshop/Repository']().files.filter(f => f.hasChanged()).length === 0"
                  :loading="$store.state.workshop.busyFlags.length !== 0"
                  type="is-success"
                  @click="save"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GitHubMenu',
  components: {},
  props: {},
  data: function() {
    return {
      expanded: false
    }
  },
  computed: {
    mainRepo() {return this.$store.getters['workshop/Repository']()}
  },
  methods: {
    reload() {
      this.$store.dispatch('loadRemoteWorkshop', {
        user: this.$store.getters['github/login'],
        repository: this.$store.state.workshop.remoteRepository,
        callback: (e) => {
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
        }
      })
    },
    save() {
      const self = this;
      this.$store.dispatch('workshop/saveRepositoryChanges')
              .then(({successes, failures}) => {
                if(failures && !successes)
                  self.$buefy.toast.open({
                    message: `Failed to push ${failures} file${failures === 1? '' : 's'} to GitHub`,
                    type: 'is-danger'
                  });
                else if(failures)
                  self.$buefy.toast.open({
                    message: `Could not push all files to GitHub. Successes: ${successes}; Failures: ${failures}`,
                    type: 'is-warning'
                  });
                else if(successes)
                  self.$buefy.toast.open({
                    message: `Successfully pushed ${successes} file${successes === 1? '' : 's'} to GitHub`,
                    type: 'is-danger'
                  });
              })
    }
  },
  watch: {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .github-menu {
    height: 100%;
    top: 0;
    right: 0;
    position: fixed;
    display: flex;
    flex-direction: row;
    align-items: center;
    z-index: 100;
  }

  .github-menu-wrapper {
    background-color: rebeccapurple;
    padding: .5em .25em .5em 1em;
    border-top-left-radius: 1em;
    border-bottom-left-radius: 1em;
    opacity: 0.5;
  }
  .github-menu-wrapper:hover {opacity: 1;}

  .github-menu-buttons {
    display: flex;
    flex-direction: column;

    background-color: white;
    border-top-left-radius: 1em;
    border-bottom-left-radius: 1em;
    padding-bottom: .5em;
  }
</style>