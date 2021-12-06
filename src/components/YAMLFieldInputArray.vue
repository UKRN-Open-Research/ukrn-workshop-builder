<template>
    <b-field v-if="field.type === 'filename'" grouped group-multiline>
        <YAMLFieldInput v-for="i in data.length"
                        :key="data[i - 1]"
                        :field="field"
                        :data="data[i - 1]"
                        :value="currentValue[i - 1]"
                        @input="v => updateValue(i - 1, v)"
                        @blur="evt => $emit('blur', evt)"
        />
    </b-field>
    <b-field v-else grouped group-multiline>
        <YAMLFieldInput v-for="i in currentValue.length"
                        :key="i - 1"
                        :field="field"
                        :data="data"
                        :value="currentValue[i - 1]"
                        @input="v => updateValue(i - 1, v)"
                        @blur="evt => $emit('blur', evt)"
        />
    </b-field>
</template>

<script>
import YAMLFieldInput from "./YAMLFieldInput";
/**
 * @description The YAMLFieldInput component presents the appropriate input type for any YAML field whose value is an array. For YAML fields with non-array values, see {@link YAMLFieldInput}.
 *
 * @vue-prop field {Field} Field to display.
 * @vue-prop value {any} Current value of the field.
 * @vue-prop [data] {Array} Options for special-case fields.
 *
 * @vue-data countries {Array<String>} List of country codes retrieved from country-codes.json library file.
 * @vue-data languages {Array<String>} List of language codes retrieved from language-codes.json library file.
 *
 * @vue-computed currentValue {any} The current field value. Emits input event on change.
 *
 * @vue-event input {any} Signal that the value of the field has been changed.
 */
export default {
    name: "YAMLFieldInputArray",
    components: {YAMLFieldInput},
    props: {
        field: {type: Object, required: true},
        value: {required: true},
        data: {type: Array, required: false}
    },
    data: function() {
        return {
            countries: this.field.format === 'iso-3166-1-alpha-2'?
                require('../lib/country-codes') : null,
            languages: this.field.format === 'iso-639-1'?
                require('../lib/language-codes') : null
        }
    },
    computed: {
        currentValue: {
            get() {
                try{return [...this.value.filter(v => v !== ''), '']}
                catch(e) {return ['']}
            },
            set(v) {
                this.$emit('input', v);
            }
        }
    },
    methods: {
        /**
         * Update the value of the field by changing the appropriate part of the array.
         * @param i {Number} Index of the element to update.
         * @param v {any} New value.
         */
        updateValue(i, v) {
            const newValue = this.currentValue;
            newValue[i] = v;
            this.currentValue = newValue;
        }
    }
}
</script>

<style scoped>

</style>
