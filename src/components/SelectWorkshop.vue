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
        <div class="content">
          Here will be a way of selecting existing workshops from your repositories...
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
          <b-select
                  :placeholder="$store.state.template.fetchInProgress? 'Loading workshop list' : 'Select a workshop topic'"
                  :class="$store.state.template.fetchInProgress? 'is-loading' : ''"
                  v-model="workshop" id="selectWorkshop"
                  :disabled="$store.state.template === null || $store.state.template.fetchInProgress"
          >
            <option v-if="!topicList.length" disabled>Fetching workshop list</option>
            <option v-for="topic in topicList" v-bind:value="topic.value" v-bind:key="topic.value">
              {{ topic.name }}
            </option>
          </b-select>
          <div v-if="workshop" class="column">
            <b-button @click="refreshTemplate" class="is-info is-inverted">Refresh workshop template details</b-button>
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
          <header class="column"><h2 class="title"><TextEditable v-model="workshopName"/></h2></header>
        </div>
      </div>

    </section>

    <b-modal v-model="isEditingTemplate" scroll="keep" @close="toastSave">
      <div class="card">
        <header class="card-header-title">Edit template (saved automatically)</header>
        <mavon-editor class="card-content" v-model="currentTemplate" language="en" defaultOpen="edit" @change="templateDirty = currentTemplate === template"/>
      </div>
    </b-modal>
  </section>
</template>

<script>
  import TextEditable from "./TextEditable";
export default {
  components: {
    TextEditable
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
      templateDirty: false
    }
  },
  computed: {
    workshop: {
      get: function() {return this.$store.state.workshop},
      set: function(topic) {
        this.$store.dispatch('initWorkshop', {
          topic, template: this.$store.state.template.master
        });
      },
    },
    template: {
      get: function() {return this.$store.state.workshop.config},
      set: function(v) {this.$store.commit('workshop/updateConfig', v)}
    },
    workshopName: {
      get: function() {console.log(this.$store.getters['workshop/name']);return this.$store.getters.workshop.name},
      set: function(n) {this.$store.commit('workshop/updateName', n)}
    }
  },
  methods: {
    refreshTemplate: function() {
      if(this.$store.state.template.fetchInProgress || this.templateRepository === "")
        return;
      this.$store.dispatch('fetchTemplateMaster', this.templateRepository)
        .then(() => this.findWorkshops());
    },
    findWorkshops: function() {
      if(this.$store.state.template.master === null)
        return;
      const text = /#: WORKSHOP TOPICS :#\n(.+\n)+#\/#/g.exec(this.$store.state.template.master)[0];
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
        this.templateDirty = false;
        this.$buefy.toast.open({
          message: '_config.yml file updated',
          type: 'is-success'
        });
        this.template = this.currentTemplate;
      }
    },
    save: function(child) {
      this.$emit('save', {
        ...child,
        name: this.workshopName,
        template: this.template
      })
    }
  },
  mounted() {
    this.refreshTemplate();
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
