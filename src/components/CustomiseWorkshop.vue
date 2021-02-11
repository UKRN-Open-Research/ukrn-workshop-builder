<template>
  <section>
    <div v-if="!currentTemplate">
      <p>No workshop detected.</p>
      <b-button label="Go to create workshop section" icon-left="arrow-left" type="is-warning"/>
    </div>
    <div v-else>
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

      <b-modal v-model="isEditingTemplate"
               scroll="keep"
               @open="currentTemplate = template"
               @close="template = currentTemplate"
      >
        <div class="card" >
          <header class="card-header-title">Edit template (saved automatically)</header>
          <mavon-editor class="card-content" v-model="currentTemplate.content" language="en" defaultOpen="edit"/>
        </div>
      </b-modal>
    </div>
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
        this.$store.dispatch('workshop/setFileContent', {url: v.url, content: v.content});
      }
    },
    localChanges: function() {return this.$store.state.workshop.lastPushedConfig !== this.template},
    workshopName: {
      get() {
        try{return this.currentTemplate.yaml.title}
        catch(e) {return null}
      },
      set(n) {
        this.currentTemplate.yaml.title = n;
        this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.currentTemplate.url, yaml: this.currentTemplate.yaml, body: this.currentTemplate.body})
          .then(() => this.currentTemplate = this.template)
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
  }
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
