<template>
  <div class="github-menu" v-if="mainRepo">
    <div class="github-menu-wrapper"
         @mouseenter="expanded = true"
         @focus="expanded = true"
         @mouseleave="expanded = false"
         @blur="expanded = false"
    >
      <div class="github-menu-buttons">
        <header>
          <b-icon icon="github" size="is-large"/>
          <span v-if="expanded">GitHub integration</span>
        </header>
        <b-button icon-left="delete"
                  :label="expanded? 'Discard local changes' : ''"
                  :disabled="mainRepo.files.filter(f => f.hasChanged()).length === 0"
                  type="is-danger"
                  @click="reload"
        />
        <b-button icon-left="content-save"
                  :label="expanded? 'Save changes to GitHub' : ''"
                  :disabled="mainRepo.files.filter(f => f.hasChanged()).length === 0"
                  type="is-success"
                  @click="save"
        />
      </div>
      <b-loading :active="$store.state.workshop.busyFlags.length !== 0" :is-full-page="false"/>
      <a v-if="pagesURL !== ''" :href="pagesURL" target="_blank">
        <b-button icon-left="link"
                  :label="expanded? 'View workshop website' : ''"
                  :disabled="!mainRepo"
                  type="is-info"
        />
      </a>
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
    mainRepo() {return this.$store.getters['workshop/Repository']()},
    pagesURL() {
      try {
        return `https://${this.mainRepo.ownerLogin}.github.io/${this.mainRepo.name}`;
      } catch(e) {return ""}
    }
  },
  methods: {
    reload() {
      const self = this;
      this.$store.dispatch('workshop/loadRepository', {url: self.mainRepo.url})
              .then(R => self.$store.dispatch('workshop/findRepositoryFiles', {url: R.url}))
              .then(() => self.$buefy.toast.open({
                message: "Repository reloaded", type: "is-success"
              }))
              .catch(e => {console.error(e); self.$buefy.toast.open({
                message: "Failed to reload repository", type: "is-danger"
              })})
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
                    type: 'is-success'
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