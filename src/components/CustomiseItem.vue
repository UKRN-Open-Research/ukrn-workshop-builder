<template>
  <div class="content yaml-panel">
    {{ item.name }}
    <div v-if="$store.getters['workshop/Repository']().episodes.map(e => e.url).includes(item.url)"
         class="yaml-item-wrapper">
      <YAMLField
                       v-for="field in Fields"
                       :key="`${item.url}-${field.key}`"
                       :field="field"
                       @save="save"
      />
    </div>
    <div v-else class="content yaml-panel">
      <div v-for="f in Fields.filter(f => f.value !== undefined)"
           :key="f"
      >
        <span class="title">{{f}}</span> {{ item.yaml[f] }}
      </div>
    </div>
    <b-button @click="editContent" label="Edit content"/>

    <b-modal v-model="isEditingContent"
             scroll="keep"
             @close="content = currentContent"
    >
      <div class="card" v-if="currentContent">
        <header class="card-header-title">Edit content (saved automatically)</header>
        <mavon-editor class="card-content"
                      v-model="currentContent"
                      language="en"
                      defaultOpen="edit"
        />
      </div>
      <div v-else>
        <b-message type="is-warning">Unable to load episode body.</b-message>
      </div>
    </b-modal>
  </div>
</template>

<script>
import YAMLField from "./YAMLField";
export default {
  name: 'CustomiseItem',
  components: {YAMLField},
  props: {
    item: {type: Object, required: true} // list of episodes selected
  },
  data: function() {
    return {
      isEditingContent: false,
      currentContent: ""
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
    }
  },
  watch: {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .yaml-panel {
    display: grid;
    grid-auto-flow: row;
    grid-row-gap: 1em;
  }
  .yaml-item-wrapper {
    display: grid;
    min-width: 45%;
  }
</style>