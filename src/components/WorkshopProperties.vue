<template>
    <div class="yaml-panel">
        <div v-for="Field in Fields"
             :key="Field.key"
             class="yaml-item-wrapper"
        >
            <YAMLField :field="Field" @save="registerSave"/>
        </div>
        <b-loading :active="$store.getters['workshop/isBusy'](template.url) || saving"
                   :is-full-page="false"
        />
    </div>
</template>

<script>
import YAMLField from "./YAMLField";

/**
 * @description The WorkshopProperties component lists the fields described in the workshop metadata and allows a user to customise their content.
 *
 * @vue-prop template {File} Template workshop with metadata describing the fields to display.
 *
 * @vue-data currentValue={} {Object<key, any>} Dictionary of values indexed by YAML keys.
 * @vue-data valueChanged={} {Object<key, boolean>} Dictionary of change flags indexed by YAML keys.
 * @vue-data loadingFileList=true {Boolean} Whether the file list special property of any field is being determined.
 * @vue-data [fileList=[]] {Array<String>} List of files that can be selected as options for certain special fields.
 * @vue-data saving=false {Boolean} Whether the local changes to the fields are being saved to the store.
 * @vue-data saveTimeout=null {null|Number} Timeout index for the store save event.
 * @vue-data minSaveDelay=500 {Number} Minimum delay between editing a field and its content being saved to the store.
 * @vue-data lastSaveTime=0 {Number} Time the last save occurred.
 * @vue-data saveOperations={} {Object} Dictionary of pending save operations.
 * @vue-data [checkboxGroup=[]] {Array} Currently unused.
 *
 * @vue-computed Fields {Array<Field>} YAML Fields that can be edited.
 *
 * @vue-event refresh Signal that the _config.yml file in the store has been changed.
 */
export default {
    name: "WorkshopProperties",
    components: {YAMLField},
    props: {
        template: {type: Object, required: true}
    },
    data: function() {
        return {
            currentValue: {}, // dictionary of values indexed by YAML keys
            valueChanged: {}, // dictionary of change flags indexed by YAML keys
            loadingFileList: true,
            fileList: [],
            saving: false,
            saveTimeout: null,
            minSaveDelay: 500,
            lastSaveTime: 0,
            saveOperations: {},
            checkboxGroup: []
        }
    },
    computed: {
        Fields() {
            const out = [];
            // Find the keys
            const keyList = this.template.yaml['ukrn_wb']
                .filter(f => f.fields_structure)[0].fields_structure;
            // Next, find the properties
            const obj = this.template.yaml['ukrn_wb']
                .filter(f => f.fields)[0].fields;
            const fields = obj.map(o => Object.keys(o)[0]); // Field YAML keys
            obj.forEach((o, n) => {
                const propList = o[Object.keys(o)[0]];
                const properties = {};
                propList.forEach((p, i) => properties[keyList[i]] = propList[i]);
                // Add the actual value
                out.push({
                    ...properties,
                    value: this.template.yaml[fields[n]],
                    key: fields[n]
                })
            });
            return out;
        },
    },
    methods: {
        /**
         * Set a save operation to happen because a change has occurred.
         * @param key {String} Key of the YAML field that should be saved.
         * @param value {any} Value of the YAML field to save.
         */
        registerSave({key, value}) {
            this.saveOperations[key] = value;
            if(this.saveTimeout)
                clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.save(), this.minSaveDelay);
        },
        /**
         * Save the content of any changed YAML fields to the _config.yml file in the store.
         * @return {Promise<boolean>}
         */
        save() {
            this.saving = true;
            const me = this;
            this.saveTimeout = null;
            this.lastSaveTime = performance.now();
            const newYAML = {...this.template.yaml};
            for(let k of Object.keys(this.saveOperations)) {
                console.log(`Saving ${k} => ${this.saveOperations[k]}`)
                newYAML[k] = this.saveOperations[k];
                delete this.saveOperations[k];
            }

            return this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.template.url, yaml: newYAML, body: this.template.body})
                .then(() => me.$emit('refresh'))
                .then(() => me.saving = false);
        }
    }
}
</script>

<style scoped>
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
