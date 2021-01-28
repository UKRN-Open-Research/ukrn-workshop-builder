<template>
  <div class="modal-card">
    <header class="modal-card-head"><p class="modal-card-title">Choose a episode to add from the list below:</p></header>
    <div class="modal-card-body">
      <b-button v-for="episode in episodeList" :key="episode.id" class="episode is-info is-light" :title="episode.details.description" :data-episode-id="episode.id" @click="chooseEpisodes" expanded>
        <span class="muted">{{ episode.owner }}: </span>{{ episode.title }}
      </b-button>
    </div>
    <footer @click="chooseEpisodes" class="back modal-card-foot">
      <b-button class="is-danger is-light" data-episode-id="NaN">Back</b-button>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'AddEpisodes',
  props: {
    episodeList: {type: Array, required: true},
    name: {type: String, required: true}
  },
  computed: {},
  methods: {
    chooseEpisodes: function(evt) {
      const button = evt.target.tagName === "BUTTON"? evt.target : evt.target.closest('button');
      this.$emit('addEpisodes', button.dataset.episodeId);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .episode {
    margin: .5em;
    padding: .3em;
  }
  .modal-card {
    width: auto;
  }
  .muted {
    color: hsl(0, 0%, 71%);
  }
</style>
