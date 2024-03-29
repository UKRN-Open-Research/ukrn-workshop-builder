<template>
    <div v-if="field.format === 'topic'">
        <b-radio v-for="t in $store.state.topicList"
                 v-model="currentValue"
                 :name="field.key"
                 :key="t"
                 :native-value="t"
                 @input="evt => $emit('blur', evt)"
        >{{ `${t[0].toUpperCase()}${t.substring(1).replace(/-/g, ' ')}` }}</b-radio>
    </div>
    <b-select v-else-if="field.format === 'iso-3166-1-alpha-2'"
              v-model="currentValue"
              @input="evt => $emit('blur', evt)"
    >
        <option v-for="C in countries"
                :key="C.code"
                :value="C.code"
        >{{ C.name }}</option>
    </b-select>
    <b-select v-else-if="field.format === 'iso-639-1'"
              v-model="currentValue"
              @input="evt => $emit('blur', evt)"
    >
        <option v-for="L in languages"
                :key="L.code"
                :value="L.code"
        >{{ L.name }}</option>
    </b-select>
    <b-input v-else-if="field.type === 'string' && field.format === 'long'"
             v-model="currentValue"
             @blur="evt => $emit('blur', evt)"
             type="textarea"
             class="full-wide"
             custom-class="match-height"
    />
    <b-input v-else-if="field.type === 'string'"
             v-model="currentValue"
             @blur="evt => $emit('blur', evt)"
    />
    <b-numberinput v-else-if="field.type === 'number'"
                   v-model="currentValue"
                   @input="evt => $emit('blur', evt)"
    />
    <b-input v-else-if="field.type === 'time'"
             v-model="currentValue"
             @blur="evt => $emit('blur', evt)"
    />
    <b-datepicker v-else-if="field.type === 'date'"
                  v-model="currentValue"
                  @blur="evt => $emit('blur', evt)"
    />
    <b-switch v-else-if="field.type === 'boolean'"
              v-model="currentValue"
              @blur="evt => $emit('blur', evt)"
    >{{ value }}</b-switch>
    <b-input v-else style="background-color: darkred; height: 1em; min-width: 10em;">
        Unhandled input type: {{ field.type }}
    </b-input>
</template>

<script>
    /**
     * @description The YAMLFieldInput component presents the appropriate input type for any YAML field whose value is not an array. For YAML fields with array values, see {@link YAMLFieldInputArray}.
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
    name: "YAMLFieldInput",
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
            get() {return this.value},
            set(v) {this.$emit('input', v)}
        }
    }
}
</script>

<style lang="scss">
</style>
