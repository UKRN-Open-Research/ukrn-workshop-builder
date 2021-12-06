<template>
  <section>
    <div v-if="!$store.getters['workshop/Repository']() || !currentTemplate">
      <section class="card">
        <div class="card-content">
          <p>No workshop detected.</p>
          <b-button label="Go to create workshop section"
                    icon-left="arrow-left"
                    type="is-warning"
                    @click="$emit('goToCreateWorkshop')"
          />
        </div>
      </section>
    </div>
    <div v-else>
      <section class="card">
        <header class="card-header">
          <h1 class="card-header-title">Customise repository configuration</h1>
        </header>
        <div class="card-content">
          <b-button class="content" icon-left="cog" type="is-warning" @click="editConfig" outlined>
            <b-tooltip label="Editing the _config.yml file directly can break things. If you know what you're doing, however, it can be quicker than using the form. Updates will save automatically, and can be pushed to GitHub using the 'Save changes' button at the bottom of this page."
                       multilined
                       dashed
                       position="is-right"
            >Edit _config.yml</b-tooltip>
          </b-button>
        </div>

        <div class="card-content">
          <p class="">
            We have created a configuration file for your workshop. Now we will go through some steps to customise the file. If you would like to, you can skip these steps and/or customise the _config.yml file yourself using this button.
          </p>
          <p class="">When you have made your changes, use the 'Save changes' button below to push them to your GitHub repository.</p>
        </div>
        <WorkshopProperties :template="currentTemplate"
                            @refresh="refresh"
                            class="card-content"
        />

        <nav class="card-content">
          <b-button v-if="!$store.getters['workshop/hasChanged'](template.url)"
                    icon-right="chevron-right"
                    type="is-primary"
                    @click="$emit('pickLesson')"
          >
            Pick lessons
          </b-button>
          <b-button v-else
                    @click="pushConfig"
                    :disabled="!$store.getters['workshop/isConfigValid'](template)"
                    :type="$store.getters['workshop/isConfigValid'](template)? 'is-primary' : 'is-warning'"
          >
            <b-tooltip v-if="!$store.getters['workshop/isConfigValid'](template)"
                       label="The current config file is invalid."
                       dashed
            >
              Save changes to GitHub
            </b-tooltip>
            <span v-else>
          Save changes to GitHub
        </span>
          </b-button>
        </nav>
      </section>

      <b-modal v-model="isEditingTemplate"
               class="fullscreen-modal"
               scroll="keep"
               @open="currentTemplate = template"
               @close="template = currentTemplate"
               full-screen
      >
        <div class="card" v-if="currentTemplate">
          <header class="card-header-title">Edit template (saved automatically)</header>
          <mavon-editor class="card-content"
                        v-model="currentTemplate.content"
                        language="en"
                        defaultOpen="edit"
          />
        </div>
      </b-modal>
    </div>
    <b-loading :active="$store.state.workshop.busyFlags.length !== 0" :is-full-page="false"/>
  </section>
</template>

<script>
import WorkshopProperties from "./WorkshopProperties";

/**
 * @description The CustomiseWorkshop component provides an interface for editing the YAML properties detailed in the main workshop's _config.yml file. This is accomplished by providing a form that allows users to change the properties of the YAML fields in constrained ways. Advanced users may edit the file directly using the mavon-editor.
 *
 * @requires mavon-editor
 *
 * @vue-data currentTemplate=null {File} Config file of the main repository in local memory.
 * @vue-data isEditingTemplate=false {Boolean} Whether the template is being edited.
 * @vue-data bannerImg=null {null} Currently unsupported.
 *
 * @vue-computed template {File} Config file of the main repository in the store.
 * @vue-computed configIssues {Array<Error>} List of compile issues with the current template.
 */
export default {
  name: 'CustomiseWorkshop',
  components: {WorkshopProperties},
  props: {},
  data: function() {
    return {
      currentTemplate: null,
      isEditingTemplate: false,
      bannerImg: null
    }
  },
  computed: {
    template: {
      get() {
        try{return this.$store.getters['workshop/Repository']().config}
        catch(e){return null}
      },
      set(v) {this.$store.dispatch('workshop/setFileContent',
              {url: v.url, content: v.content})}
    },
    configIssues() {
      const warnings = this.$store.getters['workshop/listConfigErrors'](this.currentTemplate);
      return [...Object.keys(warnings).map(k => warnings[k])];
    }
  },
  watch: {
    template(newValue) {this.currentTemplate = newValue}
  },
  methods: {
    /**
     * Begin direct template editing.
     */
    editConfig: function() {
      this.currentTemplate = this.template;
      this.isEditingTemplate = true;
    },
    /**
     * Upload the local config to GitHub.
     * @return {Promise<BNoticeComponent>}
     */
    pushConfig: function() {
      const self = this;
      return this.$store.dispatch('workshop/pushFile', {url: self.template.url})
              .then(() => self.$store.dispatch('workshop/setTopics', {
                topics: [self.template.yaml.topic]
              }))
              .then(F => self.$buefy.toast.open({
                message: F?
                        'Pushed changes to GitHub' :
                        'An error occurred while pushing changes to GitHub',
                type: F? 'is-success' : 'is-danger'
              }));
    },
    /**
     * Reload the template from the store, discarding unsaved changes.
     */
    refresh() {this.currentTemplate = this.template}
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .fullscreen-modal > * {padding: 1em;}
</style>
