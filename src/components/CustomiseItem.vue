<template>
  <div class="item-wrapper">
    <div :class="`card-header episode ${item.remote? 'remote' : 'local'} ${item.yaml['is-break']? 'is-break' : ''}`">
    <span class="card-header-title">
        <EpisodeName :episode="item"/>
    </span>
      <div class="action-icons">
        <b-button v-if="item.remote && item.yaml.day"
                  icon-right="plus-circle"
                  :size="iconSize"
                  type="is-success"
                  outlined
                  title="Install remote episode"
                  @click="install(item)"
        />
        <b-button v-else-if="item.hasChanged() && item.yaml.day"
                  icon-right="github"
                  :size="iconSize"
                  type="is-success"
                  outlined
                  title="Save changes to GitHub"
                  @click="$store.dispatch('workshop/pushFile', {url: item.url})"
        />
        <b-button v-if="!item.remote && item.yaml.day"
                  icon-right="playlist-edit"
                  :size="iconSize"
                  type="is-info"
                  outlined
                  title="Edit properties"
                  @click="isEditing = true"
        />
        <b-button v-if="!item.remote && item.yaml.day"
                  icon-right="file-document-edit-outline"
                  :size="iconSize"
                  type="is-info"
                  outlined
                  title="Edit content"
                  @click="editContent"
        />
        <b-button tag="a"
                  :href="getPagesLink(item)"
                  target="_blank"
                  type="is-dark"
                  outlined
                  title="Open episode website in a new tab"
                  icon-right="link"
                  :size="iconSize"
        />
        <b-button v-if="item.yaml.day"
                  icon-right="arrow-right"
                  :size="iconSize"
                  title="Move to stash"
                  @click="$emit('remove', item)"
                  type="is-warning"
                  outlined
        />
        <b-button v-if="!item.yaml.day && item.remote"
                  icon-right="minus"
                  :size="iconSize"
                  title="Remove this episode"
                  @click="$store.commit('removeItem', {array: 'files', item})"
                  type="is-danger"
                  outlined
        />
        <b-button v-if="!item.yaml.day && !item.remote && !(item.yaml.ukrn_wb_rules && item.yaml.ukrn_wb_rules.includes('undeletable'))"
                  icon-right="minus"
                  :size="iconSize"
                  title="Delete"
                  @click="$store.commit('deleteFile', {url: item.url})"
                  type="is-danger"
                  outlined
        />
      </div>

      <b-modal v-model="isEditing" class="yaml-modal" full-screen>
        <div v-if="$store.getters['workshop/Repository']().episodes.map(e => e.url).includes(item.url)"
             class="yaml-item-wrapper">
          <b-button v-if="item.yaml.missingDependencies && item.yaml.missingDependencies.length"
                    label="Install missing dependencies"
                    type="is-warning is-light"
                    @click="$store.dispatch('workshop/installDependencies', {url: item.url})"
                    icon-left="hammer-screwdriver"
                    outlined
          />
          <YAMLField
                  v-for="field in Fields"
                  :key="`${item.url}-${field.key}`"
                  :field="field"
                  @save="save"
          />
        </div>
        <div v-else class="content yaml-panel">
          <div v-for="f in Fields.filter(f => f.value !== undefined)"
               :key="f.key"
               class="yaml-read-only"
          >
            <header class="title">{{f.name}}</header>
            <ul v-if="f.is_array">
              <li v-for="i in item.yaml[f.key].length" :key="i">
                {{ item.yaml[f.key][i - 1] }}
              </li>
            </ul>
            <p v-else>{{ item.yaml[f.key] }}</p>
          </div>
        </div>
      </b-modal>

      <b-modal v-model="isEditingContent"
               scroll="keep"
               @close="content = currentContent"
               full-screen
      >
        <div class="card" v-if="currentContent">
          <header class="card-header-title">Edit content (saved automatically)</header>
          <mavon-editor class="card-content"
                        v-model="currentContent"
                        language="en"
                        defaultOpen="edit"
                        :toolbars="toolbars"
          />
        </div>
        <div v-else>
          <b-message type="is-warning">Unable to load episode body.</b-message>
        </div>
      </b-modal>
    </div>
    <b-loading :active="item.busyFlag()" :is-full-page="false"/>
  </div>
</template>

