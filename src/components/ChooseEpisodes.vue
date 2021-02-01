<template>
  <section class="episode-list card">
    <header class="">
      <h2 class="title">Schedule:</h2>
    </header>
    <div v-for="day in days" :key="day.id" class="content day">
      <h3 class="card-header-title">Day {{ day.id }}</h3>
      <draggable
              :list="day.episodes"
              @start="drag=true"
              @end="drag=false"
              @change="(evt)=>updateDays(day.id, evt)"
              group="episodes"
              class="episodeList"
      >
        <b-collapse v-for="episode in day.episodes"
                    :key="episode.id"
                    class="episode card"
                    :title="episode.details.description"
                    animation="slide"
                    :aria-id="`episode-details-${episode.id}`"
                    :open="false"
        >
          <template #trigger="props">
            <div
                    class="card-header"
                    role="button"
                    :aria-controls="`episode-details-${episode.id}`">
              <span class="card-header-title">
                <span class="owner">{{ episode.owner }}: </span>
                {{ episode.title }}
              </span>
              <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
              <div class="action-icons">
                <b-button icon-right="cog" size="is-medium" title="Edit episode settings" />
                <a :href="episode.link" target="_blank" title="Open episode website in a new tab">
                  <b-button icon-right="link" size="is-medium"/>
                </a>
                <b-button icon-right="minus-circle" size="is-medium" title="Remove this episode" class="del" @click="dropEpisodes(episode.id)"/>
              </div>
            </div>
          </template>

          <div class="card-content">
            <div class="content">
              This is where we'll put the cog stuff.
            </div>
          </div>
          <footer class="card-footer">
            <a class="card-footer-item">Save</a>
            <a class="card-footer-item">Edit</a>
            <a class="card-footer-item">Delete</a>
          </footer>
        </b-collapse>


      </draggable>
      <div class="card-content">
        <b-button @click="beginAddEpisodes" :data-day="day.id" class="button is-info is-light" icon-right="plus-circle" size="is-medium">
          Add a new item
        </b-button>
      </div>
    </div>

    <b-modal v-model="addingEpisodes" class="" aria-modal>
      <AddEpisodes name="add-episode" @addEpisodes="addEpisodes" :episodeList="episodesAvailableToAdd"/>
    </b-modal>

    <footer class="content">
      <b-button icon-left="arrow-right"
                icon-right="github"
                type="is-primary is-inverted"
                size="is-large"
                @click="$emit('save')"
      >
        Save to GitHub
      </b-button>
    </footer>
  </section>
</template>

<script>
import draggable from "vuedraggable"
import AddEpisodes from "./AddEpisodes";
export default {
  name: 'ChooseEpisodes',
  components: {draggable, AddEpisodes},
  props: {
    value: {type: Array, required: true}, // list of episodes selected
    episodesAvailable: {type: Array, required: true}
  },
  data: function() {
    return {
      episodeSearchInProgress: false,
      addingEpisodes: false,
      targetDay: null,
      dayUpdateCache: null
    }
  },
  computed: {
    // Episodes interact with the v-model value to pass updates back to parent
    episodes: {
      get: function() {return this.value;},
      set: function(newValue) {this.$emit('input', newValue);}
    },
    episodesAvailableToAdd: function() {
      return this.episodesAvailable.filter(L => !this.episodes.includes(L));
    },
    // We want to show episodes grouped by days, so we set up the days interface to do that
    // Its setter changes episodes, which changes value, which is passed to parent
    days: {
      get: function() {
        const days = [];
        let min = 1;
        let max = 0;
        this.episodes.forEach(L => {
          if(!L.day)
            return;
          if(L.day < min && L.day > 0)
            min = L.day;
          if(L.day > max)
            max = L.day;
        });
        for (let i = min; i <= max + 1; i++)
          days.push({
            id: i,
            episodes: this.episodes.filter(L => L.day === i)
          });
        return days;
      },
      set: function(value) {
        const episodes = [];
        value.forEach(day => day.episodes.forEach(L => L.day = day.id));
        value.forEach(day => episodes.push(...day.episodes));
        this.episodes = episodes;
      }
    }
  },
  methods: {
    // The vue-draggable element triggers change event on added, removed, and move.
    // Added and remove are paired (added first), and we need to avoid updating
    // after add, otherwise we have two copies of one element which causes v-for
    // to complain about duplicate ids.
    updateDays: function(dayId, evt) {
      if(evt.added === undefined)
        this.days = [...this.days]; // force update
    },
    beginAddEpisodes: function(evt) {
      const button = evt.target.tagName === "BUTTON"? evt.target : evt.target.closest('button');
      this.targetDay = parseInt(button.dataset.day);
      this.addingEpisodes = true;
    },
    addEpisodes: function(episode_id) {
      this.addingEpisodes = false;
      const id = parseInt(episode_id);
      if(isNaN(parseInt(this.targetDay)) || isNaN(id))
        return;
      const newEpisodes = this.episodesAvailable.filter(L => L.id === id)[0];
      newEpisodes.day = this.targetDay;
      this.episodes.push(newEpisodes);
    },
    dropEpisodes: function (episode_id) {
      const id = parseInt(episode_id);
      this.episodes = this.episodes.filter(L => L.id !== id);
    }
  },
  watch: {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  section {
    background-color: #f8d695;
  }
  .day {
    background-color: white;
    margin: 1em;
  }
  .episodeList .episode {
    margin: .25em 1em;
    width: calc(100% - 2em);
    background-color: lightblue;
  }
  .action-icons {
    display: flex;
    margin-right: 0;
    padding: .25em 0;
    button {
      margin: auto .25em;
      &:hover {color: dodgerblue;}
      &.del:hover{color: red;}
    }
  }
  .owner {
    font-weight: normal;
    color: hsl(0, 0%, 71%);
  }
  .caret {
    align-self: center;
  }

</style>
<style>
  .modal-background {background-color: rgba(0, 0, 0, 0.5)}
</style>