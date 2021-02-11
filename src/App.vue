<template>
  <div id="app" class="">
    <GitHubMenu/>
    <img alt="Vue logo" src="./assets/logo.png" class="vue-logo">
    <b-steps
            v-model="activeStep"
            :has-navigation="false"
    >
      <b-step-item step="1" label="Info" icon="information-outline" :type="stepType(1)" :clickable="true">
        <h1 class="title has-text-centered">Account</h1>
        <b-message class="is-info">
          <p>This website will guide you through the process of taking our template workshop and adapting it to create a workshop website customised for your needs.</p>
          <p>The websites are GitHub repositories which are monitored and hosted as websites. This means you will need a <a href="https://github.com/">GitHub account</a>. If you do not have one already, you can <a href="https://github.com/join/">create one for free</a>.</p>
          <br/>
          <b-button @click="readPreamble" id="preamble" :class="stepType(1)">
            I have read and understood this preamble
          </b-button>
        </b-message>
      </b-step-item>

      <b-step-item step="2" label="GitHub" icon="github" :type="stepType(2)" :clickable="latestStep > 0">
        <h1 class="title has-text-centered">Github login</h1>
        <p class="explainer content">
          <a href="https://github.com/" title="GitHub is a version-control and collaborative working platform.">GitHub.com</a> is used to create your workshop website. We use a part of GitHub called <em>GitHub Pages</em> which will take a <b-tooltip label="A repository is a collection of files making up a project" dashed>repository</b-tooltip> and turn it into a website.
        </p>
        <p class="explainer content">If you don't have a GitHub account, you will be able to create one here.</p>
        <GitHubLogin/>
      </b-step-item>

      <b-step-item step="3" label="Select workshop" icon="circle-edit-outline" :type="stepType(3)" :clickable="latestStep > 1">
        <h1 class="title has-text-centered">Create a workshop</h1>
        <p class="explainer content">
          We will create the workshop from a <a :href="`https://github.com/${templateRepository}`">template</a>. There are a few steps we need to go through to make sure the version of the template we create for you is properly customised for your workshop.
        </p>
        <SelectWorkshop :template-repository="templateRepository"/>
      </b-step-item>

      <b-step-item step="4" label="Customize workshop" icon="check-box-multiple-outline" :type="stepType(4)" :clickable="latestStep > 2">
        <h1 class="title has-text-centered">Customize workshop</h1>
        <CustomiseWorkshop @pickLesson="activeStep = 5"/>
      </b-step-item>

      <b-step-item step="5" label="Schedule" icon="check-box-multiple-outline" :type="stepType(5)" :clickable="latestStep > 3">
        <h1 class="title has-text-centered">Construct schedule</h1>
        <MakeSchedule/>
      </b-step-item>
    </b-steps>
  </div>
</template>

<script>
import SelectWorkshop from './components/SelectWorkshop'
import GitHubLogin from './components/GitHubLogin'
import CustomiseWorkshop from "./components/CustomiseWorkshop";
import store from './store/store.js'
import MakeSchedule
  from "./components/MakeSchedule";
import GitHubMenu from "@/components/GitHubMenu";

export default {
  name: 'App',
  components: {
    GitHubMenu,
    MakeSchedule,
    SelectWorkshop,
    GitHubLogin,
    CustomiseWorkshop
  },
  data: function() {
    return {
      templateRepository: "UKRN-Open-Research/workshop-template",
      activeStep: 0,
      preambleRead: false,
      workshopTemplate: null,
    }
  },
  computed: {
    latestStep: function() {
      if(this.$store.getters['workshop/Repository']() &&
              this.$store.getters['workshop/Repository']().config)
        return 4;
      if(this.$store.getters['workshop/Repository']())
        return 3;
      if(this.$store.state.github.login)
        return 2;
      if(this.preambleRead || this.$store.state.github.code !== "")
        return 1;
      return 0;
    }
  },
  watch: {
    latestStep: function(value) {
      this.activeStep = value;
    }
  },
  methods: {
    readPreamble: function() {
      this.preambleRead = true;
      this.activeStep = 1;
    },
    stepType: function(myStepNum) {
      const n = myStepNum - 1;
      if(this.latestStep > n)
        return 'is-success';
      // if(this.latestStep === n)
      //   return 'is-info';
      return '';
    },
  },
  mounted() {
    const match = /\?code=([a-z0-9]+)/.exec(window.location.search);
    if(match && match[1])
      this.$store.dispatch('tryGitHubCode', match[1]);
    this.activeStep = this.latestStep;
  },
  store: store
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

// Import Bulma's core
@import "~bulma/sass/utilities/_all";

// Set your colors
$primary: #8c67ef;
$primary-light: findLightColor($primary);
$primary-dark: findDarkColor($primary);
$primary-invert: findColorInvert($primary);
$twitter: #4099FF;
$twitter-invert: findColorInvert($twitter);

// Lists and maps
$custom-colors: null !default;
$custom-shades: null !default;

// Setup $colors to use as bulma classes (e.g. 'is-twitter')
$colors: mergeColorMaps(
                (
                        "white": (
                                $white,
                                $black,
                        ),
                        "black": (
                                $black,
                                $white,
                        ),
                        "light": (
                                $light,
                                $light-invert,
                        ),
                        "dark": (
                                $dark,
                                $dark-invert,
                        ),
                        "primary": (
                                $primary,
                                $primary-invert,
                                $primary-light,
                                $primary-dark,
                        ),
                        "link": (
                                $link,
                                $link-invert,
                                $link-light,
                                $link-dark,
                        ),
                        "info": (
                                $info,
                                $info-invert,
                                $info-light,
                                $info-dark,
                        ),
                        "success": (
                                $success,
                                $success-invert,
                                $success-light,
                                $success-dark,
                        ),
                        "warning": (
                                $warning,
                                $warning-invert,
                                $warning-light,
                                $warning-dark,
                        ),
                        "danger": (
                                $danger,
                                $danger-invert,
                                $danger-light,
                                $danger-dark,
                        ),
                ),
                $custom-colors
);

// Links
$link: $primary;
$link-invert: $primary-invert;
$link-focus-border: $primary;

// Import Bulma and Buefy styles
@import "~bulma";
@import "~buefy/src/scss/buefy";
</style>
