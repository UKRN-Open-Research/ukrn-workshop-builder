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

/**
 * @typedef Field
 * @description A Field describes a YAML field's properties.
 * @property name {string} Name of the field
 * @property type {string} Basic data type of the field.
 * @property is_required {boolean} Whether the field is required.
 * @property is_array {boolean} Whether the field has an array of values.
 * @property format {string} Special formatting rules to use for the field.
 * @property special {string|Array<string>} Special tags governing how the field is rendered in the Workshop Builder Tool
 * @property value {any|Array<any>} Value for the field.
 * @property key {string} Key used to retrieve the field in the template metadata.
 */

/**
 * @description The CustomiseItem component performs the majority of the work involved in editing individual GitHub markdown files. An item in this component makes available various detailed views depending upon what is relevant for that item.
 *
 * Items that are already part of the main repository and are well-specified allow editing of YAML headers (if applicable) using a form and body content using a markdown editor. Files that are not well-specified allow editing of the raw file content. Items that have been modified in this way make available an option to push the changes to GitHub.
 *
 * Items from other repositories are made available to install into the main repository. They also offer the opportunity to view the YAML headers and body content side-by-side.
 *
 * Items assigned to a day in the scheduler allow removing the item back to the stash, and stashed items allow removing the item from the stash entirely. Stashed items that belong to the main repository can be deleted (rather than simply dropped).
 *
 * All items include a link to where their content can be viewed in the rendered website.
 *
 * @vue-prop item {File} The markdown file object being customised.
 * @vue-prop [overrideName] {String} A name to use instead of the item's YAML name field.
 * @vue-prop [overrideLink] {String} A link to use instead of the item's episode-adjusted path.
 * @vue-prop [noYAML=false] {Boolean} Whether the item is missing YAML information.
 * @vue-prop [addButtons=[]] {Array<String>} Names of buttons to add to the item, overriding the default presence/absence determination for those buttons.
 * @vue-prop [removeButtons=[]] {Array<String>} Names of buttons not to add to the item, overriding the default presence/absence determination for those buttons.
 * @vue-prop [start] {Array<Number>} The start time of the item, as an array of [minutes, hours], each of which is a number.
 * @vue-prop [end] {Array<Number>} The end time of the item, as an array of [minutes, hours], each of which is a number.
 *
 * @vue-data isViewing=false {Boolean} Whether the user is viewing the details of the item. Updates store.editingItem via watcher.
 * @vue-data isEditing=false {Boolean} Whether the user is editing the details of the item. Updates store.editingItem via watcher.
 * @vue-data isEditingContent=false {Boolean} Whether the user is editing the content of the item. Updates store.editingItem via watcher.
 * @vue-data isEditingRawContent=false {Boolean} Whether the user is editing the raw content of the item. Updates store.editingItem via watcher.
 * @vue-data currentContent="" {String} The current content of the item.
 * @vue-data currentRawContent="" {String} The current raw content of the item.
 * @vue-data iconSize='is-small' {String} Buefy size class for the icons.
 * @vue-data toolbars=Object {Object} {@link https://github.com/hinesboy/mavonEditor#toolbars|mavon-editor toolbar} specification.
 *
 * @vue-computed mainRepo {Repository|null} The main repository being edited.
 * @vue-computed template {String} The template of the main repository.
 * @vue-computed content {String} The content of the item as held in the store.
 * @vue-computed rawContent {String} The raw content of the item as held in the store.
 * @vue-computed Fields {Array<Field>} The YAML fields in the item's content.
 *
 * @vue-event refresh Emit a request to refresh the item's content from the store.
 *
 * @requires mavon-editor
 */
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
     * Find the main repository.
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
     * Find the template attached to the main repository.
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
                    message: `Error updating ${self.item.yaml.title}`,
                    type: 'is-danger'
                  })
                })
                .then(() => self.$buefy.toast.open({
                  message: `Changed ${self.item.yaml.title}.<br/>Remember to save changes to GitHub to update the website.`,
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
                  message: `Changed ${self.item.path}.<br/>Remember to save changes to GitHub to update the website.`,
                  type: `is-info`
                }))
      }
    },
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
    /**
     * Start editing the item's content.
     */
    editContent() {
      this.currentContent = this.content;
      this.isEditingContent = true;
    },
    /**
     * Start editing the item's raw content.
     */
    editRawContent() {
      this.currentRawContent = this.rawContent;
      this.isEditingRawContent = true;
    },
    /**
     * Save the current version of an item.
     * @returns {Promise<void>}
     */
    save({key, value}) {
      const newYAML = {...this.item.yaml};
      newYAML[key] = value;
      return this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.item.url, yaml: newYAML, body: this.item.body})
              .then(() => this.$emit('refresh'))
    },
    /**
     * Install a remote item into the current main repository. Issues a Buefy toast on completion.
     * @returns {Promise<BNoticeComponent>}
     */
    install(episode) {
      console.log(`Install ${episode.path}`)
      const self = this;
      return this.$store.dispatch('workshop/installFile', {url: episode.url})
              .then(F => self.$buefy.toast.open({
                message: F? `Lesson installed as ${F.path}.` : `Error installing ${episode.path}`,
                type: F? `is-success` : `is-danger`
              }))
    },
    /**
     * Iterate through the dependencies for an item and attempt to install the missing ones from the original non-main repository.
     * Issues a Buefy toast on completion.
     * @return {Promise<BNoticeComponent>}
     */
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
    /**
     * Convert an item's link into a link to the item's page when rendered with GitHub pages.
     * @param item {File} The item whose link is required.
     * @return {String}
     */
    getPagesLink(item) {
      const match = /github\.com\/repos\/([^/]+)\/([^/]+)/.exec(item.url);
      const name = /\/([^/]+)$/.exec(item.path);
      const webDir = name[1].replace(/\.[^.]*$/, "");
      return `https://${match[1]}.github.io/${match[2]}/${webDir}/`;
    },
    /**
     * Generate a link from the item's GitHub Pages instance to a specified extension.
     * @param item {File} The item whose link is required.
     * @param link {String} Extra pathing to append to the end of the generated pages link.
     * @return {String}
     */
    getRelativeLink(item, link) {
      const match = /github\.com\/repos\/([^/]+)\/([^/]+)/.exec(item.url);
      return `https://${match[1]}.github.io/${match[2]}${link}`;
    },
    /**
     * Upload an image in the maven-editor and store it for including in a markdown file.
     * @param pos {Number} The index of the image.
     * @param img {Object} The image to store.
     */
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
         * Try to upload the selected image.
         * @memberOf imgAdd
         * @param value {string} Dialogue user input.
         * @param close {function} Callback to close the dialogue.
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
        /**
         * @memberOf imgAdd
         * Remove a temporary image from memory.
         */
        onCancel: () => {this.$refs.editor.$refs.toolbar_left.$imgDelByFilename(img.name)}
      });
    },
    /**
     * Pad a number to two digits with leading zero.
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
