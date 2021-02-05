<template>
  <draggable
          :list="items"
          @start="drag=true"
          @end="drag=false"
          @change="(evt)=>$emit('change', evt)"
          group="items"
          class="episodeList"
  >
    <b-collapse v-for="item in items"
                :key="item.metadata.name"
                class="episode card"
                :title="item.metadata.description"
                animation="slide"
                :aria-id="`item-details-${item.metadata.name}`"
                :open="false"
    >
      <template #trigger="props">
        <div
                class="card-header"
                role="button"
                :aria-controls="`item-details-${item.metadata.name}`">
            <span class="card-header-title">
              <span class="owner">{{ item.metadata.owner.login }}: </span>
              {{ item.metadata.name }}
            </span>
          <b-icon :icon="props.open ? 'menu-up' : 'menu-down'" class="card-content caret" size="is-medium"/>
          <div class="action-icons">
            <b-button icon-right="cog" size="is-medium" title="Edit episode settings" />
            <a :href="item.metadata.html_url" target="_blank" title="Open episode website in a new tab">
              <b-button icon-right="link" size="is-medium"/>
            </a>
            <b-button icon-right="minus-circle"
                      size="is-medium"
                      title="Remove this episode"
                      class="del"
                      @click="$emit('drop', item.metadata.name)"
                      :type="isUnscheduled? 'is-danger' : 'is-info'"
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
  name: 'ChooseEpisodes',
  components: {draggable},
  props: {
    items: {type: Array, required: true}, // list of episodes selected
    isUnscheduled: {type: Boolean, required: false, default: false}
  },
  data: function() {
    return {}
  },
  computed: {},
  methods: {},
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