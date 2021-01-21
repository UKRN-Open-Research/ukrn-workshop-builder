<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" class="vue-logo">
    <div v-if="!preambleRead">
      <p>This website will guide you through the process of taking our template workshop and adapting it to create a workshop website customised for your needs.</p>
      <p>The websites are GitHub repositories which are monitored and hosted as websites. This means you will need a <a href="https://github.com/">GitHub account</a>. If you do not have one already, you can <a href="https://github.com/join/">create one for free</a>.</p>
      <label for="preamble">When you have read and understood this preamble, please check this box.</label>
      <input type="checkbox" v-model="preambleRead" id="preamble"/>
    </div>
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

// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { faLink, faCog, faPlusCircle, faPencilAlt, faSpinner, faMinusCircle } from '@fortawesome/free-solid-svg-icons'
library.add(faLink, faCog, faPlusCircle, faPencilAlt, faSpinner, faMinusCircle);

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
  margin-top: 60px;
}
.vue-logo {
  height: 50px;
  position: fixed;
  left: 0;
  top: 0;
}
header {
  text-align: left;
  margin-left: 0;
  margin-top: -1.5em;
}
section {margin: 1em auto; padding: 1em; width: 90%;}
div {margin: 1em auto;}
label + * {margin-left: 1em;}
</style>
