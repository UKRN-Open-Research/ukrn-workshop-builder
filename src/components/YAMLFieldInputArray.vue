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