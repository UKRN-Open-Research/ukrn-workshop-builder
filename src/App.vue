<template>
  <div id="app" class="">
    <GitHubMenu/>
    <b-steps
            v-model="activeStep"
            :has-navigation="false"
    >
      <b-step-item step="1" label="Info" icon="information-outline" :type="stepType(1)" :clickable="true">
        <h1 class="title has-text-centered">Account</h1>
        <b-message class="is-info">
          <p>This website will guide you through the process of taking our template workshop and adapting it to create a workshop website customised for your needs.</p>
          <p>The websites are GitHub repositories which are monitored and hosted as websites. This means you will need a <a href="https://github.com/">GitHub account</a>. If you do not have one already, you can <a href="https://github.com/join/">create one for free</a>.</p>
        </b-message>
        <p class="explainer content">
          <a href="https://github.com/" title="GitHub is a version-control and collaborative working platform.">GitHub.com</a> is used to create your workshop website. We use a part of GitHub called <em>GitHub Pages</em> which will take a <b-tooltip label="A repository is a collection of files making up a project" dashed>repository</b-tooltip> and turn it into a website.
        </p>
        <p class="explainer content">If you don't have a GitHub account, you will be able to create one here.</p>
        <GitHubLogin/>
      </b-step-item>

      <b-step-item step="2" label="Select workshop" icon="circle-edit-outline" :type="stepType(2)" :clickable="latestStep >= 1">
        <h1 class="title has-text-centered">Create a workshop</h1>
        <p class="explainer content">
          We will create the workshop from a template. There are a few steps we need to go through to make sure the version of the template we create for you is properly customised for your workshop.
        </p>
        <SelectWorkshop/>
      </b-step-item>

      <b-step-item step="3" label="Customize workshop" icon="check-box-multiple-outline" :type="stepType(3)" :clickable="latestStep >= 2">
        <h1 class="title has-text-centered">Customize workshop</h1>
        <CustomiseWorkshop @pickLesson="activeStep = 4" @goToCreateWorkshop="activeStep = 1"/>
      </b-step-item>

      <b-step-item step="4" label="Schedule" icon="check-box-multiple-outline" :type="stepType(4)" :clickable="latestStep >= 3">
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
import Vuex from 'vuex'
Vue.use(Vuex);
import store from './store/store.js'
import MakeSchedule
  from "./components/MakeSchedule";
import GitHubMenu from "@/components/GitHubMenu";
import Vue
  from "vue";

/**
 * @description The UKRN Workshop Builder is an interface for GitHub that enables users to clone and customise GitHub Pages websites based on The Carpentries' workshop template. Users require a GitHub account. Once they have logged in an authorised the app to make changes on their behalf, they can create a new workshop website using the tool (creating a new GitHub repository), find content created by other users of the tool, and customise content.
 *
 * @vue-data activeStep=0 {Number} Progression stage through the workshop creation and customisation process. Used to navigate between the Buefy step children.
 * @vue-data preambleRead=false {Boolean} Whether the user has read the initial preamble and attempted to log into GitHub.
 * @vue-data workshopTemplate=null {null} Currently unused.
 *
 * @vue-computed configReady {Boolean} Whether the configuration file (_config.yml) of the user's main repository is complete and well formatted.
 * @vue-computed latestStep {Number} The most advanced step the user should be able to access in the create-and-customise process.
 * @vue-computed lastError {Array<Error>} The most recent error from any of the store components.
 *
 */
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
      activeStep: 0,
      preambleRead: false,
      workshopTemplate: null,
    }
  },
  computed: {
    configReady() {
      const R = this.$store.getters['workshop/Repository']();
      if(!R)
        return false;
      if(!R.config)
        return false;
      if(!this.$store.getters['workshop/isConfigValid'](R.config) ||
              this.$store.getters['workshop/hasChanged'](R.config.url)
      )
        return false;
      return true;
    },
    latestStep: function() {
      // Check for a valid config file
      if(this.configReady &&
              this.$store.getters['workshop/Repository']().episodes.filter(
                      f => f.yaml && f.yaml.day
              ).length > 0
      )
        return 4;
      if(this.configReady)
        return 3;
      // Check for a main repository
      if(this.$store.getters['workshop/Repository']())
        return 2;
      // Check for github login
      if(this.$store.getters['github/login'])
        return 1;
      return 0;
    },
    lastError: function() {
      return [
        this.$store.state.github.errors[this.$store.state.github.errors.length - 1],
        this.$store.state.template.errors[this.$store.state.template.errors.length - 1],
        this.$store.state.workshop.errors[this.$store.state.workshop.errors.length - 1]
      ];
    }
  },
  watch: {
    latestStep: function(value) {
      this.activeStep = value;
    },
    lastError: function(n, o) {
      if(n.length) {
        const e = n.filter(e => !o.includes(e))[0];
        console.error(e);
        this.$buefy.toast.open({
          message: e,
          type: "is-danger",
          duration: 5000
        });
      }
    }
  },
  methods: {
    /**
     * Calculate the appropriate Buefy style string for a step.
     * @param myStepNum {Number} Number of the step.
     * @return {string} 'is-success' if the step is complete, otherwise ''
     */
    stepType: function(myStepNum) {
      const n = myStepNum - 1;
      if(this.latestStep > n)
        return 'is-success';
      // if(this.latestStep === n)
      //   return 'is-info';
      return '';
    }
  },
  mounted() {this.activeStep = this.latestStep},
  store: new Vuex.Store(store)
}
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 1em;
}
.modal-close {
  background-color: darkgrey !important;
  z-index: 100000;
}
.full-wide {
  width: 100%;
  textarea.match-height {min-height: unset; height: auto;}
}
.size-note {padding: .5em;}

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
