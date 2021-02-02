<template>
  <section class="workshop section light">
    <b-collapse class="card content"
                animation="slide"
                aria-id="select-existing-workshop"
                :open="false"
    >
      <template #trigger="props">
        <div class="card-header"
             role="button"
             aria-controls="select-existing-workshop"
        >
              <span class="card-header-title">Select existing workshop to edit</span>
          <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
        </div>
      </template>

      <div class="card-content">
        <div class="content is-inline-flex">
          <b-icon icon="alert" type="is-warning"/>
          <p>TODO: Here will be a way of selecting existing workshops from your repositories...</p>
        </div>
      </div>
    </b-collapse>

    <section class="card content">
      <header class="card-header">
        <h1 class="card-header-title">Create a new repository</h1>
      </header>
      <div class="columns card-content">
        <div class="column">
          The workshop topic is used to choose which lessons will be likely to be useful for you. You'll still be able to select lessons outside your workshop topic.
        </div>
        <div class="column">
          <div class="is-inline-flex"
               :title="topicListLocked? 'Warning: changing the topic will refresh the template and your changes will be lost.' : ''"
          >
            <b-button v-if="$store.state.template.fetchInProgress" disabled>
              Loading workshop list
              <b-icon/>
              <b-icon custom-class="mdi-spin" icon="loading"/>
            </b-button>
            <b-select v-else
                      placeholder="Select a workshop topic"
                      v-model="workshop" id="selectWorkshop"
                      :disabled="$store.state.template === null || topicListLocked"
            >
              <option v-if="!topicList.length" disabled>Fetching workshop list</option>
              <option v-for="topic in topicList" v-bind:value="topic.value" v-bind:key="topic.value">
                {{ topic.name }}
              </option>
            </b-select>
            <div @mouseenter="iconLocked = false"
                 @mouseleave="iconLocked = true"
            >
              <b-button v-if="topicListLocked"
                        :icon-left="iconLocked? 'lock' : 'lock-open'"
                        :type="template === $store.state.workshop.baseConfig? 'is-info' : 'is-danger'"
                        @click="topicListLocked = false"
              >
                Unlock
              </b-button>
            </div>
          </div>
        </div>
      </div>
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
      <div class="card-content">
        <b-button icon-left="github"
                  @click="pushWorkshop"
                  expanded
        >
          Create repository {{ $store.state.github.login }}/ukrn-{{ workshopTopic }}-workshop
        </b-button>
      </div>

    </section>

    <nav class="content"
         v-if="$store.state.workshop.pushed"
    >
      <b-button icon-right="chevron-right"
                type="is-primary"
                @click="$emit('pickLesson')"
      >
        Pick lessons
      </b-button>
    </nav>

    <b-modal v-model="isEditingTemplate" scroll="keep" @close="toastSave">
      <div class="card">
        <header class="card-header-title">Edit template (saved automatically)</header>
        <mavon-editor class="card-content" v-model="currentTemplate" language="en" defaultOpen="edit"/>
      </div>
    </b-modal>
  </section>
</template>

<script>
export default {
  components: {
  },
  name: 'SelectWorkshop',
  props: {
    templateRepository: {type: String, required: false}
  },
  data: function() {
    return {
      status: {content: "Fetching Workshop Template details...", class: "is-info", details: null},
      currentTemplate: this.template,
      topicList: [],
      isEditingTemplate: false,
      topicListLocked: false,
      iconLocked: true
    }
  },
  computed: {
    workshop: {
      get: function() {return this.$store.state.workshop},
      set: function(topic) {
        this.topicListLocked = true;
        let cfg = this.$store.state.template.master;
        cfg = cfg.replace(/^workshop-topic:.+$/gm, `workshop-topic: "${ymlClean(topic, true)}"`);
        this.$store.dispatch('initWorkshop', cfg);
        this.currentTemplate = this.template;
      },
    },
    template: {
      get: function() {return this.$store.state.workshop.config},
      set: function(v) {
        console.log('workshop/updateConfig')
        this.$store.commit('workshop/updateConfig', v);
        this.currentTemplate = this.template;
        this.$forceUpdate();
      }
    },
    templateDirty: function() {return this.currentTemplate !== this.template},
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
        this.toastSave();
      }
    },
    workshopTopic: function() {
      const match = /^workshop-topic: "(.+)"$/gm.exec(this.currentTemplate);
      if(match)
        return match[1];
      return "";
    }
  },
  methods: {
    refreshTemplate: function() {
      console.log(`refreshTemplate(${this.templateRepository})`)
      if(this.$store.state.template.fetchInProgress || this.templateRepository === "" || this.topicList.length)
        return;
      this.$store.dispatch('fetchTemplateMaster', this.templateRepository)
        .then(() => {
          this.findWorkshops();
          setTimeout(this.refreshTemplate, 100);
        });
    },
    findWorkshops: function() {
      const match = /#: WORKSHOP TOPICS :#\n(.+\n)+#\/#/g.exec(this.$store.state.template.master);
      if(!match)
        return;
      const text = match[0];
      const _list = [];
      const re = /\n# (.+)/g;
      let m;
      do {
        m = re.exec(text);
        if (m) {
          const value = m[1];
          const name = value.split('-')
                  // Capitalize
                  .map(x => x.replace(/\w\S*/g, s => s.charAt(0).toUpperCase() + s.substr(1)))
                  .join(' ');
          _list.push({name, value});
        }
      } while (m);
      this.topicList = _list;
    },
    editConfig: function() {
      this.currentTemplate = this.template;
      this.isEditingTemplate = true;
    },
    toastSave: function() {
      if(this.templateDirty) {
        this.$buefy.toast.open({
          message: '_config.yml file updated',
          type: 'is-success'
        });
        this.template = this.currentTemplate;
      }
    },
    pushWorkshop: function() {
      this.toastSave();
      this.$store.dispatch('pushWorkshopToGitHub')
    }
  },
  mounted() {
    this.refreshTemplate()
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
