<template>
  <div class="item-wrapper">
    <div class="card-header episode" :class="item.yaml && item.yaml['is-break']? 'has-background-light' : item.remote? 'has-background-info-light' : 'has-background-primary-light'">
      <span class="time" v-if="start && end">
        {{ pad(start[0]) }}:{{ pad(start[1]) }}<br/>{{ pad(end[0]) }}:{{ pad(end[1]) }}
      </span>
      <span class="card-header-title">
        <span v-if="overrideName">{{ overrideName }}</span>
        <EpisodeName v-else :episode="item" :include-repo="item.remote"/>
      </span>
      <div class="action-icons has-background-white-ter" v-if="mainRepo">
        <b-button v-if="item.remote && item.yaml.day"
                  icon-right="plus"
                  :size="iconSize"
                  type="is-success"
                  title="Install remote lesson"
                  @click="install(item)"
        />
        <b-button v-else-if="item.hasChanged() && (item.yaml.day || addButtons.includes('save'))"
                  icon-right="content-save"
                  :size="iconSize"
                  type="is-success"
                  title="Save changes to GitHub"
                  @click="$store.dispatch('workshop/pushFile', {url: item.url})"
        />
        <b-button v-if="item.remote || !item.yaml.day && !removeButtons.includes('properties')"
                  icon-right="text-search"
                  :size="iconSize"
                  type="is-info"
                  title="View properties"
                  @click="isViewing = true"
        />
        <!-- We use the title yaml field to determine if the yaml is valid -->
        <b-button v-if="(!item.remote && item.yaml.day && item.yaml.title && !removeButtons.includes('properties')) || addButtons.includes('properties')"
                  icon-right="playlist-edit"
                  :size="iconSize"
                  type="is-info"
                  title="Edit properties"
                  @click="isEditing = true"
        />
        <b-button v-if="(!item.remote && item.yaml.day && item.yaml.title && !removeButtons.includes('edit')) || addButtons.includes('edit')"
                  icon-right="file-document-edit-outline"
                  :size="iconSize"
                  type="is-info"
                  title="Edit content"
                  @click="editContent"
        />
        <b-button v-if="(!item.remote && item.yaml.day && !item.yaml.title && !removeButtons.includes('repair')) || addButtons.includes('repair')"
                  icon-right="wrench"
                  :size="iconSize"
                  type="is-info"
                  title="Repair raw content"
                  @click="editRawContent"
        />
        <b-button v-else-if="noYAML"
                  icon-right="file-document-edit-outline"
                  :size="iconSize"
                  type="is-info"
                  title="Edit content"
                  @click="editRawContent"
        />
        <b-button v-if="!removeButtons.includes('link')"
                  tag="a"
                  :href="overrideLink? getRelativeLink(item, overrideLink) : getPagesLink(item)"
                  target="_blank"
                  type="is-dark"
                  title="Open lesson website in a new tab"
                  icon-right="link"
                  :size="iconSize"
        />
        <b-button v-if="item.yaml.day && item.yaml.ukrn_wb_rules && item.yaml.ukrn_wb_rules.includes('remove-on-stash') && !removeButtons.includes('drop')"
                  icon-right="minus"
                  :size="iconSize"
                  title="Remove this lesson"
                  @click="$store.commit('workshop/removeItem', {array: 'files', item})"
                  type="is-danger"
        />
        <b-button v-else-if="item.yaml.day && !removeButtons.includes('drop')"
                  icon-right="arrow-right"
                  :size="iconSize"
                  title="Move to stash"
                  @click="$emit('remove', item)"
                  type="is-warning"
        />
        <b-button v-else-if="!item.yaml.day && item.remote && !removeButtons.includes('drop')"
                  icon-right="minus"
                  :size="iconSize"
                  title="Remove this lesson"
                  @click="$store.commit('workshop/removeItem', {array: 'files', item})"
                  type="is-danger"
        />
        <b-button v-else-if="!item.yaml.day && !item.remote && !(item.yaml.ukrn_wb_rules && item.yaml.ukrn_wb_rules.includes('undeletable')) && !removeButtons.includes('drop')"
                  icon-right="minus"
                  :size="iconSize"
                  title="Delete"
                  @click="$store.dispatch('workshop/deleteFile', {url: item.url})"
                  type="is-danger"
        />
      </div>

      <b-modal v-model="isEditing" class="yaml-modal" full-screen v-if="mainRepo">
        <b-button v-if="item.yaml.missingDependencies && item.yaml.missingDependencies.length"
                  label="Install missing dependencies"
                  type="is-warning"
                  @click="installMissingDependencies(item)"
                  icon-left="hammer-screwdriver"
        />
        <YAMLField
                v-for="field in Fields"
                :key="`${item.url}-${field.key}`"
                :field="field"
                @save="save"
        />
      </b-modal>

      <b-modal v-model="isViewing" class="yaml-modal yaml-read-only" full-screen v-if="mainRepo">
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
               v-if="mainRepo"
      >
        <div class="card" v-if="currentContent !== null">
          <header class="card-header-title">Edit content (saved automatically)</header>
          <mavon-editor class="card-content"
                        v-model="currentContent"
                        language="en"
                        defaultOpen="edit"
                        :toolbars="toolbars"
                        @imgAdd="imgAdd"
                        @save="content = currentContent"
                        ref="editor"
          />
        </div>
        <div v-else>
          <b-message type="is-warning">Unable to load lesson content.</b-message>
        </div>
      </b-modal>

      <b-modal v-model="isEditingRawContent"
               scroll="keep"
               @close="rawContent = currentRawContent"
               full-screen
               v-if="mainRepo"
      >
        <div class="card" v-if="currentRawContent !== null">
          <header class="card-header-title">Edit content (saved automatically)</header>
          <b-message v-if="/\.html/.test(item.path)" class="is-warning">
            This file is written in HTML. Please make sure to edit it carefully so that it remains valid. If you do not know how to do this, get help with editing it.
          </b-message>
          <mavon-editor class="card-content"
                        v-model="currentRawContent"
                        language="en"
                        defaultOpen="edit"
                        :tabSize="2"
                        :toolbars="{...toolbars, imagelink: false}"
                        @save="rawContent = currentRawContent"
          />
        </div>
        <div v-else>
          <b-message type="is-warning">Unable to load lesson content.</b-message>
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
    item: {type: Object, required: true}, // list of episodes selected
    overrideName: {type: String, required: false},
    overrideLink: {type: String, required: false},
    noYAML: {type: Boolean, required: false, default: false},
    addButtons: {type: Array, required: false, default: ()=>[]},
    removeButtons: {type: Array, required: false, default: ()=>[]},
    start: {type: Array, required: false},
    end: {type: Array, required: false}
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
        table: true, fullscreen: true, readmodel: true, htmlcode: false, help: true,
        /* 1.3.5 */
        undo: true, redo: true, trash: false, save: true,
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
     * Find the main repository
     * @return {Repository}
     */
    mainRepo() {
      let repo;
      try {
        repo = this.$store.getters['workshop/Repository']();
      }
      catch(e) {throw new Error(`Error retrieving Repository from store: ${e}`)}
        if(typeof repo !== "object" || repo === null)
          throw('No Repository found.');
      return repo;
    },
    /**
     * Find the template attached to the main repository
     * @return {File}
     */
    template() {
      return this.mainRepo.episode_template
    },
    content: {
      get() {return this.item.body},
      set(v) {
        const self = this;
        return this.$store.dispatch('workshop/setFileContentFromYAML', {
          url: this.item.url, yaml: this.item.yaml, body: v
        })
                .catch(e => {
                  console.error(e);
                  self.$buefy.toast.open({
                    message: `Error updating ${self.item.title}`,
                    type: 'is-danger'
                  })
                })
                .then(() => self.$buefy.toast.open({
                  message: `Changed ${self.item.title}`,
                  type: `is-info`
                }))
      }
    },
    rawContent: {
      get() {
        return this.item.content
      },
      set(v) {
        const self = this;
        return this.$store.dispatch('workshop/setFileContent', {
          url: this.item.url,
          content: v
        })
                .catch(e => {
                  console.error(e);
                  self.$buefy.toast.open({
                    message: `Error updating ${self.item.path}`,
                    type: 'is-danger'
                  })
                })
                .then(() => self.$buefy.toast.open({
                  message: `Changed ${self.item.path}`,
                  type: `is-info`
                }))
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
      return this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.item.url, yaml: newYAML, body: this.item.body})
              .then(() => this.$emit('refresh'))
    },
    install(episode) {
      console.log(`Install ${episode.path}`)
      const self = this;
      return this.$store.dispatch('workshop/installFile', {url: episode.url})
              .then(F => self.$buefy.toast.open({
                message: F? `Lesson installed as ${F.path}.` : `Error installing ${episode.path}`,
                type: F? `is-success` : `is-danger`
              }))
    },
    installMissingDependencies(episode) {
      const me = this;
      const currentMissing = [...episode.yaml.missingDependencies];
      return this.$store.dispatch('workshop/installDependencies', {url: episode.url})
        .then(F => {
          const successes = currentMissing.length - F.yaml.missingDependencies.length;
          const failures = F.yaml.missingDependencies.length;
          if(successes && failures)
            me.$buefy.toast.open({
              message: `${successes} missing dependenc${successes > 1? 'ies' : 'y'} fixed; ${failures} remaining. You can try fixing again to repair the rest.`,
              type: 'is-warning'
            })
          else if(failures)
            me.$buefy.toast.open({
              message: 'No missing dependencies. Fixed. If this persists, seek help from the instructors.',
              type: 'is-danger'
            })
          else
            me.$buefy.toast.open({
              message: `${successes} missing dependenc${successes > 1? 'ies' : 'y'} fixed.`,
              type: 'is-success'
            })
        })
    },
    getPagesLink(item) {
      const match = /github\.com\/repos\/([^/]+)\/([^/]+)/.exec(item.url);
      const name = /\/([^/]+)$/.exec(item.path);
      const webDir = name[1].replace(/\.[^.]*$/, "");
      return `https://${match[1]}.github.io/${match[2]}/${webDir}/`;
    },
    getRelativeLink(item, link) {
      const match = /github\.com\/repos\/([^/]+)\/([^/]+)/.exec(item.url);
      return `https://${match[1]}.github.io/${match[2]}${link}`;
    },
    imgAdd(pos, img) {
      console.log({pos, img})
      this.$buefy.dialog.prompt({
        message: `${img.size > 75000? '<p class="has-background-warning-light has-text-warning-dark size-note">Note: <strong>image files over 75kb in size may need to be uploaded to GitHub manually.</strong></p><br/>' : ''}Upload image as /fig/`,
        inputAttrs: {
          type: 'text',
          placeholder: 'filename.png',
          value: img.name
        },
        confirmText: 'Confirm upload',
        trapFocus: true,
        closeOnConfirm: false,
        /**
         * Try to upload the image
         * @param value {string} dialogue user input
         * @param close {function} callback to close
         */
        onConfirm: (value, {close}) => {
          const path = `/fig/${value.replaceAll('../', '/')}`;
          this.$buefy.toast.open({
            message: `Uploading as /fig/${value}...`,
            type: 'is-success is-light'
          });
          this.$store.dispatch('workshop/uploadImage', {path, file: img})
                  .then(r => {
                    if(r) {
                      this.$buefy.toast.open({
                        message: r === true? `Upload successful` : `Upload replaced existing file`,
                        type: r === true? 'is-success' : 'is-warning'
                      });
                      close();
                      this.$refs.editor.$img2Url(pos, `..${path}`);
                    } else {
                      this.$buefy.toast.open({
                        message: `Failed to upload as /fig/${value}`,
                        type: 'is-danger',
                        duration: 10000
                      });
                    }
                  });
        },
        onCancel: () => {this.$refs.editor.$refs.toolbar_left.$imgDelByFilename(img.name)}
      });
    },
    /**
     * Pad a number to two digits with leading zero
     * @param x {Number}
     * @return {string}
     */
    pad(x) {
      if(x < 10)
        return `0${Math.floor(x).toString()}`;
      return Math.floor(x).toString();
    }
  },
  watch: {
    isViewing(newVal) {this.$store.commit('setEditItem', newVal)},
    isEditing(newVal) {this.$store.commit('setEditItem', newVal)},
    isEditingContent(newVal) {this.$store.commit('setEditItem', newVal)},
    isEditingRawContent(newVal) {this.$store.commit('setEditItem', newVal)},
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .time {
    margin-left: .5rem;
    font-size: .8em;
    font-family: monospace;
  }
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
