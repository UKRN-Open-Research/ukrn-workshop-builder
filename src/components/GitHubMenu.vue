<template>
  <b-sidebar open right reduce class="sidebar-menu">
    <b-menu>
      <b-menu-list>
        <b-menu-item icon="delete"
                     title="Discard local changes"
                     :disabled="true"
                     @click="reload"
        />
        <b-menu-item icon="content-save"
                     title="Save changes to GitHub"
                     :disabled="true"
                     @click="save"
        />
        <b-icon icon="loading" custom-class="mdi-spin" v-if="$store.state.workshop.busyFlags.length"/>
      </b-menu-list>
    </b-menu>
  </b-sidebar>
</template>

<script>
export default {
  name: 'GitHubMenu',
  components: {},
  props: {},
  data: function() {
    return {}
  },
  computed: {},
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
      this.$store.dispatch('workshop/commitChanges', {callback: (err, msg) => {
        if(err)
          this.$buefy.toast.open({
            message: err,
            type: "is-danger"
          });
        else
          this.$buefy.toast.open({
            message: msg,
            type: "is-success"
          });
        }})
    }
  },
  watch: {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .sidebar-menu {
    opacity: 0.5;
  }
  .sidebar-menu:hover {opacity: 1;}
</style>