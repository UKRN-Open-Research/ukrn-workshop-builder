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
    <section v-else>
      <section class="card" v-if="mainRepo.extraFiles && (mainRepo.extraFiles.intro || mainRepo.extraFiles.optional_intro_sections.length || mainRepo.extraFiles.setup_files.length)">
        <header class="card-header">
          <b-tooltip position="is-right" label="Special files are non-lesson files which you can edit. These include things like instructor notes and introductory information.">
            <h1 class="card-header-title">Special files</h1>
          </b-tooltip>
        </header>
        <div class="special-files content">
          <CustomiseItem v-if="mainRepo.extraFiles.intro"
                         :item="mainRepo.extraFiles.intro"
                         override-name="Workshop Intro"
                         override-link="/"
                         :no-y-a-m-l="true"
                         :add-buttons="['save']"
                         :remove-buttons="['drop', 'properties']"
          />
          <CustomiseItem v-for="s in mainRepo.extraFiles.optional_intro_sections"
                         :key="s.url"
                         :item="s"
                         :override-name="`Intro: ${/\/([^/.]+)\.md$/.exec(s.path)[1]}`"
                         override-link="/"
                         :no-y-a-m-l="true"
                         :add-buttons="['save']"
                         :remove-buttons="['drop', 'properties']"
          />
          <CustomiseItem v-for="s in mainRepo.extraFiles.setup_files"
                         :key="s.url"
                         :item="s"
                         :override-name="`Setup: ${/\/([^/.]+)\.html$/.exec(s.path)[1]}`"
                         override-link="/"
                         :no-y-a-m-l="true"
                         :add-buttons="['save']"
                         :remove-buttons="['drop', 'properties']"
          />
          <CustomiseItem v-if="mainRepo.extraFiles.notes"
                         :item="mainRepo.extraFiles.notes"
                         override-name="Instructor Notes"
                         override-link="/notes"
                         :add-buttons="['save', 'edit']"
                         :remove-buttons="['drop', 'properties']"
          />
        </div>
      </section>
      <div class="content"
           v-if="schedule.days.length === 1 && schedule.days[0].items.length === 0"
      >
        <p>There are currently no lessons in the workshop. To add lessons, drag them from the stash into a day. You can search for episodes that have already been created and add them to your stash.</p>
      </div>
      <div class="columns">
        <div class="column">
          <div class="card"
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
          <div class="card">
            <header class="card-header" v-if="!mainRepo.busyFlag()">
              <h1 class="card-header-title">Stash</h1>
            </header>
            <b-skeleton size="is-large" animated :active="mainRepo.busyFlag()"/>
            <div class="card-content" v-if="!mainRepo.busyFlag()">
              <ArrangeItems :items="schedule.unassignedItems"
                            @assignItem="updateItemDay"
                            class="unassigned-items"
              />
            </div>
            <b-skeleton size="is-medium" animated :active="mainRepo.busyFlag()"/>
            <div class="stash-buttons card-footer-item">
              <b-button class="card-footer-item"
                        icon-left="plus"
                        :type="`is-primary ${allItems.length > 1? 'is-light' : ''}`"
                        @click="addRemoteItems = true"
              >
                Add Items to Stash
              </b-button>
              <b-button v-if="availableEpisodes.filter(f => !f.yaml.day).length"
                        class="card-footer-item"
                        icon-left="delete"
                        type="is-warning"
                        @click="clearStash"
              >
                Clear stash
              </b-button>
            </div>
          </div>
        </div>
      </div>

      <b-modal v-model="addRemoteItems" full-screen>
        <div class="content fullscreen-modal">
          <header class="title">
            <h1 class="">Add items from a different workshop</h1>
          </header>
          <div class="content">
            <p>Type the URL, owner, or title of a workshop below, or type a topic name. We will scan workshops that match for lessons and you can then include them in your
              stash. You can then drag them into your schedule and install them (and any files they depend on)
              in your own workshop.</p>
          </div>
          <b-autocomplete
                  v-model="remoteRepositoryName"
                  :data="autoCompleteOptions"
                  placeholder="Start typing an owner, workshop URL or title, or tag to filter"
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
  import CustomiseItem
    from "./CustomiseItem";

  /**
   * @typedef Schedule
   * A schedule contains a number of days, each of which contains episodes in a particular order. There are also episodes that are not assigned to days in the stash.
   * @property days {Array<ScheduleDay>} The days in the schedule.
   * @property unassignedItems {Array<File>} The episodes not assigned to any day.
   */

  /**
   * @typedef ScheduleDay
   * A schedule day represents a single day in the schedule. It has a number of episodes in a given order and an identifier for which day it is.
   * @property number {Number} The number of the day in the schedule.
   * @property items {Array<File>} The episodes occurring on the day.
   */

  /**
   * @description The MakeSchedule component separates a repository's files into three groups: extra files, which are displayed at the top of the page for customisation; scheduled episodes, which are displayed in the day to which they have been assigned and which show their start time; and unscheduled episodes, which are displayed in a stash for allocation to the schedule by the user. The stash offers a button to add additional episodes by conducting a GitHub search.
   *
   * @vue-prop [recalculateItems=true] {Boolean} Whether the time-consuming operation of detecting the files available should be conducted.
   *
   * @vue-data addRemoteItems=false {Boolean} Whether the modal for adding remote items to the stash is open.
   * @vue-data remoteRepositoryName="" {String} Search string used for filtering repositories when adding items to the stash.
   * @vue-data availableEpisodes=[] {Array<File>|Array} Episodes available scheduling.
   * @vue-data expandedRepo="" {String} Name of the repository currently expanded in the add-items-to-stash modal.
   *
   * @vue-computed mainRepo {Repository} Repository currently being created by the Workshop Builder Tool.
   * @vue-computed allItems {Array<File>} Items available for scheduling, including both local and remote episodes.
   * @vue-computed schedule {Schedule} The schedule for the workshop.
   * @vue-computed filteredTopicRepositories {Array<Repository>} A list of repositories matching the current text filter in the add-items-to-stash search box.
   * @vue-computed autoCompleteOptions {Array<String>} Autocomplete prompts for entering remoteRepositoryName filter string.
   * @vue-computed remoteRepositoryEpisodes {Array<File>} Currently unused.
   */
  export default {
    name: 'MakeSchedule',
    components: {
      CustomiseItem,
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
      mainRepo() {
        let repo;
        try {
          repo = this.$store.getters['workshop/Repository']();
        }
        catch(e) {throw new Error(`Error retrieving Repository from store: ${e}`)}
        return repo;
      },
      /**
       * Return all the episodes in a Repository which has a matching topic.
       */
      allItems() {
        const T = performance.now()
        if(!this.recalculateItems || !this.mainRepo.topics || !this.mainRepo.topics.length)
          return [];
        // Always include main repository episodes
        const episodes = [...this.mainRepo.episodes];
        const mainEpisodes = this.mainRepo.episodes.map(e => e.url);
        // Find repositories that overlap topics with mainRepo
        const topics = this.mainRepo.topics
                .filter(t => this.$store.state.topicList.includes(t));
        const topicRepos = this.$store.getters['workshop/RepositoriesByFilter'](r => {
          for(let t of topics)
            if(r.topics.includes(t))
              return true;
        });
        // Find available, non-duplicate episodes for inclusion
        topicRepos.forEach(R => episodes.push(...R.episodes.filter(
          E => {
            return this.availableEpisodes.filter(e => e.url === E.url).length &&
                    ((E.yaml.ukrn_wb_rules &&
                            E.yaml.ukrn_wb_rules.includes('allow-multiple')) ||
                    episodes.filter(x => E.body === x.body).length === 0)
        })));
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
                // exclude main repo
                r => !r.isMain &&
                        // match filter
                        `${r.ownerLogin}|${r.name}|${r.topics.join('|')}`
                        .toLowerCase()
                        .indexOf(this.remoteRepositoryName.toLowerCase()) >= 0 &&
                        // match topics
                        r.topics.filter(
                                t => this.mainRepo.topics.includes(t) &&
                                        this.$store.state.topicList.includes(t)
                        ).length
        )
      },
      autoCompleteOptions() {
        const options = [];
        this.filteredTopicRepositories.forEach(r => {
          const entries = [r.name, r.ownerLogin, ...r.topics];
          entries.forEach(e => {
            if(!options.includes(e))
              options.push(e);
          })
        });
        return options;
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
       * Clear stash episodes.
       */
      clearStash() {
        this.availableEpisodes = this.availableEpisodes.filter(f => f.yaml.day);
      },
      /**
       * Mark an episode as available for including in the current project.
       * @param E {File} Episode to mark.
       * @param available {boolean} Whether the episode should be available.
       */
      setEpisodeAvailable(E, available) {
        if(this.availableEpisodes.filter(e => e.url === E.url).length > 0 === available)
          return;
        if(available)
          this.availableEpisodes.push(E);
        else
          this.availableEpisodes = this.availableEpisodes.filter(e => e.url !== E.url)
      },
      /**
       * Update an episode to mark its new place in the schedule.
       * @param episode {File} Episode to update.
       */
      updateEpisode(episode) {
        this.$store.dispatch('workshop/setFileContentFromYAML', {
          url: episode.url, yaml: episode.yaml, body: episode.body
        })
      },
      /**
       * Update the scheduled day for an item. If attempting to update a duplicatable item, the item will be duplicated. If stashing an item that deletes when stashed, that item will be deleted.
       * @param item {File} Episode to update.
       * @param dayId {Number|""} Day to which the episode belongs.
       * @param [prevOrder] {Number} The order number of the episode before this one.
       * @param [nextOrder] {Number} The order number of the episode after this one.
       */
      async updateItemDay({item, dayId, prevOrder, nextOrder}) {
        console.log(`${item.path} DAY => ${dayId} [${prevOrder}, ${nextOrder}]`)
        // Duplicate allow-multiple items
        if(item.yaml['ukrn_wb_rules']
                && item.yaml['ukrn_wb_rules'].includes('allow-multiple')
                && dayId !== ""
                && !item.yaml.day) {
          const remote = item.remote;
          item = await this.$store.dispatch('workshop/duplicateFile', {url: item.url});
          if(remote && !this.availableEpisodes.filter(e => e.url === item.url).length)
            this.availableEpisodes.push(item);
        } else if(item.yaml['ukrn_wb_rules']
                && item.yaml['ukrn_wb_rules'].includes('remove-on-stash')
                && !dayId) {
          this.$store.commit('workshop/removeItem', {array: 'files', item});
          return;
        }

        const newYAML = {...item.yaml};
        newYAML.day = dayId;
        // Place in the correct order
        if(prevOrder && nextOrder && prevOrder === nextOrder) {
          // Recalculate item order values if there is no gap.
          // Item will place itself out of order, but since this really rarely happens
          // we're not going to fix it now.
          await this.$store.dispatch('workshop/rewriteEpisodeOrders', {
            dayId, ignore_episodes: [item.url]
          });
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
      /**
       * Add episodes into the stash from a remote repository by marking them as available.
       * @param episodes {Array<File>} Episodes to add.
       */
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
  .card {margin-bottom: 1em;}
  .cards {
    width: 100%;
  }
  .fullscreen-modal > * {padding: 1em;}
  .unassigned-items {
  }
  .special-files.special-files {
    display: flex;
    flex-wrap: wrap;
    padding: 1em;
    margin-bottom: 0;
    user-select: none;
    .item-wrapper {padding: .5em;}
  }
  .stash-buttons {
    button {
      margin: .5em;
    }
  }
</style>
