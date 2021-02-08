<template>
  <section class="card">
    <div class="columns">
      <div class="column">
        <div class="card-content card"
             v-for="day in schedule.days.sort((a,b) => a.number > b.number)"
             :key="day.number"
        >
          <header class="card-header" v-if="!$store.state.workshop.busyFlag">
            <h1 class="card-header-title">Day {{ day.number }}</h1>
          </header>
          <b-skeleton size="is-large" animated :active="$store.state.workshop.busyFlag"/>
          <div class="card-content" v-if="!$store.state.workshop.busyFlag">
            <ArrangeItems :items="day.items"
                          :dayId="day.number"
                          @assignItem="updateItemDay"
            />
          </div>
          <b-skeleton size="is-medium" animated :active="$store.state.workshop.busyFlag"/>
        </div>
      </div>
      <div class="column">
        <div class="card-content card">
          <header class="card-header" v-if="!$store.state.workshop.busyFlag">
            <h1 class="card-header-title">Unassigned items</h1>
          </header>
          <b-skeleton size="is-large" animated :active="$store.state.workshop.busyFlag"/>
          <div class="card-content" v-if="!$store.state.workshop.busyFlag">
            <ArrangeItems :items="schedule.unassignedItems"
                          :is-unscheduled="true"
                          @chage="updateItemDay"
                          @drop="itemUrl => updateItemDay(itemUrl, null)"
            />
          </div>
          <b-skeleton size="is-medium" animated :active="$store.state.workshop.busyFlag"/>
          <div class="card-footer">
            <b-button class="card-footer-item" icon-left="plus">Add Items to Stash</b-button>
          </div>
        </div>

      </div>
    </div>
    <b-button icon-left="arrow-right" icon-right="github">Save Changes to Github</b-button>
  </section>
</template>

<script>
import ArrangeItems from "./ArrangeItems";
import YAML from 'yaml';
export default {
  name: 'MakeSchedule',
  components: {
    ArrangeItems
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
    allItems() {return this.$store.state.workshop.episodes.map(ep => episodeToScheduleItem(ep))},
    // The schedule is a representation of the episodes in a workshop arranged by day and time
    schedule: function() {
      const schedule = {days: [], unassignedItems: []};
      this.allItems.forEach(item => {
        // Items without valid day/start_time inputs are unassigned
        if(!item.yaml.day || item.yaml.start_time)
          return schedule.unassignedItems.push(item);
        const dayList = schedule.days.filter(d => d.number === item.yaml.day);
        // create a new day for this item
        if(!dayList.length)
          schedule.days.push({number: item.yaml.day, items: [item]});
        else
          dayList[0].items.push(item);
      });
      // Pad schedule days and add an extra one at the end
      let lastDay = Math.max(...schedule.days.map(d => d.number));
      if(isNaN(lastDay) || lastDay < 0)
        lastDay = 0;
      for(let d = 1; d <= lastDay + 1; d++)
        if(!schedule.days.filter(day => day.number === d).length)
          schedule.days.push({number: d, items: []});
      return schedule;
    }
  },
  methods: {
    updateEpisodeFromScheduleItem(item, push = false) {
      const content = `---\n${YAML.stringify(item.yaml)}\n---\n${item.body}`;
      if(content !== item.metadata.content) {
        item.metadata.content = content;
        // Dispatch the update episode backend
        this.$store.dispatch('workshop/updateEpisode', {episode: item.metadata, push});
      }
    },
    updateItemDay(payload) {
      const items = this.allItems.filter(i => i.metadata.url === payload.itemURL);
      if(!items)
        throw new Error("Invalid itemURL for update");
      items[0].yaml.day = payload.dayId;
      this.updateEpisodeFromScheduleItem(items[0])
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
