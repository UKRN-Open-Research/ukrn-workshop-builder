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

/**
 * @description The YAMLField component displays a single YAML field for editing using the appropriate input option.
 *
 * @vue-prop field {Field} YAML Field to display.
 * @vue-prop [saveStatusLinger=1000] {Number} Display duration (ms) for the save indicator.
 *
 * @vue-data currentValue=null {any} Current value of the YAML field.
 * @vue-data valueChanged=false {Boolean} Whether the current value matches the value saved in the store.
 * @vue-data loadingFileList=true {Boolean} Whether the list of files required for the field's options is being fetched.
 * @vue-data [fileList=[]] {Array<String>} List of filenames for files required for the field's options.
 * @vue-data saveStatus='' {String} Description of the current save status. "clean" = unchanged, "saved" = freshly saved to store, "dirty" = changes pending save
 * @vue-data saveStatusTimeout=null {Number} Timeout handle for the event cancelling the 'recently saved' display.
 *
 * @vue-computed value {any} Value of the YAML field in the store.
 * @vue-computed status='' {String} The Buefy style class for displaying the field's save status.
 *
 * @vue-event save {{key: String, value: any}} Indicate that a new value should be saved as this field's value.
 */
export default {
    name: "YAMLField",
    components: {YAMLFieldInput, YAMLFieldInputArray},
    props: {
        field: {type: Object, required: true},
        saveStatusLinger: {type: Number, required: false, default: 1000}
    },
    data: function() {
        return {
            currentValue: null,
            valueChanged: false,
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
                    return this.field.value.map(x => x.replace(/\|/, ''));
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
        /**
         * Convert values to the format in which they are saved in the store.
         * @param v {any} Value to convert.
         * @return {any} Value in the format expected by the back end.
         */
        toBackendValue(v) {
            if(v === null)
                return v;
            if(this.field.is_array && v.length)
                v = v.filter(x => x !== '');
            if(this.field.type === 'time')
                v = v.map(x => `${x.substr(0, 2)}|${x.substr(2,2)}`);
            return v;
        },
        /**
         * Save the value of the field to the store.
         */
        save() {
            console.log(`Save: ${this.field.value} -> ${this.value}`)
            let input = this.toBackendValue(this.value);
            if(input === this.field.value)
                return;
            this.setSaveStatus('saved');
            this.$emit('save', {key: this.field.key, value: input});
        },
        /**
         * Check whether a string is a valid 12h60m format string.
         * @param tag {String} Time string to check.
         * @return {boolean}
         */
        validTime(tag) {
            const match = /^(?<h>[0-9]{2})(?<m>[0-9]{2})$/.exec(tag);
            if(!match || !match.groups) return false;
            if(match.groups.h >= 24) return false;
            return match.groups.m < 60;
        },
        /**
         * Search through a repository's path to determine the files that are valid completion values for the field. This is triggered when the component is mounted.
         * @return {Array<String>|null}
         */
        getFileList() {
            if(!this.field.special || this.field.type !== 'filename') {
                this.loadingFileList = false;
                return;
            }
            this.fileList = [];
            const self = this;
            return this.field.special.forEach(path => {
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
        /**
         * Set the save status of the field. Setting the status to "saved" will set the status back to "clean" after a delay.
         * @param status {String} Status ("clean", "dirty", or "saved") to set the save status to.
         */
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
    mounted() {return this.getFileList()}
}
</script>

<style scoped>

</style>
