<template>
    <div class="content yaml-item">
        <b-field :label="field.name"
                 :type="field.is_required && !value? 'is-danger' : ''"
        >
            <template #message>
                <div>{{ field.help }}.</div>
                <div v-if="field.is_required && !value">This field is required!</div>
            </template>
            <YAMLFieldInputArray v-if="field.is_array"
                                 :field="field"
                                 :data="field.type === 'filename'? fileList : []"
                                 v-model="value"
                                 @input="save"
            />
            <YAMLFieldInput v-else
                            :field="field"
                            :data="field.type === 'filename'? fileList : []"
                            v-model="value"
                            @input="save"
            />
        </b-field>
        <b-loading :active="loadingFileList" :is-full-page="false"/>
    </div>
</template>

<script>
import YAMLFieldInput from "./YAMLFieldInput";
import YAMLFieldInputArray from "./YAMLFieldInputArray";
export default {
    name: "YAMLField",
    components: {YAMLFieldInput, YAMLFieldInputArray},
    props: {
        field: {type: Object, required: true}
    },
    data: function() {
        return {
            currentValue: null, // dictionary of values indexed by YAML keys
            valueChanged: false, // dictionary of change flags indexed by YAML keys
            loadingFileList: true,
            fileList: []
        }
    },
    computed: {
        value: {
            get() {
                try {
                    if(this.valueChanged)
                        return this.currentValue;
                    if(this.field.type !== 'time')
                        return this.field.value;
                    return this.field.value.map(x => x.replace(/_/, ''));
                } catch (e) {return null}
            },
            // Set by key, value
            set(v) {this.valueChanged = true; this.currentValue = v;}
        }
    },
    methods: {
        save() {
            console.log(`Save: ${this.field.value} -> ${this.value}`)
            let input = this.value;
            if(this.field.type === 'time')
                input = input.map(x => `${x.substr(0, 2)}_${x.substr(2,2)}`);
            if(this.field.is_array)
                input = input.filter(x => x !== '');
            if(input === this.field.value)
                return;
            this.$emit('save', {key: this.field.key, value: input});
        },
        validTime(tag) {
            const match = /^(?<h>[0-9]{2})(?<m>[0-9]{2})$/.exec(tag);
            if(!match || !match.groups) return false;
            if(match.groups.h >= 24) return false;
            return match.groups.m < 60;
        },
        getFieldList() {
            if(!this.field.special || this.field.type !== 'filename') {
                this.loadingFileList = false;
                return;
            }
            const self = this;
            this.field.special.forEach(path => {
                this.$store.dispatch('workshop/pullURL', {
                    url: `${self.$store.getters['workshop/Repository']().url}/contents/${path}`
                })
                    .then(r => {
                        r.forEach(f => {
                            const match = /^(.+)\.[^.]+$/.exec(f.name);
                            if(!match)
                                return;
                            const entry = match[1];
                            if(self.fileList.includes(entry))
                                return;
                            self.fileList.push(entry)
                        });
                        self.loadingFileList = false;
                    })
                    .catch(() => null)
            })
        }
    },
    mounted() {this.getFieldList()}
}
</script>

<style scoped>

</style>