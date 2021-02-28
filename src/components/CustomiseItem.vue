<template>
  <div class="item-wrapper">
    <div class="card-header episode" :class="item.yaml['is-break']? 'has-background-light' : item.remote? 'has-background-info-light' : 'has-background-primary-light'">
    <span class="card-header-title">
        <EpisodeName :episode="item" :include-repo="item.remote"/>
    </span>
      <div class="action-icons has-background-white-ter">
        <b-button v-if="item.remote && item.yaml.day"
                  icon-right="plus"
                  :size="iconSize"
                  type="is-success"
                  outlined
                  title="Install remote episode"
                  @click="install(item)"
        />
        <b-button v-else-if="item.hasChanged() && item.yaml.day"
                  icon-right="content-save"
                  :size="iconSize"
                  type="is-success"
                  outlined
                  title="Save changes to GitHub"
                  @click="$store.dispatch('workshop/pushFile', {url: item.url})"
        />
        <b-button v-if="item.remote || !item.yaml.day"
                  icon-right="text-search"
                  :size="iconSize"
                  type="is-info"
                  outlined
                  title="View properties"
                  @click="isViewing = true"
        />
        <!-- We use the title yaml field to determine if the yaml is valid -->
        <b-button v-if="!item.remote && item.yaml.day && item.yaml.title"
                  icon-right="playlist-edit"
                  :size="iconSize"
                  type="is-info"
                  outlined
                  title="Edit properties"
                  @click="isEditing = true"
        />
        <b-button v-if="!item.remote && item.yaml.day && item.yaml.title"
                  icon-right="file-document-edit-outline"
                  :size="iconSize"
                  type="is-info"
                  outlined
                  title="Edit content"
                  @click="editContent"
        />
        <b-button v-if="!item.remote && item.yaml.day && !item.yaml.title"
                  icon-right="wrench"
                  :size="iconSize"
                  type="is-info"
                  outlined
                  title="Repair raw content"
                  @click="editRawContent"
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
                  @click="$store.commit('workshop/removeItem', {array: 'files', item})"
                  type="is-danger"
                  outlined
        />
        <b-button v-if="!item.yaml.day && !item.remote && !(item.yaml.ukrn_wb_rules && item.yaml.ukrn_wb_rules.includes('undeletable'))"
                  icon-right="minus"
                  :size="iconSize"
                  title="Delete"
                  @click="$store.dispatch('workshop/deleteFile', {url: item.url})"
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
      </b-modal>

      <b-modal v-model="isViewing" class="yaml-modal yaml-read-only" full-screen>
        <div class="yaml-item-wrapper">
          <header>Viewing <EpisodeName :episode="item"/></header>
          <div class="columns">
            <div class="column yaml-panel">
              <div v-for="f in Fields.filter(x => x.value !== undefined)"
                   :key="f.key"
                   class="yaml-read-only"
              >
                <header class="title">{{ f.name }}</header>
                <ul v-if="f.is_array && item.yaml[f.key] !== null">
                  <li v-for="i in item.yaml[f.key].length" :key="i">
                    {{ item.yaml[f.key][i - 1] }}
                  </li>
                </ul>
                <p v-else-if="!f.is_array">{{ item.yaml[f.key] }}</p>
              </div>
            </div>
            <div class="column">
              <header class="title">Content</header>
              <mavon-editor class="card-content"
                            :value="item.body"
                            language="en"
                            defaultOpen="preview"
                            :subfield="false"
                            :toolbars="{}"
                            :editable="false"
              />
            </div>
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

      <b-modal v-model="isEditingRawContent"
               scroll="keep"
               @close="rawContent = currentRawContent"
               full-screen
      >
        <div class="card" v-if="currentRawContent">
          <header class="card-header-title">Edit content (saved automatically)</header>
          <mavon-editor class="card-content"
                        v-model="currentRawContent"
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
      isViewing: false,
      isEditing: false,
      isEditingContent: false,
      isEditingRawContent: false,
      currentContent: "",
      currentRawContent: "",
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
        this.$store.dispatch('workshop/setFileContentFromYAML', {
          url: this.item.url, yaml: this.item.yaml, body: v
        })
      }
    },
    rawContent: {
      get() {
        return this.item.content
      },
      set(v) {
        this.$store.dispatch('workshop/setFileContent', {
          url: this.item.url,
          content: v
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
    editRawContent() {
      this.currentRawContent = this.rawContent;
      this.isEditingRawContent = true;
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
    height: min-content;
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