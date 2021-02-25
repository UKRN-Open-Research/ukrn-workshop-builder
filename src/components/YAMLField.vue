<template>
    <div class="content yaml-item">
        <b-field :label="field.name"
                 :type="status"
        >
            <template #message>
                <div>{{ field.help }}.</div>
                <div v-if="status === 'is-danger'">This field is required!</div>
            </template>
            <div v-if="field.type === 'filename'">
                <b-checkbox v-for="f in fileList"
                            :key="f"
                            v-model="value"
                            :native-value="f"
                            :name="field.key"
                            @input="save"
                >{{ f }}</b-checkbox>
            </div>
            <YAMLFieldInputArray v-else-if="field.is_array"
                                 :field="field"
                                 :data="fileList"
                                 v-model="value"
                                 @blur="save"
            />
            <YAMLFieldInput v-else
                            :field="field"
                            :data="field.type === 'filename'? fileList : []"
                            v-model="value"
                            @blur="save"
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
        field: {type: Object, required: true},
        saveStatusLinger: {type: Number, required: false, default: 1000}
    },
    data: function() {
        return {
            currentValue: null, // dictionary of values indexed by YAML keys
            valueChanged: false, // dictionary of change flags indexed by YAML keys
            loadingFileList: true,
            fileList: [],
            saveStatus: '',
            saveStatusTimeout: null
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
                } catch (e) {return this.field.is_array? [] : ''}
            },
            // Set by key, value
            set(v) {
                this.valueChanged = true;
                this.setSaveStatus('dirty');
                this.currentValue = v;
            }
        },
        status() {
            if(this.field.is_required &&
                (this.value === '' || this.value === null))
                return 'is-danger';
            switch(this.saveStatus) {
                case "saved": return 'is-success';
                case "dirty": return 'is-info is-light';
            }
            return '';
        }
    },
    methods: {
        toBackendValue(v) {
            if(v === null)
                return v;
            if(this.field.type === 'time')
                v = v.map(x => `${x.substr(0, 2)}_${x.substr(2,2)}`);
            if(this.field.is_array && v.length)
                v = v.filter(x => x !== '');
            return v;
        },
        save() {
            console.log(`Save: ${this.field.value} -> ${this.value}`)
            let input = this.toBackendValue(this.value);
            if(input === this.field.value)
                return;
            this.setSaveStatus('saved');
            this.$emit('save', {key: this.field.key, value: input});
        },
        validTime(tag) {
            const match = /^(?<h>[0-9]{2})(?<m>[0-9]{2})$/.exec(tag);
            if(!match || !match.groups) return false;
            if(match.groups.h >= 24) return false;
            return match.groups.m < 60;
        },
        getFileList() {
            if(!this.field.special || this.field.type !== 'filename') {
                this.loadingFileList = false;
                return;
            }
            this.fileList = [];
            const self = this;
            this.field.special.forEach(path => {
                this.$store.dispatch('workshop/pullURL', {
                    url: `${self.$store.getters['workshop/Repository']().url}/contents/${path}`
                })
                    .then(r => {
                        r.forEach(f => {
                            const match = /^(.+)\.[^.]+$/.exec(f.name);
                            if(!match || match[1][0] === '_')
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
        },
        setSaveStatus(status) {
            if(this.saveStatusTimeout)
                clearTimeout(this.saveStatusTimeout);
            this.saveStatus = status;
            if(status === 'saved')
                this.saveStatusTimeout = setTimeout(
                    () => this.setSaveStatus('clean'),
                    this.saveStatusLinger
                )
        }
    },
    mounted() {this.getFileList()}
}
</script>

<style scoped>

</style>