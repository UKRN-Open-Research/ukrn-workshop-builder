<template>
  <div class="workshop-content">
    <b-button
            label="Edit template"
            type="is-secondary"
            size="is-medium"
            @click="isEditingTemplate = true" />
    <br/>
    <div class="card-content">
      <p v-if="episodeSearchInProgress">Fetching episode list <b-icon icon="spinner" custom-class="fa-spin"/></p>
      <ChooseEpisodes v-else class="card section is-info" v-model="episodes" :episodes-available="episodesAvailable"/>
    </div>

    <b-modal v-model="isEditingTemplate" scroll="keep" @close="toastSave">
      <div class="card">
        <header class="card-header-title">Edit template (saved automatically)</header>
        <mavon-editor class="card-content" v-model="currentTemplate" language="en" defaultOpen="edit" @change="templateDirty = true"/>
      </div>
    </b-modal>
  </div>
</template>

<script>
import ChooseEpisodes from "./ChooseEpisodes";
export default {
  name: 'CustomiseWorkshop',
  components: {
    ChooseEpisodes
  },
  props: {
    template: {type: String, required: true},
    workshop: {type: String, required: true}
  },
  data: function() {
    return {
      isEditingTemplate: false,
      templateDirty: false,
      currentTemplate: this.template,
      episodes: [],
      episodesAvailable: [],
      episodeSearchInProgress: false
    }
  },
  computed: {},
  methods: {
    toastSave: function() {
      if(this.templateDirty) {
        this.templateDirty = false;
        this.$buefy.toast.open({
          message: '_config.yml file updated',
          type: 'is-success'
        })
      }
    },
    processLessons: function(episodes, starting_id = 0) {
      this.episodesAvailable.push(...episodes.map(L => {
        const names = L.full_name.split('/');
        return {
          id: starting_id++,
          workshops: L.topics,
          owner: names[0],
          title: names[1],
          link: L.html_url,
          details: L,
          day: 1
        }
      }));
    },
    refreshLessonList: function() {
      // Update episodes
      if(!this.template || !this.workshop || this.episodeSearchInProgress)
        return;
      // Query GitHub for episode repositories with the appropriate tags
      if(!this.episodeSearchInProgress) {
        this.episodeSearchInProgress = true;
        fetch(`https://api.github.com/search/repositories?q=fork:true+${encodeURI(`topic:"ukrn-open-research"+topic:"${this.workshop}"`)}`, {
          headers: {"Accept": "application/vnd.github.mercy-preview+json"}
        })
                .then(r => r.json())
                .then(r => {this.episodeSearchInProgress = false; return this.processLessons(r.items, 0)})
                .catch(e => {this.episodeSearchInProgress = false; console.error(e)})
      }
    }
  },
  watch: {},
  created() {
    this.refreshLessonList();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>

</style>
