<template>
  <span class="wrapper" title="Click to edit text" icon-right="">
    <span ref="text" class="text" :contenteditable="enabled" @blur="input" @keydown="keydown">{{ value }}</span>
    <b-icon class="edit-icon" icon="lead-pencil"/>
  </span>
</template>

<script>
  /**
   * The TextEditable component wraps inline text to allow it to be edited using the HTML contenteditable property. Newlines are replaced with the empty string.
   *
   * @vue-prop [value] {String} Text content.
   * @vue-prop [enabled=true] {Boolean} Whether the content can be edited.
   */
  export default {
  name: 'TextEditable',
  props: {
    value: {type: String, required: false},
    enabled: {type: Boolean, required: false, default: true}
  },
  methods: {
    /**
     * Catch keydown events and translate 'enter' to signal completed input.
     * @param e {KeyboardEvent}
     * @return {boolean|void} Whether to continue event bubbling.
     */
    keydown: function(e) {
      if(e.key.toLowerCase() === 'enter') {
        this.input(e);
        e.preventDefault();
        return false;
      }
    },
    /**
     * Set the content to a new value.
     * @param e {Event}
     */
    input: function(e) {
      const value = e.target.innerText.replace(/\n/g, '');
      this.$refs.text.innerText = value;
      this.$emit('input', value);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .edit-icon {
    margin-left: .5em;
    opacity: 0;
  }
  span:hover > .edit-icon, span:focus + .edit-icon   { opacity: inherit; }
</style>
