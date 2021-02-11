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
        <b-button class="card-content" icon-left="cog" type="is-warning" @click="editConfig" outlined>
          <b-tooltip label="Editing the _config.yml file directly can break things. If you know what you're doing, however, it can be quicker than using the form. Updates will save automatically, and can be pushed to GitHub using the 'Save changes' button at the bottom of this page."
                     multilined
                     dashed
                     position="is-right"
          >Edit _config.yml</b-tooltip>
        </b-button>
        <div class="card-content">
          <p class="">
            We have created a configuration file for your workshop. Now we will go through some steps to customise the file. If you would like to, you can skip these steps and/or customise the _config.yml file yourself using this button.
          </p>
          <p class="">When you have made your changes, use the 'Save changes' button below to push them to your GitHub repository.</p>
        </div>
        <div class="card-content">
          <b-field label="Workshop name"
                   label-position="on-border"
                   :message="configIssues['title']"
                   :type="configIssues['title']? 'is-danger' : ''"
                   custom-class="content"
          >
            <b-input v-model="workshopName"/>
          </b-field>
          <b-field label="Workshop topic"
                   label-position="on-border"
                   :message="configIssues['topic']"
                   custom-class="content"
          >
            <b-autocomplete
                    rounded
                    v-model="workshopTopic"
                    :data="$store.state.topicList"
                    placeholder="Start typing to get suggestions"
                    icon="magnify"
                    clearable>
              <template #empty>No matching topics found</template>
            </b-autocomplete>
          </b-field>
        </div>
        <nav class="card-content"
             v-if="!$store.getters['workshop/hasChanged'](template.url)"
        >
          <b-button icon-right="chevron-right"
                    type="is-primary"
                    @click="$emit('pickLesson')"
          >
            Pick lessons
          </b-button>
        </nav>
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
      </section>

      <b-modal v-model="isEditingTemplate"
               scroll="keep"
               @open="currentTemplate = template"
               @close="template = currentTemplate"
      >
        <div class="card" v-if="currentTemplate">
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
      currentTemplate: null,
      isEditingTemplate: false,
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
    },
    workshopTopic: {
      get() {
        try{return this.currentTemplate.yaml['workshop-topic']}
        catch(e) {return null}
      },
      set(t) {
        this.currentTemplate.yaml['workshop-topic'] = t;
        this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.currentTemplate.url, yaml: this.currentTemplate.yaml, body: this.currentTemplate.body})
                .then(() => this.currentTemplate = this.template)
      }
    },
    configIssues() {
      const warnings = {};
      const issues = this.$store.getters['workshop/listConfigErrors'](this.currentTemplate);
      if(issues.includes('no-title') || issues.includes('default-title'))
        warnings.title = "The title cannot be blank or the default workshop title";
      if(issues.includes('no-topic') || issues.includes('default-topic'))
        warnings.topic = `The workshop topic cannot be blank, and should be changed from the default. The suggested topics are: ${this.$store.state.topicList.join(', ')}.`;
      return warnings;
    }
  },
  watch: {
    template(newValue) {this.currentTemplate = newValue}
  },
  methods: {
    editConfig: function() {
      this.currentTemplate = this.template;
      this.isEditingTemplate = true;
    },
    pushConfig: function() {
      const self = this;
      this.$store.dispatch('workshop/pushFile', {url: self.template.url})
              .then(() => self.$store.dispatch('workshop/setTopics', {
                topics: [self.template.yaml['workshop-topic']]
              }))
              .then(F => self.$buefy.toast.open({
                message: F?
                        'Pushed changes to GitHub' :
                        'An error occurred while pushing changes to GitHub',
                type: F? 'is-success' : 'is-danger'
              }));
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
