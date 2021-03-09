<template>
  <section>
    <section class="card" v-if="!mainRepo">
      <div class="card-content">
        <p>No workshop detected.</p>
        <b-button label="Go to create workshop section"
                  icon-left="arrow-left"
                  type="is-warning"
                  @click="$emit('goToCreateWorkshop')"
        />
      </div>
    </section>
    <section class="card" v-else>
      <div class="content"
           v-if="schedule.days.length === 1 && schedule.days[0].items.length === 0"
      >
        <p>There are currently no episodes in the workshop. To add episodes, drag them from the stash into a day. You can search for episodes that have already been created and add them to your stash.</p>
      </div>
      <div class="columns">
        <div class="column">
          <div class="card-content card"
               v-for="day in schedule.days"
               :key="day.number"
          >
            <header class="card-header" v-if="!mainRepo.busyFlag()">
              <h1 class="card-header-title">Day {{ day.number }}</h1>
            </header>
            <b-skeleton size="is-large" animated :active="mainRepo.busyFlag()"/>
            <div class="card-content" v-if="!mainRepo.busyFlag()">
              <ArrangeItems :items="day.items"
                            :dayId="day.number"
                            @assignItem="updateItemDay"
              />
            </div>
            <b-skeleton size="is-medium" animated :active="mainRepo.busyFlag()"/>
          </div>
        </div>
        <div class="column">
          <div class="card-content card">
            <header class="card-header" v-if="!mainRepo.busyFlag()">
              <h1 class="card-header-title">Stash</h1>
            </header>
            <b-skeleton size="is-large" animated :active="mainRepo.busyFlag()"/>
            <div class="card-content" v-if="!mainRepo.busyFlag()">
              <ArrangeItems :items="schedule.unassignedItems"
                            :is-unscheduled="true"
                            @change="updateItemDay"
                            class="unassigned-items"
              />
            </div>
            <b-skeleton size="is-medium" animated :active="mainRepo.busyFlag()"/>
            <div class="card-footer">
              <b-button class="card-footer-item"
                        icon-left="plus"
                        :type="`is-primary ${allItems.length > 1? 'is-light' : ''}`"
                        @click="addRemoteItems = true"
              >
                Add Items to Stash
              </b-button>
            </div>
          </div>
        </div>
      </div>

      <b-modal v-model="addRemoteItems" full-screen>
        <div class="content fullscreen-modal">
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
                  :data="filteredTopicRepositories.map(r => `${r.ownerLogin}/${r.name}`)"
                  placeholder="Start typing an owner, repository, or tag to filter"
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
                                  :is-open="expandedRepo === repo.url"
                                  @open="url => expandedRepo = url"
            />
          </div>
        </div>
      </b-modal>
    </section>
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
    props: {recalculateItems: {type: Boolean, required: false, default: true}},
    data: function() {
      return {
        addRemoteItems: false,
        remoteRepositoryName: "",
        availableEpisodes: [],
        expandedRepo: ""
      }
    },
    computed: {
      mainRepo() {return this.$store.getters['workshop/Repository']();},
      /**
       * Return all the episodes in a Repository which has a matching topic.
       */
      allItems() {
        const T = performance.now()
        if(!this.recalculateItems || !this.mainRepo.topics || !this.mainRepo.topics.length)
          return [];
        const episodes = [...this.mainRepo.episodes];
        const mainEpisodes = this.mainRepo.episodes.map(e => e.url);
        const topics = this.mainRepo.topics
                .filter(t => this.$store.state.topicList.includes(t));
        const topicRepos = this.$store.getters['workshop/RepositoriesByFilter'](r => {
          for(let t of topics)
            if(r.topics.includes(t))
              return true;
        });
        topicRepos.forEach(R => episodes.push(...R.episodes.filter(E => this.availableEpisodes.includes(E.url))));
        // Add remote flag
        console.log(`Found ${episodes.length} episodes in ${topicRepos.length} repositories in ${Math.round(performance.now() - T)}ms`)
        return episodes.map(e => {return {...e, remote: !mainEpisodes.includes(e.url)}});
      },
      // The schedule is a representation of the episodes in a workshop arranged by day and time
      schedule: function() {
        const T = performance.now()
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
        // Arrange days and items
        schedule.days.sort((a,b) => a.number < b.number? -1 : 1);
        schedule.days.forEach(d => d.items.sort((a, b) => a.yaml.order > b.yaml.order? 1 : -1));
        console.log(`Generated schedule in ${Math.round(performance.now() - T)}ms`)
        return schedule;
      },
      filteredTopicRepositories() {
        return this.$store.getters['workshop/RepositoriesByFilter'](
                r => !r.isMain &&
                        `${r.owner}|${r.name}|${r.topics.join('|')}`
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
      /**
       * Mark an episode as available for including in the current project
       */
      setEpisodeAvailable(E, available) {
        if(this.availableEpisodes.includes(E.url) === available)
          return;
        if(available)
          this.availableEpisodes.push(E.url);
        else
          this.availableEpisodes = this.availableEpisodes.filter(e => e!==E.url)
      },
      updateEpisode(episode) {
        this.$store.dispatch('workshop/setFileContentFromYAML', {
          url: episode.url, yaml: episode.yaml, body: episode.body
        })
      },
      /**
       * Update the scheduled day for an item
       * @param item {object} item to update
       * @param dayId {number|""} day to set
       */
      async updateItemDay({item, dayId, prevOrder, nextOrder}) {
        console.log(`${item.path} DAY => ${dayId} [${prevOrder}, ${nextOrder}]`)
        // Duplicate allow-multiple items
        if(item.yaml['ukrn_wb_rules']
                && item.yaml['ukrn_wb_rules'].includes('allow-multiple')
                && dayId !== ""
                && !item.yaml.day)
          item = await this.$store.dispatch('workshop/duplicateFile', {url: item.url});
        // TODO: Delete allow-multiple items when de-scheduled

        const newYAML = {...item.yaml};
        newYAML.day = dayId;
        // Place in the correct order
        if(prevOrder && nextOrder && prevOrder === nextOrder) {
          // TODO: implement recalculating item order values
        } else if(!prevOrder && nextOrder)
          newYAML.order = Math.round(nextOrder / 2);
        else if(prevOrder && !nextOrder)
          newYAML.order = Math.round(prevOrder + 100000);
        else if(prevOrder && nextOrder)
          newYAML.order = Math.round(prevOrder + (nextOrder - prevOrder) / 2);
        else
          newYAML.order = 100000;
        this.updateEpisode({...item, yaml: newYAML});
      },
      addRepositoryEpisodes(episodes) {
        // Close modal
        this.addRemoteItems = false;
        episodes.forEach(E => this.setEpisodeAvailable(E, true));
      }
    },
    mounted() {}
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .cards {
    width: 100%;
  }
  .fullscreen-modal > * {padding: 1em;}
  .unassigned-items {
  }
</style>