<script>
import YAMLField from "./YAMLField";
import EpisodeName from "./EpisodeName";
export default {
  name: 'CustomiseItem',
  components: {YAMLField, EpisodeName},
  props: {
    item: {type: Object, required: true} // list of episodes selected
  },
  data: function() {
    return {
      isEditing: false,
      isEditingContent: false,
      currentContent: "",
      iconSize: 'is-small',
      toolbars: {
        bold: true, italic: true, header: true, underline: true,
        strikethrough: true, mark: true, superscript: true, subscript: true,
        quote: true, ol: true, ul: true, link: true, imagelink: true, code: true,
        table: true, fullscreen: true, readmodel: true, htmlcode: true, help: true,
        /* 1.3.5 */
        undo: true, redo: true, trash: false, save: false,
        /* 1.4.2 */
        navigation: true,
        /* 2.1.8 */
        alignleft: true, aligncenter: true, alignright: true,
        /* 2.2.1 */
        subfield: true, preview: true
      }
    }
  },
  computed: {
    /**
     * Find the template attached to the main repository
     * @return {{yaml: []}|File}
     */
    template() {
      try {return this.$store.getters['workshop/Repository']().episode_template}
      catch(e) {console.log(e); return {yaml: []};}
    },
    content: {
      get() {return this.item.body},
      set(v) {
        this.item.body = v;
        this.$store.dispatch('workshop/setFileContentFromYAML', {
          url: this.item.url, yaml: this.item.yaml, body: this.item.body
        })
      }
    },
    /**
     * Rip properties and keys from their respective YAML lists and combine
     * @return {{name: string, type: string, is_required: boolean, is_array: boolean, format: string, special: string|string[], value: any, key: string}[]}
     * @constructor
     */
    Fields() {
      // Find the keys
      let keyList = [];
      try {
        keyList = this.template.yaml['ukrn_wb']
                .filter(f => f.fields_structure)[0].fields_structure;
      } catch (e) {throw new Error(`Could not load key list from template.`)}
      // Process each of the fields from the template
      const templateFields = this.template.yaml['ukrn_wb']
                  .filter(f => f.fields)[0].fields;
      const fields = templateFields.map(o => Object.keys(o)[0])
              .filter(f => !/^ukrn_wb$/.test(f));
      const out = [];
      templateFields.forEach((o, n) => {
        if(!Object.keys(o).includes(fields[n]))
          return console.warn(`Skipping unmatched property ${n} ${fields[n]}`);
        const props = {};
        fields.forEach((f, i) => props[keyList[i]] = o[fields[n]][i]);
        out.push({
          ...props, value: this.item.yaml[fields[n]], key: fields[n]
        })
      });
      // Add the actual value
      return out;
    }
  },
  methods: {
    editContent() {
      this.currentContent = this.content;
      this.isEditingContent = true;
    },
    save({key, value}) {
      const newYAML = {...this.item.yaml};
      newYAML[key] = value;
      this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.item.url, yaml: newYAML, body: this.item.body})
              .then(() => this.$emit('refresh'))
    },
    install(episode) {
      console.log(`Install ${episode.path}`)
      const self = this;
      this.$store.dispatch('workshop/installFile', {url: episode.url})
              .then(F => self.$buefy.toast.open({
                message: F? `Episode installed to ${episode.path}.` : `Error installing ${episode.path}`,
                type: F? `is-success` : `is-danger`
              }))
    },
    getPagesLink(item) {
      const match = /github\.com\/repos\/([^/]+)\/([^/]+)/.exec(item.url);
      const name = /\/([^/]+)$/.exec(item.path);
      const webDir = name[1].replace(/\.[^.]*$/, "");
      return `https://${match[1]}.github.io/${match[2]}/${webDir}/`;
    }
  },
  watch: {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .card-header-title {text-align: left;}

  .episode {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    margin: .25em 0;
    width: 100%;
    background-color: lightblue;
    &.remote {background-color: orange;}
    &.is-break.is-break {background-color: lightgrey;}
  }
  .action-icons {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    align-self: start;
    justify-self: right;
    margin-right: .1em;
    margin-top: .1em;
    padding: .25em;
    background-color: #C7F1FF;
    height: min-content;
    border-radius: .1em;
    button {
      margin: auto .25em;
      border-radius: 0;
    }
  }

  .yaml-panel {
    display: grid;
    grid-auto-flow: row;
    grid-row-gap: 1em;
  }
  .yaml-item-wrapper {
    padding: 1em;
    display: grid;
    min-width: 45%;
  }
  .yaml-read-only {
    header {
      font-size: 1em;
      margin-bottom: .25em;
    }
    p, ul {margin: 0}
    ul {text-align: left}
  }
</style>