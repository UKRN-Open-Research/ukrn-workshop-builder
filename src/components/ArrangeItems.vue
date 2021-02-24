<template>
  <draggable
          :list="items"
          @start="drag=true"
          @end="drag=false"
          @change="change"
          group="items"
          class="episodeList"
  >
    <b-collapse v-for="item in items"
                :key="item.url"
                :class="`episode card ${item.remote? 'remote' : ''} ${item.yaml['ukrn_wb_rules'] && item.yaml['ukrn_wb_rules'].includes('allow-multiple')? 'is-break' : ''}`"
                :title="item.description"
                animation="slide"
                :aria-id="`item-details-${item.url}`"
                :open="false"
    >
      <template #trigger="props">
        <div
                class="card-header"
                role="button"
                :aria-controls="`item-details-${item.url}`">
            <span class="card-header-title">
              <EpisodeName :episode="item"/>
            </span>
          <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
          <div class="action-icons" @click="evt=>evt.stopPropagation()">
            <b-button v-if="item.remote && dayId"
                      icon-right="plus-circle"
                      size="is-medium"
                      title="Install remote episode"
                      @click="install(item)"
            />
            <b-button v-else-if="!item.remote"
                      icon-right="cog"
                      size="is-medium"
                      title="Edit episode"
            />
            <a :href="getPagesLink(item)" target="_blank" title="Open episode website in a new tab">
              <b-button icon-right="link" size="is-medium"/>
            </a>
            <b-button v-if="dayId"
                      icon-right="minus-circle"
                      size="is-medium"
                      title="Remove this episode"
                      class="del"
                      @click="$emit('assignItem', {item: item, dayId: ''})"
                      :type="!dayId? 'is-danger' : 'is-info'"
                      outlined
            />
          </div>
          <b-loading :active="item.busyFlag()" :is-full-page="false"/>
        </div>
      </template>

      <div class="card-content item-body">
        <CustomiseItem :item="item"/>
      </div>
    </b-collapse>
  </draggable>
</template>

<script>
import draggable from "vuedraggable"
import EpisodeName from "./EpisodeName";
import CustomiseItem from "./CustomiseItem";
export default {
  name: 'ArrangeItems',
  components: {
    CustomiseItem,
    EpisodeName,
    draggable},
  props: {
    items: {type: Array, required: true}, // list of episodes selected
    dayId: {type: Number, required: false, default: null}
  },
  data: function() {
    return {}
  },
  computed: {},
  methods: {
    change(evt) {
      // Only monitor add events because the store will handle removals
      if(!evt.added && !evt.moved)
        return;
      const E = evt.added || evt.moved;
      const prevOrder = E.newIndex !== 0?
              this.items[E.newIndex - 1].yaml.order : null;
      const nextOrder = E.newIndex !== this.items.length - 1?
              this.items[E.newIndex + 1].yaml.order : null;
      const safeOrder = o => typeof o !== 'number' || isNaN(o)? null : o;
      this.$emit('assignItem', {
        item: E.element,
        dayId: this.dayId,
        prevOrder: safeOrder(prevOrder),
        nextOrder: safeOrder(nextOrder)
      });
    },
    install(episode) {
      console.log(`Install ${episode.path}`)
      const self = this;
      this.$store.dispatch('workshop/installFile', {url: episode.url})
        .then(F => self.$buefy.toast.open({
          message: F? `Episode installed to ${episode.path}.` : `Error installing ${episode.path}`,
          type: F? `is-success` : `is-danger`
        }))
    },
    getPagesLink(item) {
      const match = /github\.com\/repos\/([^/]+)\/([^/]+)/.exec(item.url);
      const name = /\/([^/]+)$/.exec(item.path);
      const webDir = name[1].replace(/\.[^.]*$/, "");
      return `https://${match[1]}.github.io/${match[2]}/${webDir}/`;
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
    &.remote {background-color: orange;}
    &.is-break.is-break {background-color: lightgrey;}
    .item-body {background-color: white;}
  }
  .action-icons {
    display: flex;
    margin-right: 0;
    padding: .25em 0;
    button {
      margin: auto .25em;
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
  .card-header-title {text-align: left;}
</style>