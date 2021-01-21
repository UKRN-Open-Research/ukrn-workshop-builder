<template>
  <div>
    <button v-on:click="loginRequest">
      Let's try to log in to GitHub.
    </button>
    <p>
      Current status: {{ status }}
    </p>
  </div>
</template>

<script>
export default {
  name: 'GitHubLogin',
  data: function() {
    return {
      status: "Awaiting login"
    }
  },
  methods: {
    loginRequest: function() {
      window.location = `https://github.com/login/oauth/authorize?client_id=${process.env.VUE_APP_GITHUB_ID}`;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
