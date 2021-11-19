<template>
  <div class="github-menu" v-if="mainRepo">
    <div class="github-menu-wrapper"
         @mouseenter="expanded = true"
         @focus="expanded = true"
         @mouseleave="expanded = false"
         @blur="expanded = false"
    >
      <div class="github-menu-buttons">
        <div class="github-components">
          <header>
            <a :href="`https://github.com/${mainRepo.ownerLogin}/${mainRepo.name}/`"
               target="_blank"
               class="has-text-black"
               title="Open repository in GitHub"
            >
              <b-icon icon="github" size="is-large"/>
              <span v-if="expanded">GitHub Integration</span>
            </a>
          </header>
          <b-button icon-left="delete"
                    :label="expanded? 'Discard local changes' : ''"
                    :disabled="mainRepo.files.filter(f => f.hasChanged()).length === 0"
                    type="is-danger"
                    @click="reload"
                    size="is-medium"
                    expanded
          />
          <b-button icon-left="content-save"
                    :label="expanded? 'Save changes to GitHub' : ''"
                    :disabled="mainRepo.files.filter(f => f.hasChanged()).length === 0"
                    type="is-success"
                    @click="save"
                    size="is-medium"
                    expanded
          />
        </div>
        <b-loading :active="$store.state.workshop.busyFlags.length !== 0" :is-full-page="false"/>
        <b-button v-if="pagesURL !== ''"
                  tag="a"
                  :href="pagesURL"
                  target="_blank"
                  icon-left="link"
                  :label="expanded? 'View workshop website' : ''"
                  :disabled="!mainRepo"
                  type="is-info"
                  size="is-medium"
                  expanded
        />
        <b-button v-if="pagesURL !== '' && $store.state.github.buildStatus"
                  :type="`is-light ${buildType}`"
                  :icon-left="buildIcon"
                  :loading="buildType === 'is-info'"
                  :label="expanded? buildMessage : ''"
                  :title="$store.state.github.buildStatus.error.message"
                  expanded
                  aria-roledescription="div"
        />
        <div v-if="lastCheck && expanded" class="has-text-grey-light last-check-time">
          Last build status check: {{ lastCheck }}
        </div>
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
    mainRepo() {return this.$store.getters['workshop/Repository']()},
    pagesURL() {
      try {
        return `https://${this.mainRepo.ownerLogin}.github.io/${this.mainRepo.name}`;
      } catch(e) {return ""}
    },
    buildType() {
      try {
        switch(this.$store.state.github.buildStatus.status) {
          case "built": return 'is-success';
          case "errored": return 'is-danger';
          default: return 'is-info';
        }
      } catch(e) {return ''}
    },
    buildIcon() {
      try {
        switch(this.$store.state.github.buildStatus.status) {
          case "built": return 'check';
          case "errored": return 'exclamation';
          default: return 'dots-horizontal';
        }
      } catch(e) {return ''}
    },
    buildMessage() {
      try {
        const build = this.$store.state.github.buildStatus;
        switch(build.status) {
          case "built": return `Website built successfully in ${Math.round(build.duration / 10) / 100}s`;
          case "errored": return `Website build failure.`;
          default: return 'Website building in progress...';
        }
      } catch(e) {return ''}
    },
    lastCheck() {
      try {
        if(!this.$store.state.github.lastBuildStatusCheck)
          return null;
        const t = new Date(this.$store.state.github.lastBuildStatusCheck + performance.timeOrigin);
        return `${t.getDate()}/${t.getMonth() + 1}/${t.getFullYear()} - ${t.getHours()}:${Math.floor(t.getMinutes()/10)}${t.getMinutes()%10}${t.getHours() < 12? 'am' : 'pm'}`
      } catch(e) {return null}
    }
  },
  methods: {
    reload() {
      const self = this;
      return this.$store.dispatch('workshop/loadRepository', {url: self.mainRepo.url})
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
      return this.$store.dispatch('workshop/saveRepositoryChanges')
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
    z-index: 30;
  }

  .github-menu-wrapper {
    background-color: rebeccapurple;
    padding: .5em 0 .5em 1em;
    border-top-left-radius: 1em;
    border-bottom-left-radius: 1em;
    opacity: 0.5;
  }
  .github-menu-wrapper:hover {opacity: 1;}

  .github-menu-buttons {
    background-color: white;
    border-top-left-radius: 1em;
    border-bottom-left-radius: 1em;
    padding: .5em 0 .5em .5em;
    .github-components {
      display: flex;
      flex-direction: column;
      header a {
        display: flex;
        align-items: center;
        justify-content: space-evenly;
        font-size: 1.3em;
        margin-bottom: .25em;
        user-select: none;
      }
      button:first-of-type {border-bottom-left-radius: 0}
      button:last-of-type {border-top-left-radius: 0}
    }
    a, button {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    a {
      margin-top: .5em;
    }
  }

  .last-check-time {font-size: .8em;}
</style>
