<template>
  <div class="content">
    <div class="content is-inline-flex"
         v-if="$store.state.github.code !== ''"
    >
      <b-icon icon="github" :class="$store.state.github.loginInProgress === ''? 'is-warning' : 'is-success'"/>
      <p v-if="$store.state.github.loginInProgress">Logging in <b-icon icon="loading" custom-class="mdi-spin"/></p>
      <p v-else>Logged in as {{ $store.state.github.login }}</p>
    </div>
    <b-button v-else
              @click="loginRequest"
              icon-left="github"
              size="is-medium"
    >
      Log in to GitHub
    </b-button>
  </div>
</template>

<script>
export default {
  name: 'GitHubLogin',
  props: {},
  data: function() {
    return {
      checkingToken: false,
      invalidLogin: false,
      response: ""
    }
  },
  methods: {
    loginRequest: function() {
      window.location = `https://github.com/login/oauth/authorize?client_id=${process.env.VUE_APP_GITHUB_ID}&scope=public_repo repo`;
    }
  },
  mounted: function() {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
