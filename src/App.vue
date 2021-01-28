<template>
  <div id="app" class="">
    <img alt="Vue logo" src="./assets/logo.png" class="vue-logo">
    <b-message class="is-info" v-if="!preambleRead">
      <p>This website will guide you through the process of taking our template workshop and adapting it to create a workshop website customised for your needs.</p>
      <p>The websites are GitHub repositories which are monitored and hosted as websites. This means you will need a <a href="https://github.com/">GitHub account</a>. If you do not have one already, you can <a href="https://github.com/join/">create one for free</a>.</p>
      <br/>
      <b-button @click="preambleRead = true" id="preamble" class="is-info">
        I have read and understood this preamble
      </b-button>
    </b-message>
    <div v-if="preambleRead">
      <SelectWorkshop :templateDetails="workshopTemplate"/>
      <hr/>
      <GitHubLogin v-if="code === ''"/>
      <CheckAuth v-bind:code="code"/>
      <Logout v-if="code !== ''"/>
    </div>
  </div>
</template>

<script>
import VueRouter from "vue-router"
const router = new VueRouter();
import SelectWorkshop from './components/SelectWorkshop'
import GitHubLogin from './components/GitHubLogin'
import CheckAuth from "./components/CheckAuth";
import Logout from "./components/Logout.vue"

export default {
  name: 'App',
  components: {
    SelectWorkshop,
    GitHubLogin,
    CheckAuth,
    Logout
  },
  data: function() {
    return {
      workshopTemplate: {owner: "mjaquiery", repository: "workshop-template"},
      preambleRead: false
    }
  },
  computed: {
    code: function() {
      return this.$route.query.code || ""
    }
  },
  router
}
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
.vue-logo {
  height: 50px;
  position: fixed;
  left: 0;
  top: 0;
}
</style>
