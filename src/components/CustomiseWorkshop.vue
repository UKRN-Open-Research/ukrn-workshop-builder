<template>
  <section @mouseenter="loadConfig" @focus="loadConfig">
    <section class="card">
      <header class="card-header">
        <h1 class="card-header-title">Customise repository configuration</h1>
      </header>
      <div class="columns card-content">
        <div class="column">
          <p>
            We have created a configuration file for your workshop. Now we will go through some steps to customise the file. If you would like to, you can skip these steps and/or customise the _config.yml file yourself using this button.
          </p>
          <p>The updates will save automatically after editing. Please only do this if you know what you're doing!</p>
        </div>
        <div class="columns card-content">
          <b-button icon-left="cog" type="is-warning" @click="editConfig">Edit _config.yml</b-button>
        </div>
      </div>
      <div class="columns card-content">
        <div class="column">
          <p>
            Let's give your workshop a customised name. This should include the workshop topic and distinguish it from other workshops on the same topic. Good examples are <em>MRC CBU Preregistration Workshop</em> and <em>Oxford NDORMS Open Data Workshop</em>. Click the current title to edit it.
          </p>
        </div>
        <div class="columns card-content">
          <b-field label="Workshop title">
            <b-input v-model="workshopName"/>
          </b-field>
        </div>
      </div>

    </section>

    <nav class="content"
         v-if="!localChanges"
    >
      <b-button icon-right="chevron-right"
                type="is-primary"
                @click="$emit('pickLesson')"
      >
        Pick lessons
      </b-button>
    </nav>
    <b-button v-else @click="pushConfig">
      Save changes to GitHub
    </b-button>

    <b-modal v-model="isEditingTemplate" scroll="keep" @close="template = currentTemplate">
      <div class="card">
        <header class="card-header-title">Edit template (saved automatically)</header>
        <mavon-editor class="card-content" v-model="currentTemplate" language="en" defaultOpen="edit"/>
      </div>
    </b-modal>
  </section>
</template>

<script>
export default {
  name: 'CustomiseWorkshop',
  props: {},
  data: function() {
    return {
      createNew: true,
      status: {content: "Fetching Workshop Template details...", class: "is-info", details: null},
      currentTemplate: null,
      topicList: [],
      isEditingTemplate: false,
      topicListLocked: false,
      iconLocked: true
    }
  },
  computed: {
    template: {
      get: function() {
        try{return this.$store.getters['workshop/Repository']().config}
        catch(e) {return null}
      },
      set: function(v) {
        this.$store.commit('workshop/setFileContent', {url: v.url, content: v.content});
        this.currentTemplate = this.template;
        this.$forceUpdate();
      }
    },
    localChanges: function() {return this.$store.state.workshop.lastPushedConfig !== this.template},
    workshopName: {
      get: function() {
        const match = /^title: "(.+)"$/gm.exec(this.currentTemplate);
        if(match)
          return match[1];
        return "";
      },
      set: function(n) {
        let C = this.currentTemplate.replace(/^title:.+$/gm, `title: "${ymlClean(n, true)}"`);
        this.currentTemplate = C;
        this.template = this.currentTemplate;
      }
    }
  },
  methods: {
    editConfig: function() {
      this.currentTemplate = this.template;
      this.isEditingTemplate = true;
    },
    pushConfig: function() {
      if(this.localChanges) {
        this.$store.dispatch('commitWorkshopConfigChanges')
          .then(() => {
            this.$buefy.toast.open({
              message: '_config.yml file updated',
              type: 'is-success'
            });
          })
          .catch(e => {
            console.error(e);
            this.$buefy.toast.open({
              message: 'An error occurred while pushing changes to GitHub',
              type: 'is-danger'
            });
          })
      }
    },
    loadConfig: function() {
      if(this.currentTemplate === null)
        this.currentTemplate = this.template;
    }
  }
}

/**
 * Clean a string for YAML
 * @param str {string} input
 * @return {string}
 */
function ymlClean(str, justQuotes = false) {
  let s = str;
  s = s.replace(/'/g, '"');
  if(!justQuotes)
    s = s.replace(/[^a-zA-Z0-9_'; .]/g, '');
  return s;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  $colour-workshop-main: #c4ffe1;
  $colour-workshop-dark: darkgreen;

  .workshop {
    /*background-color: $colour-workshop-main;*/
  }

</style>
