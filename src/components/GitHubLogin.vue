<template>
    <b-button @click="$store.getters['github/login']? $store.dispatch('github/logout') : loginRequest()"
              icon-left="github"
              size="is-medium"
              :type="!$store.getters['github/login']? '' : 'is-dark'"
              :loading="$store.state.github.loginInProgress"
    >
      <span v-if="$store.getters['github/login']">{{ $store.getters['github/login'] }} (logout)</span>
      <span v-else>Log in to GitHub</span>
    </b-button>
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
    mounted: function() {
        // Check for a token to process
        if(this.$store.getters['github/token'])
            this.$store.dispatch('github/getUserDetails');
        // Check for a code after the initial login stage attempt
        else if(this.$store.getters['github/code'])
            this.$store.dispatch('github/redeemCode');
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
