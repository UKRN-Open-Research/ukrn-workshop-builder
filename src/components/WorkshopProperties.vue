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
        /**
         * Rip properties and keys from their respective YAML lists and combine
         * @return {{name: string, type: string, is_required: boolean, is_array: boolean, format: string, special: string|string[], value: any, key: string}[]}
         * @constructor
         */
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
        registerSave({key, value}) {
            this.saveOperations[key] = value;
            if(this.saveTimeout)
                clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.save(), this.minSaveDelay);
        },
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

            this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.template.url, yaml: newYAML, body: this.template.body})
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