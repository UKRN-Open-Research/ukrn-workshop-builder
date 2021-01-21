<template>
  <span class="wrapper" title="Click to edit text">
    <span ref="text" class="text" :contenteditable="enabled" @blur="input" @keydown="keydown">{{ value }}</span>
    <font-awesome-icon class="edit-icon" icon="pencil-alt"/>
  </span>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
export default {
  name: 'TextEditable',
  components: {FontAwesomeIcon},
  props: {
    value: {type: String, required: false},
    enabled: {type: Boolean, required: false, default: true}
  },
  methods: {
    keydown: function(e) {
      if(e.key.toLowerCase() === 'enter') {
        this.input(e);
        e.preventDefault();
        return false;
      }
    },
    input: function(e) {
      const value = e.target.innerText.replace(/\n/g, '');
      this.$refs.text.innerText = value;
      this.$emit('addLesson', value);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  svg {
    margin-left: .5em;
    opacity: 0;
  }
  span:hover > svg, span:focus + svg   { opacity: inherit; }
</style>
