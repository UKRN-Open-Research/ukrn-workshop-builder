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

    <b-modal v-model="addRemoteItems" full-screen>
      <div class="content">
        <header class="title">
          <h1 class="">Add items from a remote repository</h1>
        </header>
        <div class="content">
          <p>Type the URL of a repository below. We will scan that repository for episodes and include them in your
            schedule options. You can then install these remote episodes and the episodes plus any files they depend on
            will be installed in your own repository.</p>
        </div>
        <b-autocomplete
                v-model="remoteRepositoryName"
                :data="filteredTopicRepositories.map(r => `${r.owner}/${r.name}`)"
                placeholder="https://github.com/owner/repository"
                icon="magnify"
                clearable
                expanded
        >
          <template #empty>No results found</template>
        </b-autocomplete>
        <div class="content cards">
          <RemoteRepositoryView v-for="repo in filteredTopicRepositories"
                                :key="repo.url"
                                :repo="repo"
                                @selectRepo="addRepositoryEpisodes"
          />
        </div>
      </div>
    </b-modal>
  </section>
</template>

<script>
  import ArrangeItems from "./ArrangeItems";
  import RemoteRepositoryView from "./RemoteRepositoryView";
  export default {
    name: 'MakeSchedule',
    components: {
      RemoteRepositoryView,
      ArrangeItems
    },
    props: {},
    data: function() {
      return {
        addRemoteItems: false,
        remoteRepositoryName: ""
      }
    },
    computed: {
      allItems() {
        return this.$store.getters['workshop/RepositoriesByFilter'](
                r => r || true
        ).episodes
      },
      // The schedule is a representation of the episodes in a workshop arranged by day and time
      schedule: function() {
        console.log({episodes: this.allItems})
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
        return this.$store.getters['workshop/RepositoriesByFilter'](
                r => `${r.owner}/${r.name}`
                        .toLowerCase()
                        .indexOf(this.remoteRepositoryName.toLowerCase()) >= 0
        )
      },
      remoteRepositoryEpisodes() {
        if(!this.remoteRepositoryName)
          return [];
        return this.$store.getters['workshop/RepositoriesByFilter'](
                r => r.name === this.remoteRepositoryName
        )[0].episodes;
      }
    },
    methods: {
      updateEpisode(episode, push = false) {
        console.warn(`updateEpisode(${episode.name}, push=${push}) not yet implemented`)
        /*const content = `---\n${YAML.stringify(episode.yaml)}\n---\n${episode.body}`;
        if(content !== episode.metadata.content) {
          episode.metadata.content = content;
          // Dispatch the update episode backend
          if(episode.remote && push)
            this.$store.dispatch('workshop/installRemoteEpisodes', {
              episodes: [episode.metadata], callback: (err, msg) => {
                this.$buefy.toast.open({
                  message: err? err : msg, type: err? "is-danger" : "is-success"
                })
              }
            });
          else if(episode.remote)
            this.$store.commit('workshop/addRemoteEpisodes', {episodes: [episode.metadata]});
          else
            this.$store.dispatch('workshop/updateEpisode', {episode: episode.metadata, push});
        }*/
      },
      updateItemDay(payload) {
        const items = this.allItems.filter(i => i.metadata.url === payload.itemURL);
        if(!items)
          throw new Error("Invalid itemURL for update");
        items[0].yaml.day = payload.dayId;
        this.updateEpisode(items[0])
      },
      addRepositoryEpisodes(episodes) {
        // Close modal
        this.addRemoteItems = false;
        this.$store.commit('workshop/addRemoteEpisodes', {episodes});
      }
    },
    mounted() {
      // TODO: search for and list repositories which have episodes for this topic
      // Might be best to do this in the store on topic selection/workshop load
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .cards {
    display: inline-flex;
    flex-direction: row;
    flex-wrap: wrap;
    max-width: 100%;
  }
</style>
