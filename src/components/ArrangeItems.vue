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
                :key="item.metadata.url"
                :class="`episode card ${item.remote? 'remote' : ''}`"
                :title="item.metadata.description"
                animation="slide"
                :aria-id="`item-details-${item.metadata.url}`"
                :open="false"
    >
      <template #trigger="props">
        <div
                class="card-header"
                role="button"
                :aria-controls="`item-details-${item.metadata.url}`">
            <span class="card-header-title">
              {{ item.yaml.title }}
            </span>
          <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
          <div class="action-icons" @click="evt=>evt.stopPropagation()">
            <b-button icon-right="cog" size="is-medium" title="Edit episode settings" />
            <a :href="getPagesLink(item)" target="_blank" title="Open episode website in a new tab">
              <b-button icon-right="link" size="is-medium"/>
            </a>
            <b-button v-if="dayId"
                      icon-right="minus-circle"
                      size="is-medium"
                      title="Remove this episode"
                      class="del"
                      @click="$emit('assignItem', {itemURL: item.metadata.url, dayId: null})"
                      :type="!dayId? 'is-danger' : 'is-info'"
                      outlined
            />
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
</template>

<script>
import draggable from "vuedraggable"
export default {
  name: 'ArrangeItems',
  components: {draggable},
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
      if(!evt.added)
        return;
      this.$emit('assignItem', {itemURL: evt.added.element.metadata.url, dayId: this.dayId})
    },
    getPagesLink(item) {
      const match = /github\.com\/([^/]+)\/([^/]+)/.exec(item.metadata.html_url);
      const name = item.metadata.name.replace(/\.[a-zA-Z]+$/, "");
      return `https://${match[1]}.github.io/${match[2]}/${name}`;
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