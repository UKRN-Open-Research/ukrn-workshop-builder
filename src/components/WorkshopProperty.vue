<template>
    <b-tooltip :label="Field.help">
        <b-field :label="Field.name"
                 label-position="on-border"
                 :message="Field.is_required && !value? 'This field is required' : ''"
                 :type="Field.is_required && !value? 'is-danger' : ''"
                 custom-class="content"
        >
            <b-taginput
                    v-if="Field.is_array"
                    v-model="value"
                    @blur="save"
                    ellipsis
                    icon="label"
                    placeholder="Add an entry"
                    aria-close-label="Delete this entry"
                    :before-adding="Field.type === 'time'? validTime : ()=>true"
            />
            <b-autocomplete v-else-if="Field.format === 'topic'"
                            v-model="value"
                            @blur="saveTopic"
                            :data="$store.state.topicList"
                            placeholder="Start typing to get suggestions"
                            icon="magnify"
                            clearable
            >
                <template #empty>No matching topics found</template>
            </b-autocomplete>
            <b-select v-else-if="Field.format === 'iso-3166-1-alpha-2'"
                      v-model="value"
                      @blur="save"
            >
                <option v-for="C in countries"
                        :key="C.code"
                        :value="C.code"
                >{{ C.name }}</option>
            </b-select>
            <b-select v-else-if="Field.format === 'iso-639-1'"
                      v-model="value"
                      @blur="save"
            >
                <option v-for="L in languages"
                        :key="L.code"
                        :value="L.code"
                >{{ L.name }}</option>
            </b-select>
            <b-input v-else-if="Field.type === 'string' && !Field.is_array"
                     v-model="value"
                     @blur="save"
            />
        </b-field>
        <span>{{ Field.name }}</span>
    </b-tooltip>
</template>

<script>
export default {
    name: "WorkshopProperty",
    props: {
        field: {type: String, required: true},
        template: {type: Object, required: true}
    },
    data: function() {
        return {
            currentValue: null,
            valueChanged: false,
            countries: require('../lib/country-codes'),
            languages: require('../lib/language-codes')
        }
    },
    computed: {
        value: {
            get() {
                try {
                    if(this.valueChanged)
                        return this.currentValue;
                    if(this.Field.type !== 'time')
                        return this.Field.value;
                    return this.Field.value.map(x => x.replace(/_/, ''));
                } catch (e) {return null}
            },
            set(v) {this.valueChanged = true; this.currentValue = v;}
        },
        Field() {
            // Rip properties and keys from their respective YAML lists and combine
            const obj = this.template.yaml['ukrn_wb']
                .filter(f => f.fields)[0].fields
                .filter(f => Object.keys(f)[0] === this.field)[0];
            const propList = obj[Object.keys(obj)[0]];
            const keyList = this.template.yaml['ukrn_wb']
                .filter(f => f.fields_structure)[0].fields_structure;
            const properties = {};
            propList.forEach((p, i) => properties[keyList[i]] = propList[i]);
            // Add the actual value
            return {
                ...properties,
                value: this.template.yaml[this.field],
            }
        }
    },
    methods: {
        save() {
            let input = this.value;
            if(this.Field.type === 'time')
                input = input.map(x => `${x.substr(0, 2)}_${x.substr(2,2)}`);
            console.log(`Save: ${this.Field.value} -> ${input}`)
            this.template.yaml[this.field] = input;
            this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.template.url, yaml: this.template.yaml, body: this.template.body})
                .then(() => this.$emit('refresh'))
        },
        saveTopic() {
            const self = this;
            let input = this.value;
            if(this.Field.type === 'time')
                input = input.map(x => `${x.substr(0, 2)}_${x.substr(2,2)}`);
            console.log(`SaveTopic: ${this.Field.value} -> ${input}`)
            this.template.yaml[this.field] = input;
            this.$store.dispatch('workshop/setFileContentFromYAML', {url: this.template.url, yaml: this.template.yaml, body: this.template.body})
                .then(() => self.$store.dispatch('workshop/setTopics', {
                    topics: [input]}))
                .then(() => this.$emit('refresh'))
                .catch(e => console.error(e))
        },
        validTime(tag) {
            const match = /^(?<h>[0-9]{2})(?<m>[0-9]{2})$/.exec(tag);
            if(!match || !match.groups) return false;
            if(match.groups.h >= 24) return false;
            return match.groups.m < 60;
        }
    }
}
</script>

<style scoped>

</style>