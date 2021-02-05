<template>
  <section class="card">
    <div class="columns">
      <div class="column">
        <div class="card-content card"
             v-for="day in schedule.days"
             :key="day.number"
        >
          <header class="card-header">
            <h1 class="card-header-title">Day {{ day.number }}</h1>
          </header>
          <div class="card-content">
            <ul class="content">
              <li v-for="item in day.items" :key="item.metadata.name">
                {{ item.metadata.name }}
              </li>
            </ul>
          </div>
          <div class="card-footer">
            <b-button class="card-footer-item" icon-left="plus">Add Items</b-button>
          </div>
        </div>
      </div>
      <div class="column">
        <div class="card-content card">
          <header class="card-header">
            <h1 class="card-header-title">Unassigned items</h1>
          </header>
          <div class="card-content">
            <ul class="content">
              <li v-for="item in schedule.unassignedItems" :key="item.metadata.name">
                {{ item.metadata.name }}
              </li>
            </ul>
          </div>
          <div class="card-footer">
            <b-button class="card-footer-item" icon-left="plus">Add Items to Stash</b-button>
          </div>
        </div>

      </div>
    </div>
    <b-button icon-left="arrow-left" icon-right="github">Save Changes to Github</b-button>

    <div class="card-content">
      <p v-if="episodeSearchInProgress">Fetching episode list <b-icon icon="spinner" custom-class="fa-spin"/></p>
      <ChooseEpisodes v-else
                      class="card section is-info"
                      v-model="episodes"
                      :episodes-available="episodesAvailable"
      />
    </div>
  </section>
</template>

<script>
import ChooseEpisodes from "./ChooseEpisodes";
import YAML from 'yaml';
export default {
  name: 'MakeSchedule',
  components: {
    ChooseEpisodes
  },
  props: {},
  data: function() {
    return {
      episodes: [],
      episodesAvailable: [],
      episodeSearchInProgress: false
    }
  },
  computed: {
    // The schedule is a representation of the episodes in a workshop arranged by day and time
    schedule: function() {
      const schedule = {days: [], unassignedItems: []};
      this.$store.state.workshop.episodes.forEach(ep => {
        const item = episodeToScheduleItem(ep);
        // Items without valid day/start_time inputs are unassigned
        if(typeof item.yaml.day === "undefined" ||
                typeof item.yaml.start_time === "undefined")
          return schedule.unassignedItems.push(item);
        const dayList = schedule.days.filter(d => d.number === item.yaml.day);
        let day;
        // create a new day for this item
        if(!dayList.length) {
          schedule.days.push({number: item.yaml.day, items: []});
          day = schedule.days.filter(d => d.number === item.yaml.day)[0];
        } else
          day = dayList[0];
        day.items.push(item);
      });
      // Pad schedule days and add an extra one at the end
      let lastDay = Math.max(...schedule.days.map(d => d.number));
      if(isNaN(lastDay) || lastDay < 0)
        lastDay = 0;
      console.log({lastDay})
      for(let d = 1; d <= lastDay + 1; d++)
        if(!schedule.days.filter(day => day.numer === d).length)
          schedule.days.push({number: d, items: []});
      return schedule;
    }
  },
  methods: {
    updateEpisodesFromScheduleItems() {
      const items = [
        ...this.schedule.days.map(d => [...d.items]),
        ...this.schedule.unassignedItems
      ];
      items.forEach(item => {
        const content = `---\n${YAML.stringify(item.yaml)}\n---\n${item.body}`;
        if(content !== item.metadata.content) {
          item.metadata.content = content;
          // Dispatch the update episode backend
          this.$store.dispatch('workshop/updateEpisode', {episode: item.metadata});
        }
      })
    }
  }
}

/**
 * Split an episode (github API result) into component parts.
 * Metadata is the raw episode.
 * YAML is a key-value breakdown of the yaml header.
 * Body is the contents of episode below the YAML header.
 * @param E
 * @return {{metadata: {}, body: string, yaml: {}}}
 */
function episodeToScheduleItem(E) {
  const metadata = {...E};
  const content = YAML.parseAllDocuments(E.content);
  const yamlText = E.content.substring(...content[0].range);
  const body = E.content.substring(...content[1].range);
  const yaml = YAML.parse(yamlText);
  return {metadata, yaml, body};
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>

</style>
