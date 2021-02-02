<template>
  <span class="wrapper" title="Click to edit text" icon-right="">
    <span ref="text" class="text" :contenteditable="enabled" @blur="input" @keydown="keydown">{{ value }}</span>
    <b-icon class="edit-icon" icon="lead-pencil"/>
  </span>
</template>

<script>
export default {
  name: 'TextEditable',
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
