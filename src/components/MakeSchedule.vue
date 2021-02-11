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
            <b-button class="card-footer-item" icon-left="plus" @click="addRemoteItems = true">Add Items to Stash</b-button>
          </div>
        </div>

      </div>
    </div>

    <b-modal v-model="addRemoteItems" has-modal-card>
      <div class="modal-card">
        <header class="modal-card-head">
          <h1 class="modal-card-title">Add items from a remote repository</h1>
        </header>
        <div class="modal-card-body">
          <p>Type the URL of a repository below. We will scan that repository for episodes and include them in your
            schedule options. You can then install these remote episodes and the episodes plus any files they depend on
            will be installed in your own repository.</p>
        </div>
        <div class="modal-card-body is-inline-flex">
          <b-autocomplete
              rounded
              v-model="remoteRepositoryName"
              :data="filteredTopicRepositories"
              placeholder="https://github.com/owner/repository"
              icon="magnify"
              clearable
          >
            <template #empty>No results found</template>
          </b-autocomplete>
          <b-button icon-left="plus-circle"
                    @click="fetchEpisodesFromRepository"
                    size="is-large"
                    type="is-success"
                    rounded
          />
        </div>
      </div>
    </b-modal>
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
      addRemoteItems: false,
      remoteRepositoryName: "",
      remoteRepositories: []
    }
  },
  computed: {
    allItems() {
      return [
          // ...this.$store.state.workshop.episodes.map(ep => episodeToScheduleItem(ep)),
          // ...this.$store.state.workshop.remoteEpisodes.map(ep => episodeToScheduleItem(ep, true))
      ];
    },
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
    },
    filteredTopicRepositories() {
      return this.remoteRepositories.filter((option) => {
        return option
            .toString()
            .toLowerCase()
            .indexOf(this.name.toLowerCase()) >= 0
      })
    },
    remoteRepositoryEpisodes() {
      if(!this.remoteRepositoryName)
        return [];
      return this.remoteRepositories.filter(r => r.name === this.remoteRepositoryName)[0].episodes;
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
    },
    fetchEpisodesFromRepository() {
      // Close modal
      this.addRemoteItems = false;
      this.$store.commit('workshop/addRemoteEpisodes', {
        episodes: this.remoteRepositoryEpisodes
      })
    }
  },
  mounted() {
    // TODO: search for and list repositories which have episodes for this topic
    // Might be best to do this in the store on topic selection/workshop load
  }
}

/**
 * Split an episode (github API result) into component parts.
 * Metadata is the raw episode.
 * YAML is a key-value breakdown of the yaml header.
 * Body is the contents of episode below the YAML header.
 * @param E {object} github episode object
 * @param [remote=false] {boolean} whether the episode is a member of a remote repository
 * @return {{metadata: {}, body: string, yaml: {}}}
 */
/*function episodeToScheduleItem(E, remote = false) {
  const metadata = {...E};
  const content = YAML.parseAllDocuments(E.content);
  const yamlText = E.content.substring(...content[0].range);
  const body = E.content.substring(...content[1].range);
  const yaml = YAML.parse(yamlText);
  return {metadata, yaml, body, remote};
}*/
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>

</style>
