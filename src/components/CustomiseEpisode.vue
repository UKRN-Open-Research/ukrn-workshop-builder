<template>
  <div>
    <span class="card-header-title"><span class="owner">{{ episode.owner }}: </span>{{ episode.title }}</span>
    <div class="action-icons">
      <b-button icon-right="cog" size="is-medium" title="Edit episode settings" />
      <a :href="episode.link" target="_blank" title="Open episode website in a new tab">
        <b-button icon-right="link" size="is-medium"/>
      </a>
      <b-button icon-right="minus-circle" size="is-medium" title="Remove this episode" class="del" @click="$emit('dropEpisode', episode.id)"/>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Episode',
  props: {
    value: {type: Object, required: true}
  },
  data: function() {
    return {}
  },
  computed: {
    episode: {
      get: function() {return this.value;},
      set: function(v) {this.$emit('input', v)}
    }
  },
  methods: {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
</style>
